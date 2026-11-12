/*
 * Checks the free-slot finder against the ten worked examples of
 * content/docs/ky-thuat/thuat-toan-gio-trong.md (section 4), against a minute-by-minute brute
 * force (section 5), and the sample appointments against double booking (BR-01).
 * Run: pnpm check:availability   (Node 24 runs TypeScript directly)
 */
import {
  findChainSlots,
  findGroupSlots,
  findSlots,
  freeChainSlots,
  freeGroupSlots,
  freeSlots,
  type CoreResource,
  type FindChainInput,
  type FindGroupInput,
  type FindSlotsInput,
} from '../mock/availability.ts';
import { tenantFixtures } from '../mock/fixtures/index.ts';
import { petServices } from '../mock/fixtures/pawpaw-services.ts';
import { salonServices } from '../mock/fixtures/salon-services.ts';
import type { Appointment, ServiceVariant, TenantFixture } from '../mock/fixtures/types.ts';
import { contains, length, normalize, subtract, type Interval } from '../mock/intervals.ts';
import {
  ANY_STAFF,
  occupation,
  prepMinutes,
  priceFor,
  resourceTypesOf,
  visibleRange,
} from '../mock/occupation.ts';
import { openingHours } from '../mock/hours.ts';
import {
  bookingSlots,
  buildAppointment,
  nearestSlots,
  stillFree,
  type BookingItemRef,
} from '../mock/booking.ts';
import { buildEmails } from '../mock/emails.ts';
import {
  canSelfService,
  refundPercent,
  refundVnd,
  replyDeadline,
  timeLeftText,
} from '../mock/policy.ts';
import {
  bookingCode,
  heldItems,
  modeOf,
  movedAppointment,
  openQuestion,
  refsOfItems,
} from '../mock/reschedule.ts';
import { moveAppointment, validStarts } from '../mock/move.ts';
import { applyHandling, isSettled } from '../mock/leave.ts';
import { localMinutes, staffWindows } from '../mock/shifts.ts';

let failures = 0;
const report = (ok: boolean, name: string, detail = '') => {
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` :: ${detail}` : ''}`);
};

// ---- Time: whole minutes since the Unix epoch, Vietnam time written as HH:MM ----

const DAY = '2026-11-07';
const dayStart = Date.parse(`${DAY}T00:00:00+07:00`) / 60_000;
const min = (hhmm: string) => {
  const [h = 0, m = 0] = hhmm.split(':').map(Number);
  return dayStart + h * 60 + m;
};
const hhmm = (minutes: number) => {
  const m = minutes - dayStart;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};
const span = (from: string, to: string): Interval => [min(from), min(to)];
const grid = (from: string, to: string) => {
  const out: string[] = [];
  for (let t = min(from); t <= min(to); t += 15) out.push(hhmm(t));
  return out;
};

// ---- Contexts A (Tóc Mây) and B (Pawpaw) ----

const variantOf = (services: typeof salonServices, id: string): ServiceVariant => {
  for (const service of services) {
    const found = service.variants.find((v) => v.id === id);
    if (found) return found;
  }
  throw new Error(id);
};
const cutShort = variantOf(salonServices, 'may-cut-short');
const dyeShort = variantOf(salonServices, 'may-dye-short');
const bathLarge = variantOf(petServices, 'paw-bath-large');

const STYLIST = 'may-rt-stylist';
const CHAIR = 'may-rt-chair';
const WASH = 'may-rt-wash';
const OPEN_A: Interval[] = [span('08:00', '12:00'), span('13:30', '20:00')];

interface Spec {
  id: string;
  typeId: string;
  level?: number;
  /** Shift for staff; opening hours for the rest. */
  avail: Interval[];
  busy?: Interval[];
}
const resource = (spec: Spec): CoreResource => {
  const busy = normalize(spec.busy ?? []);
  return {
    id: spec.id,
    typeId: spec.typeId,
    isStaff: spec.typeId === STYLIST || spec.typeId === 'paw-rt-groomer',
    level: spec.level ?? 1,
    free: subtract(normalize(spec.avail), busy),
    busyToday: length(busy),
  };
};

const mai = (busy: Interval[] = [], shift = span('08:00', '17:00')) =>
  resource({ id: 'Mai', typeId: STYLIST, level: 2, avail: [shift], busy });
const lan = (busy: Interval[] = []) =>
  resource({ id: 'Lan', typeId: STYLIST, level: 1, avail: [span('12:00', '20:00')], busy });
const hung = (busy: Interval[] = []) =>
  resource({ id: 'Hùng', typeId: STYLIST, level: 2, avail: [span('08:00', '20:00')], busy });
const chair = (n: number, busy: Interval[] = []) =>
  resource({ id: `Ghế ${n}`, typeId: CHAIR, avail: OPEN_A, busy });
const wash = (busy: Interval[] = []) =>
  resource({ id: 'Giường gội 1', typeId: WASH, avail: OPEN_A, busy });

const NOW_A = min('20:00') - 1440; // 20:00 on 06/11
const policy = (now: number) => ({ notBefore: now + 2 * 60, notAfter: now + 30 * 1440 });

const input = (
  variant: FindSlotsInput['variant'],
  resources: CoreResource[],
  open: Interval[],
  now = NOW_A,
): FindSlotsInput => ({
  variant,
  open,
  resources,
  dayStart,
  dayEnd: dayStart + 1440,
  step: 15,
  ...policy(now),
});

// ---- Brute force: minute by minute, no fit operation (section 5) ----

function brute(i: FindSlotsInput): string[] {
  const prep = prepMinutes(i.variant);
  const [visFrom, visTo] = visibleRange(i.variant);
  const out: string[] = [];
  for (let t = i.dayStart; t < i.dayEnd; t += i.step) {
    if (t < i.notBefore || t > i.notAfter) continue;
    const origin = t - prep;
    let ok = true;
    for (let m = origin + visFrom; m < origin + visTo && ok; m++) ok = contains(i.open, m);
    for (const typeId of resourceTypesOf(i.variant)) {
      if (!ok) break;
      const held = occupation(i.variant, typeId);
      ok = i.resources
        .filter((r) => r.typeId === typeId)
        .some((r) =>
          held.every(([from, to]) => {
            for (let m = origin + from; m < origin + to; m++)
              if (!contains(r.free, m)) return false;
            return true;
          }),
        );
    }
    if (ok) out.push(hhmm(t));
  }
  return out;
}

function example(name: string, i: FindSlotsInput, expected: string[]) {
  const slots = findSlots(i);
  const got = slots.map((s) => hhmm(s.start));
  const same = got.join() === expected.join();
  report(
    same,
    name,
    same ? `${got.length} giờ` : `got ${got.join(' ')} | want ${expected.join(' ')}`,
  );
  const bruteGot = brute(i);
  report(bruteGot.join() === got.join(), `${name}: vét cạn khớp`);
  return slots;
}

const earliest = (i: FindSlotsInput) => hhmm(findSlots(i)[0]?.start ?? 0);

// VD1
example(
  'VD1 Cắt ngắn, Bất kỳ ai, ngày trống',
  input(cutShort, [mai(), lan(), hung(), chair(1), chair(2)], OPEN_A),
  [...grid('08:00', '11:15'), ...grid('13:30', '19:15')],
);

// VD2
example(
  'VD2 Cắt ngắn, chọn Mai, Mai có lịch 09:00–09:45',
  input(
    cutShort,
    [mai([span('09:00', '09:45')]), chair(1, [span('09:00', '09:45')]), chair(2)],
    OPEN_A,
  ),
  [...grid('08:00', '08:15'), ...grid('09:45', '11:15'), ...grid('13:30', '16:15')],
);

// VD3
const vd3 = example(
  'VD3 Nhuộm ngắn, chọn Mai, Mai nhận khách cắt lúc chờ',
  input(
    dyeShort,
    [mai([span('09:30', '10:15')]), chair(1), chair(2, [span('09:30', '10:15')]), wash()],
    OPEN_A,
  ),
  ['09:00', ...grid('13:30', '15:15')],
);
report(
  vd3.find((s) => hhmm(s.start) === '09:00')?.assignment[CHAIR] === 'Ghế 1',
  'VD3: nhuộm 09:00 ngồi Ghế 1, Ghế 2 dành cho lịch cắt',
);

// VD4
const vd4 = input(dyeShort, [mai(), chair(1), wash()], OPEN_A);
example('VD4 Nhuộm ngắn, chọn Mai, ngày trống', vd4, [
  ...grid('08:15', '10:00'),
  ...grid('13:30', '15:15'),
]);
report(
  earliest(input(dyeShort, [mai([], span('07:45', '17:00')), chair(1), wash()], OPEN_A)) ===
    '08:00',
  'VD4: ca Mai từ 07:45 thì 08:00 hợp lệ (chuẩn bị trước giờ mở cửa)',
);

// VD5: cleanup must end before closing; without it 10:15 is valid.
report(!findSlots(vd4).some((s) => hhmm(s.start) === '10:15'), 'VD5: 10:15 bị loại vì dọn ghế');
const noCleanup = { ...dyeShort, cleanupMinutes: {} };
report(
  findSlots(input(noCleanup, [mai(), chair(1), wash()], OPEN_A)).some(
    (s) => hhmm(s.start) === '10:15',
  ),
  'VD5: không có dọn dẹp thì 10:15 hợp lệ',
);

// VD6
example(
  'VD6 Nhuộm ngắn, chọn Mai, giường gội bận 10:00–10:30',
  input(dyeShort, [mai(), chair(1), wash([span('10:00', '10:30')])], OPEN_A),
  ['08:15', '08:30', '09:15', '09:30', '09:45', '10:00', ...grid('13:30', '15:15')],
);

// VD7 and VD8: Pawpaw, open 08:00–18:00.
const OPEN_B: Interval[] = [span('08:00', '18:00')];
const groomer = (id: string, busy: Interval[] = []) =>
  resource({ id, typeId: 'paw-rt-groomer', avail: OPEN_B, busy });
const bathtub = (n: number, busy: Interval[] = []) =>
  resource({ id: `Bồn ${n}`, typeId: 'paw-rt-bath', avail: OPEN_B, busy });
const cage = (n: number, busy: Interval[] = []) =>
  resource({ id: `Lồng ${n}`, typeId: 'paw-rt-dryer', avail: OPEN_B, busy });

example(
  'VD7 Tắm sấy chó từ 10 kg, lồng sấy là nút thắt',
  input(
    bathLarge,
    [
      groomer('Khoa'),
      groomer('Vy'),
      bathtub(1),
      bathtub(2),
      cage(1, [span('09:30', '10:30')]),
      cage(2, [span('10:00', '11:00')]),
    ],
    OPEN_B,
  ),
  [...grid('08:00', '08:30'), ...grid('10:00', '16:30')],
);

example(
  'VD8 Rửa bồn song song với lúc sấy',
  input(
    bathLarge,
    [
      groomer('Khoa', [span('09:00', '09:30'), span('10:15', '10:30')]),
      groomer('Vy'),
      bathtub(1, [span('09:00', '09:40')]),
      cage(1, [span('09:30', '10:20')]),
      cage(2),
    ],
    OPEN_B,
  ),
  [...grid('08:00', '08:15'), ...grid('09:45', '16:30')],
);

// VD9: now = 10:20 on 07/11; H1 still holds, H2 ran out and is not passed in (BR-07).
const NOW_9 = min('10:20');
const vd9 = example(
  'VD9 Đặt trước tối thiểu và giữ chỗ',
  input(
    cutShort,
    [
      mai([span('13:30', '14:15')]),
      lan([span('13:30', '14:15')]),
      hung(),
      chair(1, [span('13:30', '14:15')]),
      chair(2, [span('13:30', '14:15')]),
    ],
    OPEN_A,
    NOW_9,
  ),
  grid('14:15', '19:15'),
);
const first9 = vd9[0];
report(
  first9?.assignment[CHAIR] === 'Ghế 1' && first9.assignment[STYLIST] === 'Lan',
  'VD9: 14:15 gán Ghế 1 và thợ cấp thấp nhất (Lan)',
);

// VD10: Hùng cannot dye, so he is not passed in; Mai is booked from 13:30.
const vd10 = example(
  'VD10 Nhuộm ngắn, Bất kỳ ai, Mai kín từ 13:30',
  input(dyeShort, [mai([span('13:30', '17:00')]), lan(), chair(1), chair(2), wash()], OPEN_A),
  (() => {
    const morning = grid('08:15', '10:00'); // Mai only: Lan starts at 12:00
    const afternoon = grid('13:30', '18:00'); // Lan only
    return [...morning, ...afternoon];
  })(),
);
const who = (time: string) => vd10.find((s) => hhmm(s.start) === time)?.assignment[STYLIST];
report(who('09:00') === 'Mai' && who('14:00') === 'Lan', 'VD10: 09:00 gán Mai, 14:00 gán Lan');
const staff = [
  { resourceId: 'Mai', level: 2 },
  { resourceId: 'Lan', level: 1 },
];
report(
  priceFor(dyeShort, ANY_STAFF, staff) === 500_000n &&
    priceFor(dyeShort, 'Mai', staff) === 550_000n,
  'VD10: Bất kỳ ai 500.000 ₫, chọn Mai 550.000 ₫ (BR-56)',
);

// ---- BR-07 through the fixture adapter: a hold that ran out does not block ----

const mini = (holdExpiresAt: string): TenantFixture => {
  const hold: Appointment = {
    id: 'h1',
    tenantId: 't',
    branchId: 'b',
    customerId: null,
    startAt: `${DAY}T06:30:00Z`,
    status: 'held',
    channel: 'online',
    items: [],
    bookings: [
      {
        resourceId: 's1',
        startAt: `${DAY}T06:30:00Z`,
        endAt: `${DAY}T07:15:00Z`,
        kind: 'work',
        itemIndex: 0,
      },
      {
        resourceId: 'c1',
        startAt: `${DAY}T06:30:00Z`,
        endAt: `${DAY}T07:15:00Z`,
        kind: 'work',
        itemIndex: 0,
      },
    ],
    holdExpiresAt,
  };
  return {
    branches: [
      {
        id: 'b',
        tenantId: 't',
        name: '',
        address: '',
        timeZone: 'Asia/Ho_Chi_Minh',
        businessHours: [{ weekday: 6, open: '09:00', close: '18:00' }],
        specialDays: [],
      },
    ],
    resourceTypes: [
      { id: STYLIST, tenantId: 't', name: 'Thợ', isStaff: true },
      { id: CHAIR, tenantId: 't', name: 'Ghế', isStaff: false },
    ],
    resources: [
      { id: 's1', tenantId: 't', branchId: 'b', resourceTypeId: STYLIST, name: 'S' },
      { id: 'c1', tenantId: 't', branchId: 'b', resourceTypeId: CHAIR, name: 'C' },
    ],
    staff: [
      {
        resourceId: 's1',
        level: 1,
        role: 'technician',
        skillServiceIds: ['cut'],
        profile: { bookableOnline: true },
      },
    ],
    shifts: [],
    staffTimeOff: [],
    appointments: [hold],
  } as unknown as TenantFixture;
};
const at1330 = (fixture: TenantFixture, now: string) =>
  freeSlots({
    fixture,
    variant: cutShort,
    serviceId: 'cut',
    date: DAY,
    staffResourceId: ANY_STAFF,
    notBefore: now,
  }).some((s) => s.startAt === `${DAY}T06:30:00.000Z`);
report(!at1330(mini(`${DAY}T03:25:00Z`), `${DAY}T03:20:00Z`), 'BR-07: giữ chỗ còn hạn chặn 13:30');
report(
  at1330(mini(`${DAY}T03:25:00Z`), `${DAY}T03:26:00Z`),
  'BR-07: giữ chỗ hết hạn thì 13:30 hiện lại',
);

// ---- The sample day the create screen is checked against (MH-26) ----

const sample = (slug: string) => tenantFixtures.find((f) => f.tenant.slug === slug)!;
const sampleVariant = (fixture: TenantFixture, id: string) => {
  for (const service of fixture.services) {
    const variant = service.variants.find((v) => v.id === id);
    if (variant) return { variant, serviceId: service.id };
  }
  throw new Error(id);
};
const startsOf = (fixture: TenantFixture, variantId: string, who: string, time?: string) => {
  const { variant, serviceId } = sampleVariant(fixture, variantId);
  const at = time ? `${DAY}T${time}:00+07:00` : undefined;
  return freeSlots({
    fixture,
    variant,
    serviceId,
    date: DAY,
    staffResourceId: who,
    channel: 'staff',
    ...(at
      ? { step: 1, notBefore: new Date(at).toISOString(), notAfter: new Date(at).toISOString() }
      : {}),
  });
};
const local = (iso: string) => new Date(Date.parse(iso) + 7 * 3600_000).toISOString().slice(11, 16);

const may = sample('toc-may');
const lan14 = startsOf(may, 'may-cut-short', 'may-lan', '14:00');
report(
  lan14[0]?.assignment['may-rt-chair'] === 'may-chair-2',
  'Tóc Mây 07/11: Lan 14:00 cắt ngắn trống, ngồi Ghế 2',
  JSON.stringify(lan14[0]?.assignment),
);
report(
  startsOf(may, 'may-cut-short', 'may-lan', '14:05').length === 1,
  'Tóc Mây 07/11: giờ lệch lưới 14:05 vẫn đặt được (BR-58)',
);
const paw = sample('pawpaw');
report(
  startsOf(paw, 'paw-bath-large', 'paw-vy', '11:00').length === 0,
  'Pawpaw 07/11: Tắm sấy chó từ 10 kg lúc 11:00 với Vy không đặt được',
);
const lucky = startsOf(paw, 'paw-bath-large', ANY_STAFF)
  .slice(0, 3)
  .map((x) => `${local(x.startAt)} ${x.staffResourceId.replace('paw-', '')}`)
  .join(', ');
report(
  lucky === '10:00 vy, 12:00 khoa, 12:30 vy',
  'Pawpaw 07/11: ba giờ đầu còn trống là 10:00 Vy, 12:00 Khoa, 12:30 Vy',
  lucky,
);

// ---- Chain of services (BR-18) ----

const chainInput = (
  items: FindChainInput['items'],
  open: Interval[],
  now = NOW_A,
): FindChainInput => ({
  items,
  open,
  dayStart,
  dayEnd: dayStart + 1440,
  step: 15,
  ...policy(now),
});

/** Minute by minute, over every assignment of every item: no fit operation, no pick order. */
function bruteChain(i: FindChainInput): string[] {
  const free = (r: CoreResource, m: number) => contains(r.free, m);
  const placeItem = (
    k: number,
    arrival: number,
    prevStaff: Set<string>,
    used: Map<string, Set<number>>,
  ): boolean => {
    const item = i.items[k]!;
    const prep = prepMinutes(item.variant);
    const [visFrom, visTo] = visibleRange(item.variant);
    const types = resourceTypesOf(item.variant);
    const combos = types.reduce<CoreResource[][]>(
      (acc, typeId) => {
        const ofType = item.resources.filter((r) => r.typeId === typeId);
        return acc.flatMap((combo) => ofType.map((r) => [...combo, r]));
      },
      [[]],
    );
    return combos.some((combo) => {
      const staff = new Set(combo.filter((r) => r.isStaff).map((r) => r.id));
      const same = [...staff].some((id) => prevStaff.has(id));
      const at = k === 0 ? arrival : arrival + (same ? prep : 0);
      const origin = at - prep;
      for (let m = origin + visFrom; m < origin + visTo; m++)
        if (!contains(i.open, m)) return false;
      const next = new Map(used);
      for (const r of combo) {
        const mine = new Set(next.get(r.id) ?? []);
        for (const [from, to] of occupation(item.variant, r.typeId)) {
          for (let m = origin + from; m < origin + to; m++) {
            if (!free(r, m) || mine.has(m)) return false;
            mine.add(m);
          }
        }
        next.set(r.id, mine);
      }
      return k === i.items.length - 1 || placeItem(k + 1, origin + visTo, staff, next);
    });
  };
  const out: string[] = [];
  for (let t = i.dayStart; t < i.dayEnd; t += i.step) {
    if (t < i.notBefore || t > i.notAfter) continue;
    if (placeItem(0, t, new Set(), new Map())) out.push(hhmm(t));
  }
  return out;
}

const dyeThenCut = (
  dyers: CoreResource[],
  cutters: CoreResource[],
  shared: CoreResource[],
  order: 'dye-cut' | 'cut-dye' = 'dye-cut',
) => {
  const dye = { variant: dyeShort, resources: [...dyers, ...shared, wash()] };
  const cut = { variant: cutShort, resources: [...cutters, ...shared, wash()] };
  return order === 'dye-cut' ? [dye, cut] : [cut, dye];
};
const lanOnly = () => [lan()];
const chairs = () => [chair(1), chair(2)];

const startsOfChain = (i: FindChainInput) => findChainSlots(i).map((s) => hhmm(s.start));
const chainExample = (name: string, i: FindChainInput) => {
  const got = startsOfChain(i);
  report(got.length > 0, `${name}: có giờ trống`, `${got.length} giờ`);
  report(got.join() === bruteChain(i).join(), `${name}: vét cạn khớp`);
  return findChainSlots(i);
};

const dyeCutLan = chainExample(
  'BR-18 Nhuộm rồi Cắt cùng Lan',
  chainInput(dyeThenCut(lanOnly(), lanOnly(), chairs()), OPEN_A),
);
report(
  dyeCutLan.every((s) => s.items[1]!.start === s.items[0]!.end),
  'BR-18: Cắt bắt đầu ngay khi phần khách thấy của Nhuộm kết thúc',
);
report(
  dyeCutLan.every((s) => s.items[0]!.end - s.items[0]!.start === 105),
  'BR-18: phần khách thấy của Nhuộm ngắn là 1 giờ 45, đã gồm 45 phút chờ',
);

const cutDyeLan = chainExample(
  'BR-18 Cắt rồi Nhuộm cùng Lan',
  chainInput(dyeThenCut(lanOnly(), lanOnly(), chairs(), 'cut-dye'), OPEN_A),
);
report(
  cutDyeLan.every((s) => s.items[1]!.start === s.items[0]!.end + 15),
  'BR-18: Nhuộm lùi 15 phút pha thuốc khi cùng Lan làm sau Cắt',
);

const cutDyeTwo = chainExample(
  'BR-18 Cắt rồi Nhuộm, Lan cắt, Mai nhuộm',
  chainInput(dyeThenCut([mai()], lanOnly(), chairs(), 'cut-dye'), OPEN_A),
);
report(
  cutDyeTwo.every((s) => s.items[1]!.start === s.items[0]!.end),
  'BR-18: hai người khác nhau thì Mai pha thuốc trong lúc Lan cắt, không phải chờ',
);

const peer = () =>
  resource({ id: 'Hà', typeId: STYLIST, level: 2, avail: [span('08:00', '20:00')] });
const anyChain = chainExample(
  'BR-18 Bất kỳ ai, Hà và Hùng cùng cấp, cùng ca',
  chainInput(dyeThenCut([peer(), hung()], [peer(), hung()], chairs(), 'cut-dye'), OPEN_A),
);
const solo = new Set(
  startsOfChain(chainInput(dyeThenCut([peer()], [peer()], chairs(), 'cut-dye'), OPEN_A)),
);
report(
  anyChain
    .filter((s) => solo.has(hhmm(s.start)))
    .every((s) => s.items[0]!.assignment[STYLIST] === s.items[1]!.assignment[STYLIST]),
  'BR-18: Bất kỳ ai, cùng cấp, giờ nào một người làm trọn chuỗi được thì giữ người đó',
);
report(
  anyChain.some((s) => !solo.has(hhmm(s.start))),
  'BR-18: giờ một người không làm trọn được (Nhuộm lùi 15 phút lấn giờ đóng) vẫn có, nhờ đổi người',
);

chainExample(
  'BR-18 Nhuộm rồi Cắt, Lan bận 14:00–15:00 và một ghế bị giữ',
  chainInput(
    dyeThenCut(
      [lan([span('14:00', '15:00')])],
      [lan([span('14:00', '15:00')])],
      [chair(1, [span('13:30', '16:00')]), chair(2, [span('16:30', '17:30')])],
    ),
    OPEN_A,
  ),
);

const one = chainInput(
  [{ variant: cutShort, resources: [mai(), lan(), hung(), ...chairs()] }],
  OPEN_A,
);
report(
  startsOfChain(one).join() ===
    findSlots(input(cutShort, [mai(), lan(), hung(), ...chairs()], OPEN_A))
      .map((s) => hhmm(s.start))
      .join(),
  'BR-18: chuỗi một mục cho đúng các giờ của findSlots',
);

// Sample day, through the fixture adapter.
const chainOn = (slug: string, who: string[], ids: string[]) => {
  const fixture = sample(slug);
  return freeChainSlots({
    fixture,
    date: DAY,
    items: ids.map((id, n) => ({ ...sampleVariant(fixture, id), staffResourceId: who[n]! })),
  });
};
const mayDyeCut = chainOn('toc-may', [ANY_STAFF, ANY_STAFF], ['may-dye-short', 'may-cut-short']);
report(
  mayDyeCut.length > 0 && mayDyeCut.every((s) => s.items[1]!.startAt === s.items[0]!.endAt),
  'Tóc Mây 07/11: Nhuộm ngắn rồi Cắt ngắn, mọi giờ đều nối liền',
  `${mayDyeCut.length} giờ`,
);
const mayCutDyeLan = chainOn('toc-may', ['may-lan', 'may-lan'], ['may-cut-short', 'may-dye-short']);
report(
  mayCutDyeLan.length > 0 &&
    mayCutDyeLan.every(
      (s) => Date.parse(s.items[1]!.startAt) - Date.parse(s.items[0]!.endAt) === 15 * 60_000,
    ),
  'Tóc Mây 07/11: Cắt rồi Nhuộm cùng Lan, giữa hai mục 15 phút chờ',
  `${mayCutDyeLan.length} giờ`,
);
{
  const fixture = sample('toc-may');
  const { variant, serviceId } = sampleVariant(fixture, 'may-dye-short');
  const direct = freeSlots({ fixture, variant, serviceId, date: DAY, staffResourceId: ANY_STAFF });
  const chained = chainOn('toc-may', [ANY_STAFF], ['may-dye-short']);
  report(
    direct.map((s) => s.startAt).join() === chained.map((s) => s.startAt).join() &&
      direct.map((s) => s.staffResourceId).join() ===
        chained.map((s) => s.items[0]!.staffResourceId).join(),
    'Tóc Mây 07/11: chuỗi một mục cho đúng giờ và người của freeSlots',
  );
}

// ---- Group of several subjects (BR-19) ----

const bathSmall = variantOf(petServices, 'paw-bath-small');
const groupInput = (
  resources: CoreResource[],
  variants: ServiceVariant[] = [bathSmall, bathLarge],
): FindGroupInput => ({
  items: variants.map((variant) => ({ variant, resources })),
  open: OPEN_B,
  dayStart,
  dayEnd: dayStart + 1440,
  step: 15,
  ...policy(NOW_A),
});

/** Minute by minute over every assignment: distinct people, resources shared only without overlap. */
function bruteGroup(i: FindGroupInput, starts: number[], share: boolean): boolean {
  const go = (k: number, used: Set<string>, taken: Map<string, Set<number>>): boolean => {
    if (k === i.items.length) return true;
    const { variant, resources } = i.items[k]!;
    const prep = prepMinutes(variant);
    const [visFrom, visTo] = visibleRange(variant);
    const origin = starts[k]! - prep;
    for (let m = origin + visFrom; m < origin + visTo; m++) if (!contains(i.open, m)) return false;
    const types = resourceTypesOf(variant);
    const combos = types.reduce<CoreResource[][]>(
      (acc, typeId) =>
        acc.flatMap((combo) =>
          resources.filter((r) => r.typeId === typeId).map((r) => [...combo, r]),
        ),
      [[]],
    );
    return combos.some((combo) => {
      if (new Set(combo.map((r) => r.id)).size !== combo.length) return false;
      if (combo.some((r) => used.has(r.id))) return false;
      const next = new Map(taken);
      for (const r of combo) {
        const mine = new Set(next.get(r.id) ?? []);
        for (const [from, to] of occupation(variant, r.typeId)) {
          for (let m = origin + from; m < origin + to; m++) {
            if (!contains(r.free, m) || mine.has(m)) return false;
            mine.add(m);
          }
        }
        next.set(r.id, mine);
      }
      const nextUsed = new Set(used);
      for (const r of combo) if (r.isStaff || !share) nextUsed.add(r.id);
      return go(k + 1, nextUsed, next);
    });
  };
  return go(0, new Set(), new Map());
}

const startsKey = (starts: number[]) => starts.map(hhmm).join('/');
const groupStarts = (slot: { items: { item: number; start: number }[] }) =>
  [...slot.items].sort((a, b) => a.item - b.item).map((x) => x.start);

function bruteGroupSets(i: FindGroupInput) {
  const together: string[] = [];
  const staggered = new Set<string>();
  const last = Math.min(i.dayEnd - 1, i.notAfter);
  for (let t = i.dayStart; t <= last; t += i.step) {
    if (t < i.notBefore) continue;
    if (bruteGroup(i, [t, t], false)) together.push(startsKey([t, t]));
    for (let d = -60; d <= 60; d += 15) {
      const other = t + d;
      if (d === 0 || other < i.notBefore || other > last || other < i.dayStart) continue;
      if (bruteGroup(i, [t, other], true)) staggered.add(startsKey([t, other]));
    }
  }
  return { together, staggered: [...staggered].sort() };
}

const groupExample = (name: string, i: FindGroupInput) => {
  const got = findGroupSlots(i);
  const want = bruteGroupSets(i);
  const together = got.together.map((s) => startsKey(groupStarts(s)));
  const staggered = got.staggered.map((s) => startsKey(groupStarts(s))).sort();
  report(
    together.join() === want.together.join(),
    `${name}: cùng giờ khớp vét cạn`,
    `${together.length} giờ`,
  );
  report(
    staggered.join() === want.staggered.join(),
    `${name}: giờ lệch nhau khớp vét cạn`,
    `${staggered.length} tổ hợp`,
  );
  return got;
};

const twoCages = groupExample(
  'BR-19 Mochi và Lucky, hai lồng sấy rảnh',
  groupInput([groomer('Khoa'), groomer('Vy'), bathtub(1), bathtub(2), cage(1), cage(2)]),
);
report(
  startsKey(groupStarts(twoCages.together[0]!)) === '08:00/08:00',
  'BR-19: hai bé cùng giờ sớm nhất 08:00',
);
report(
  twoCages.together.every(
    (s) => new Set(s.items.map((x) => x.assignment['paw-rt-groomer'])).size === s.items.length,
  ),
  'BR-19: mỗi bé một nhân viên khác nhau',
);

const oneCage = groupExample(
  'BR-19 Mochi và Lucky, chỉ còn một lồng sấy rảnh',
  groupInput([groomer('Khoa'), groomer('Vy'), bathtub(1), bathtub(2), cage(1)]),
);
report(oneCage.together.length === 0, 'BR-19: một lồng sấy thì không có giờ cùng lúc');
report(oneCage.staggered.length > 0, 'BR-19: một lồng sấy thì có giờ lệch nhau');
report(
  oneCage.staggered.every((s) => {
    const starts = groupStarts(s);
    return Math.max(...starts) - Math.min(...starts) <= 60;
  }),
  'BR-19: giờ lệch nhau cách nhau không quá 60 phút',
);
report(
  oneCage.staggered.every((s, k, all) => k === 0 || all[k - 1]!.end <= s.end),
  'BR-19: giờ lệch nhau xếp theo giờ xong sớm nhất',
);

const sampleGroup = (slug: string, ids: string[]) => {
  const fixture = sample(slug);
  return freeGroupSlots({
    fixture,
    date: DAY,
    items: ids.map((id) => ({ ...sampleVariant(fixture, id), staffResourceId: ANY_STAFF })),
  });
};
const pawGroup = sampleGroup('pawpaw', ['paw-bath-small', 'paw-bath-large']);
report(
  pawGroup.together.length + pawGroup.staggered.length > 0 &&
    pawGroup.staggered.every(
      (s) => Date.parse(s.items[1]!.startAt) - Date.parse(s.items[0]!.startAt) !== 0,
    ),
  'Pawpaw 07/11: Mochi và Lucky Tắm sấy có giờ cùng lúc hoặc lệch nhau',
  `${pawGroup.together.length} cùng giờ, ${pawGroup.staggered.length} lệch`,
);
const mayGroup = sampleGroup('toc-may', ['may-cut-long', 'may-cut-short']);
report(
  mayGroup.together.length > 0 &&
    mayGroup.together.every((s) => {
      const [a, b] = s.items;
      return (
        a!.staffResourceId !== b!.staffResourceId &&
        a!.assignment['may-rt-chair'] !== b!.assignment['may-rt-chair']
      );
    }),
  'Tóc Mây 07/11: hai người, hai mục khác thợ, khác ghế',
  `${mayGroup.together.length} giờ`,
);

// ---- BR-29: is the time still free once the hold is gone ----

{
  const fixture = sample('toc-may');
  const refs: BookingItemRef[] = [
    {
      key: 'may-cut',
      serviceId: 'may-cut',
      variantId: 'may-cut-short',
      staffChoice: ANY_STAFF,
    },
  ];
  const now = `${DAY}T03:30:00Z`;
  const first = bookingSlots(fixture, refs, 'single', DAY, now).main[0]!;
  const taken = buildAppointment({
    fixture,
    id: 'other',
    customerId: null,
    refs,
    subjectIds: [''],
    slot: first,
    status: 'confirmed',
  });
  const held = (expires: string) => ({ ...taken, status: 'held' as const, holdExpiresAt: expires });
  const free = (appointments: Appointment[]) =>
    stillFree(fixture, refs, 'single', first, now, { appointments });
  report(
    free(fixture.appointments) !== null,
    'BR-29: giờ không ai đặt thì còn trống sau khi hết giữ chỗ',
  );
  report(
    free([...fixture.appointments, taken]) === null,
    'BR-29: có người đã đặt đúng giờ và chỗ đó thì không còn trống',
  );
  report(
    free([...fixture.appointments, held(`${DAY}T03:25:00Z`)]) !== null,
    'BR-29: giữ chỗ của người khác đã hết hạn thì giờ vẫn còn trống (BR-07)',
  );
  report(
    free([...fixture.appointments, held(`${DAY}T03:40:00Z`)]) === null,
    'BR-29: giữ chỗ của người khác còn hạn thì giờ không còn trống',
  );
  const near = nearestSlots(fixture, refs, 'single', first.startAt, now, {
    appointments: [...fixture.appointments, taken],
  });
  report(
    near.length === 3 && near.every((s) => s.startAt > first.startAt),
    'BR-29: gợi ý ba giờ gần nhất còn trống, sau giờ đã mất',
    near.map((s) => local(s.startAt)).join(' '),
  );
  const built = buildAppointment({
    fixture,
    id: 'mine',
    customerId: 'c',
    refs,
    subjectIds: ['s'],
    slot: first,
    status: 'confirmed',
    depositVnd: 100_000n,
  });
  report(
    built.bookings.length > 0 &&
      built.items[0]?.priceVnd === 150_000n &&
      built.items[0]?.staffChoice === 'any' &&
      built.depositVnd === 100_000n,
    'Lịch online dựng từ lựa chọn: giá giữ lúc đặt, chọn Bất kỳ ai thì ghi là any (BR-12, BR-31)',
  );
}

// ---- BR-06 for the customer, none for the receptionist (BR-30) ----

{
  const now = '2026-11-07T03:20:00Z'; // 10:20 local
  const refsOf = (serviceId: string, variantId: string): BookingItemRef[] => [
    { key: serviceId, serviceId, variantId, staffChoice: ANY_STAFF },
  ];
  const may = sample('toc-may');
  const online = bookingSlots(may, refsOf('may-cut', 'may-cut-short'), 'single', DAY, now).main;
  report(
    online.length > 0 && online.every((s) => s.startAt >= '2026-11-07T05:20:00Z'),
    'BR-06: khách chỉ thấy giờ từ 2 giờ sau giờ hiện tại (đặt trước ít nhất)',
    online[0] ? local(online[0].startAt) : '',
  );
  const { variant, serviceId } = sampleVariant(may, 'may-cut-short');
  const desk = freeSlots({
    fixture: may,
    variant,
    serviceId,
    date: DAY,
    staffResourceId: ANY_STAFF,
    channel: 'staff',
    now,
    notBefore: now,
  });
  report(
    desk.some((s) => s.startAt < '2026-11-07T05:20:00Z'),
    'BR-30: lễ tân đặt được giờ sớm hơn mức đặt trước của khách',
    desk[0] ? local(desk[0].startAt) : '',
  );
  const paw = sample('pawpaw');
  const pawRefs = refsOf('paw-bath', 'paw-bath-small');
  const at = (date: string) => bookingSlots(paw, pawRefs, 'single', date, now).main.length;
  report(
    at('2026-12-05') > 0 && at('2026-12-08') === 0,
    'BR-06: Pawpaw nhận đặt xa nhất 30 ngày, ngày 08/12 chưa mở',
    `05/12: ${at('2026-12-05')} giờ, 08/12: ${at('2026-12-08')} giờ`,
  );
  report(
    bookingSlots(may, refsOf('may-cut', 'may-cut-short'), 'single', '2026-12-08', now).main
      .length === 0,
    'BR-06: Tóc Mây nhận đặt xa nhất 30 ngày, ngày 08/12 chưa mở',
  );
  const chosen = online[0]!;
  report(
    stillFree(may, refsOf('may-cut', 'may-cut-short'), 'single', chosen, '2026-11-07T05:00:00Z', {
      appointments: may.appointments,
    }) !== null,
    'BR-29: tiền về muộn, giờ đã chọn gần hơn mức đặt trước vẫn xác nhận (BR-06 áp lúc chọn giờ)',
  );
}

// ---- BR-33: what the customer did on their own is settled, not carried out again ----

{
  const fixture = sample('toc-may');
  const appt = fixture.appointments.find((a) => a.id === 'may-a-quyen-dye')!;
  const other = fixture.appointments.find((a) => a.id === 'may-a-hang')!;
  const next = bookingSlots(
    fixture,
    refsOfItems(
      heldItems(
        fixture,
        fixture.appointments.find((a) => a.id === 'may-a-quyen-upcoming')!,
        fixture.servedSubjects,
        false,
      ),
    ),
    'single',
    '2026-11-21',
    '2026-11-07T03:20:00Z',
    { appointments: fixture.appointments },
  ).main[0]!;
  const handling = {
    [appt.id]: { kind: 'rescheduled' as const, staffResourceId: 'may-lan', startAt: next.startAt },
    [other.id]: { kind: 'customer_cancelled' as const },
  };
  const result = applyHandling(fixture, fixture.appointments, handling, '2026-11-07T03:20:00Z');
  report(
    result.failed.length === 0 &&
      result.appointments.find((a) => a.id === appt.id) === appt &&
      result.appointments.find((a) => a.id === other.id) === other,
    'BR-33: khách đã chọn giờ mới hoặc đã hủy thì duyệt nghỉ bỏ qua dòng đó, không dời hay hủy lần nữa',
  );
  report(
    isSettled(handling[appt.id]) && isSettled(handling[other.id]),
    'Khách đã chọn giờ mới và khách đã hủy đều là đã xử lý (MH-40)',
  );
  report(
    openQuestion(appt.id, [{ ...fixture.staffTimeOff[0]!, handling }], []) === null,
    'Sau khi khách chọn giờ mới thì lịch không còn câu hỏi chờ trả lời',
  );
}

// ---- BR-08, BR-23, BR-33: what a customer may do by themselves ----

{
  const at = (local: string) => new Date(`${local}+07:00`).toISOString();
  const start = at('2026-11-10T14:00:00');
  const ago = (hours: number) => new Date(Date.parse(start) - hours * 3_600_000).toISOString();
  report(
    refundPercent(start, ago(48)) === 100 && refundPercent(start, ago(24)) === 100,
    'BR-23: hủy từ 24 giờ trở lên hoàn 100%',
  );
  report(
    refundPercent(start, ago(23.9)) === 50 && refundPercent(start, ago(4)) === 50,
    'BR-23: hủy từ 4 đến dưới 24 giờ hoàn 50%',
  );
  report(
    refundPercent(start, ago(3.9)) === 0 && refundPercent(start, ago(0)) === 0,
    'BR-23: hủy dưới 4 giờ không hoàn',
  );
  report(
    refundVnd(100_000n, start, ago(10)) === 50_000n &&
      refundVnd(33_333n, start, ago(10)) === 16_666n,
    'BR-23: tiền hoàn là số nguyên đồng (BR-01 của tiền)',
  );
  report(
    canSelfService(start, ago(4)) && !canSelfService(start, ago(3.99)),
    'BR-08: tự đổi, hủy được khi còn từ 4 giờ trở lên',
  );
  report(
    replyDeadline(at('2026-11-07T09:40:00'), start) === at('2026-11-08T09:40:00'),
    'BR-33: hạn trả lời là 24 giờ sau khi gửi',
  );
  report(
    replyDeadline(at('2026-11-10T09:00:00'), start) === at('2026-11-10T12:00:00'),
    'BR-33: hạn trả lời không muộn hơn 2 giờ trước giờ hẹn',
  );
  report(
    timeLeftText(start, ago(52)) === '2 ngày 4 giờ' &&
      timeLeftText(start, ago(5.5)) === '5 giờ 30 phút' &&
      timeLeftText(start, ago(0.5)) === '30 phút',
    'Chữ "còn tới giờ hẹn" tính đúng ngày, giờ, phút',
  );

  const fixture = sample('toc-may');
  const appt = fixture.appointments.find((a) => a.id === 'may-a-quyen-dye')!;
  const soon = fixture.appointments.find((a) => a.id === 'may-a-quyen-today-soon')!;
  report(
    canSelfService(appt.startAt, '2026-11-07T03:20:00Z') &&
      !canSelfService(soon.startAt, '2026-11-07T03:20:00Z'),
    'Chị Quyên: lịch 10/11 tự đổi được, lịch hôm nay trong 4 giờ thì không',
  );
  const question = openQuestion(appt.id, fixture.staffTimeOff, []);
  report(
    question?.source === 'leave' &&
      question.handling.staffResourceId === 'may-mai' &&
      openQuestion('may-a-hang', fixture.staffTimeOff, []) === null,
    'Lịch 10/11 của Chị Quyên đang chờ trả lời đổi sang Mai; lịch "Bất kỳ ai" thì không có câu hỏi',
  );
  const items = heldItems(fixture, appt, fixture.servedSubjects, false);
  const refs = refsOfItems(items);
  const NOW_Q = '2026-11-07T03:20:00Z';
  const lanOff = bookingSlots(fixture, refs, modeOf(appt), '2026-11-10', NOW_Q, {
    appointments: fixture.appointments,
  }).main;
  report(
    refs[0]?.staffChoice === 'may-lan' && lanOff.length === 0,
    'Đổi giờ lịch đích danh: Lan có đơn nghỉ chờ duyệt ngày 10/11 nên ngày đó không có giờ (BR-11)',
  );
  const next = fixture.appointments.find((a) => a.id === 'may-a-quyen-upcoming')!;
  const nextRefs = refsOfItems(heldItems(fixture, next, fixture.servedSubjects, false));
  const mine = bookingSlots(fixture, nextRefs, 'single', '2026-11-21', NOW_Q, {
    appointments: fixture.appointments.filter((a) => a.id !== next.id),
  }).main;
  const withSelf = bookingSlots(fixture, nextRefs, 'single', '2026-11-21', NOW_Q, {
    appointments: fixture.appointments,
  }).main;
  report(
    mine.some((s) => s.startAt === next.startAt) &&
      !withSelf.some((s) => s.startAt === next.startAt),
    'Đổi giờ: giờ đang giữ chỉ hiện là trống khi bỏ chính lịch này ra khỏi giờ bận',
  );
  const moved = movedAppointment(fixture, next, mine[0]!, true);
  report(
    moved.items[0]?.priceVnd === next.items[0]?.priceVnd &&
      moved.depositVnd === next.depositVnd &&
      moved.selfChanges === 1 &&
      moved.status === 'confirmed' &&
      moved.bookings.length > 0,
    'BR-12, BR-08: đổi giờ giữ giá và cọc, tăng số lần tự đổi',
  );
  report(
    movedAppointment(fixture, next, mine[0]!, false).selfChanges === undefined,
    'BR-08: chọn lại giờ khi trả lời đề nghị đổi người không tính vào số lần đổi',
  );
  report(
    bookingCode(fixture, appt) === bookingCode(fixture, appt) &&
      /^TM-\d{4}-\d{4}$/.test(bookingCode(fixture, appt)),
    'Mã lịch có dạng TM-2611-0384',
    bookingCode(fixture, appt),
  );
}

// ---- MH-23: the emails come from the sample bookings ----

{
  const fixture = sample('toc-may');
  const emails = buildEmails(fixture, '2026-11-07T03:20:00Z');
  const byId = (id: string) => emails.find((e) => e.id === id);
  report(
    ['code', 'booked', 'remind24', 'remind2', 'moved', 'cancelled', 'refunded', 'asked'].every(
      (id) => byId(id) !== undefined,
    ),
    'Email: đủ tám mẫu (mã, đã đặt, nhắc 24 giờ, nhắc 2 giờ, đã đổi, đã hủy, đã hoàn cọc, hỏi ý)',
    emails.map((e) => e.id).join(' '),
  );
  const booked = byId('booked')!;
  report(
    (booked.notes[0]?.includes('trước 10:00 ngày 10/11') ?? false) &&
      booked.notes[0]?.includes('trước 14:00 ngày 09/11 hoàn đủ cọc') === true,
    'Email đã đặt lịch: hạn tự đổi 4 giờ và hạn hoàn đủ cọc 24 giờ tính từ giờ hẹn 10/11 14:00',
    booked.notes[0],
  );
  const asked = byId('asked')!;
  report(
    asked.subject.includes('Lan nghỉ 10/11') &&
      asked.subject.includes('Mai') &&
      asked.notes[0]?.includes('trước 09:40, Chủ Nhật 08/11') === true,
    'Email hỏi ý: đúng người nghỉ, người thay và hạn trả lời BR-33',
    asked.subject,
  );
  report(
    byId('refunded')?.rows.some(([k, v]) => k === 'Hoàn lại' && v.includes('100.000 ₫ (100%)')) ===
      true,
    'Email đã hoàn cọc: 100% khi còn hơn 24 giờ (BR-23)',
  );
  const paw = buildEmails(sample('pawpaw'), '2026-11-07T03:20:00Z');
  report(paw.length >= 7, 'Email Pawpaw: dựng được từ lịch mẫu của Chị Linh', `${paw.length} mẫu`);
}

// ---- Moving by drag (MH-27) on the same day ----

const NOW = `${DAY}T03:20:00Z`;
const apptOf = (id: string) => may.appointments.find((a) => a.id === id)!;
const moveTo = (id: string, who: string, hhmm: string) => {
  const [h = 0, m = 0] = hhmm.split(':').map(Number);
  return moveAppointment({
    fixture: may,
    appt: apptOf(id),
    date: DAY,
    minute: h * 60 + m,
    staffResourceId: who,
    now: NOW,
  });
};
report(
  moveTo('may-a-van', 'may-lan', '11:30').ok,
  'Kéo Chị Vân (Hùng 11:30) sang Lan 11:30: thả được',
);
report(
  !moveTo('may-a-ngoc', 'may-lan', '11:00').ok,
  'Kéo Chị Ngọc sang Lan 11:00: giữ chỗ của Lan chặn',
);
const ngoc = moveTo('may-a-ngoc', 'may-lan', '11:15');
report(
  ngoc.ok &&
    ngoc.appt.items[0]?.priceVnd === 200_000n &&
    ngoc.appt.items[0]?.staffChoice === 'chosen',
  'Kéo Chị Ngọc sang Lan 11:15: thả được, giá giữ 200.000 ₫, vẫn ghi đích danh (BR-12, BR-32)',
);
const laneStarts = validStarts({
  fixture: may,
  appt: apptOf('may-a-van'),
  date: DAY,
  staffResourceId: 'may-lan',
  now: NOW,
})
  .slice(2, 7)
  .map((m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`)
  .join(' ');
report(
  laneStarts === '11:15 11:30 11:45 12:00 12:15',
  'Vùng thả của Chị Vân ở cột Lan: 11:15 đến 12:15',
  laneStarts,
);

// ---- BR-11: a decision that no longer fits is reported, not skipped ----

const applied = applyHandling(
  may,
  may.appointments,
  {
    'may-a-ngoc': { kind: 'swap', staffResourceId: 'may-lan' },
    'may-a-van': { kind: 'cancel' },
  },
  NOW,
);
report(
  applied.failed.length === 1 &&
    applied.failed[0]?.id === 'may-a-ngoc' &&
    !!applied.failed[0].reason,
  'Cách xử lý không còn hợp lệ (Chị Ngọc sang Lan cùng giờ) được trả về kèm lý do (BR-11)',
  JSON.stringify(applied.failed),
);
report(
  applied.appointments.find((a) => a.id === 'may-a-ngoc') === apptOf('may-a-ngoc') &&
    applied.appointments.find((a) => a.id === 'may-a-van')?.status === 'cancelled',
  'Lịch không áp được giữ nguyên, lịch hủy vẫn được áp',
);

// ---- BR-01 and BR-54 over the sample appointments ----

const LIVE: Appointment['status'][] = ['held', 'confirmed', 'checked_in', 'completed'];
for (const fixture of tenantFixtures) {
  const name = fixture.tenant.name;
  const staffIds = new Set(fixture.staff.map((m) => m.resourceId));
  const byResource = new Map<string, { start: number; end: number; id: string }[]>();
  let outside = 0;
  for (const appt of fixture.appointments.filter((a) => LIVE.includes(a.status))) {
    const date = new Date(Date.parse(appt.startAt) + 7 * 3600_000).toISOString().slice(0, 10);
    const hours = openingHours(fixture, date);
    for (const b of appt.bookings) {
      const start = Date.parse(b.startAt) / 60_000;
      const end = Date.parse(b.endAt) / 60_000;
      const list = byResource.get(b.resourceId) ?? [];
      list.push({ start, end, id: appt.id });
      byResource.set(b.resourceId, list);
      const from = hours ? localMinutes(date, hours.open) : Infinity;
      const to = hours ? localMinutes(date, hours.close) : -Infinity;
      if (staffIds.has(b.resourceId)) {
        // BR-35, BR-54: staff work in their shifts, preparation before opening included.
        const windows = staffWindows({
          shifts: fixture.shifts,
          timeOff: fixture.staffTimeOff.filter((t) => t.status === 'approved'),
          resourceId: b.resourceId,
          date,
          open: [[from, to]],
        });
        if (!windows.some(([a, z]) => a <= start && end <= z)) outside++;
      } else if (start < from || end > to) outside++;
    }
  }
  let overlaps = 0;
  const examples: string[] = [];
  for (const [resourceId, list] of byResource) {
    list.sort((a, b) => a.start - b.start);
    let reach = list[0]!;
    for (const cur of list.slice(1)) {
      if (cur.start < reach.end) {
        overlaps++;
        if (examples.length < 5) examples.push(`${resourceId}: ${reach.id} / ${cur.id}`);
      }
      if (cur.end > reach.end) reach = cur;
    }
  }
  report(
    overlaps === 0,
    `${name}: 0 đoạn chồng nhau trên cùng một tài nguyên (BR-01)`,
    examples.join('; '),
  );
  report(
    outside === 0,
    `${name}: tài nguyên trong giờ mở cửa, nhân viên trong ca (BR-54, BR-35)`,
    `${outside} đoạn ngoài giờ hoặc ngoài ca`,
  );
}

console.log(failures === 0 ? '\nTất cả đạt.' : `\n${failures} mục không đạt.`);
process.exit(failures === 0 ? 0 : 1);
