/*
 * Checks the free-slot finder against the ten worked examples of
 * content/docs/ky-thuat/thuat-toan-gio-trong.md (section 4), against a minute-by-minute brute
 * force (section 5), and the sample appointments against double booking (BR-01).
 * Run: pnpm check:availability   (Node 24 runs TypeScript directly)
 */
import {
  findSlots,
  freeSlots,
  type CoreResource,
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
import { moveAppointment, validStarts } from '../mock/move.ts';
import { applyHandling } from '../mock/leave.ts';
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
