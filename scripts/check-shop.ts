/*
 * Checks what Cài đặt does to the rest of the mock (BR-02, BR-37, BR-38, BR-56, BR-65): opening
 * windows and special days in the free times, resources out of use, branch prices.
 * Run: pnpm check:shop   (Node 24 runs TypeScript directly)
 */
import { freeSlots } from '../mock/availability.ts';
import { tenantFixtures } from '../mock/fixtures/index.ts';
import type { TenantFixture } from '../mock/fixtures/types.ts';
import { openingHours, openingWindows } from '../mock/hours.ts';
import { localTimeOf } from '../mock/shifts.ts';
import {
  applyBranchPrices,
  branchChanges,
  branchRequeues,
  hoursByDay,
  outsideHours,
  toBusinessHours,
  windowsProblem,
} from '../mock/shop.ts';
import { activeOutage, outageImpact, touchedBy, upcomingCount } from '../mock/outage.ts';
import { localDate, MOCK_NOW } from '../mock/time.ts';
import { minutesOf } from '../mock/shifts.ts';

let failures = 0;
const report = (ok: boolean, name: string, detail = '') => {
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` :: ${detail}` : ''}`);
};

const salon = tenantFixtures.find((f) => f.tenant.slug === 'toc-may')!;
const cut = salon.services.find((s) => s.id === 'may-cut')!;
const cutShort = cut.variants.find((v) => v.id === 'may-cut-short')!;

const withBranch = (f: TenantFixture, patch: Partial<TenantFixture['branches'][number]>) => ({
  ...f,
  branches: [{ ...f.branches[0]!, ...patch }, ...f.branches.slice(1)],
});

/** Times a customer can start a short cut on a date, anybody doing it. */
const starts = (f: TenantFixture, date: string) =>
  freeSlots({
    fixture: f,
    variant: cutShort,
    serviceId: cut.id,
    date,
    staffResourceId: 'any',
    channel: 'staff',
    notBefore: '2026-11-01T00:00:00Z',
  }).map((s) => localTimeOf(minutesOf(s.startAt)));

const inRange = (times: string[], from: string, to: string) =>
  times.filter((t) => t >= from && t < to);

// ---- BR-02: several windows a day ----

{
  const sunday = '2026-11-08';
  const base = starts(salon, sunday);
  const lunch = withBranch(salon, {
    businessHours: [
      ...salon.branches[0]!.businessHours.filter((h) => h.weekday !== 0),
      { weekday: 0, open: '09:00', close: '12:00' },
      { weekday: 0, open: '14:00', close: '20:00' },
    ],
  });
  const windows = openingWindows(lunch, sunday);
  report(
    windows.length === 2 && windows[0]!.close === '12:00' && windows[1]!.open === '14:00',
    'BR-02: Chủ Nhật có hai khung 09:00–12:00 và 14:00–20:00',
    JSON.stringify(windows),
  );
  const range = openingHours(lunch, sunday);
  report(
    range?.open === '09:00' && range.close === '20:00',
    'BR-02: lịch vẽ cả ngày từ khung đầu tới khung cuối',
  );
  const after = starts(lunch, sunday);
  report(
    inRange(base, '11:30', '14:00').length > 0,
    'Đối chứng: không nghỉ trưa thì có giờ trống từ 11:30 đến 14:00',
    base.join(' '),
  );
  report(
    inRange(after, '11:30', '14:00').length === 0,
    'BR-02: nghỉ trưa 12:00–14:00 thì không còn giờ nào chạm khoảng đó',
    inRange(after, '11:30', '14:00').join(' '),
  );
  report(
    after.every((t) => base.includes(t)),
    'BR-02: đổi giờ chỉ bớt giờ trống, không thêm giờ nào',
  );
}

// ---- BR-02: a special day beats the regular hours ----

{
  const day = '2026-11-15';
  const closed = withBranch(salon, {
    specialDays: [...salon.branches[0]!.specialDays, { date: day, note: 'Nghỉ lễ', hours: null }],
  });
  report(starts(salon, day).length > 0, 'Đối chứng: 15/11 còn giờ trống khi mở cửa thường');
  report(
    starts(closed, day).length === 0 && openingWindows(closed, day).length === 0,
    'BR-02: thêm ngày đóng cửa 15/11 thì không còn giờ nào',
  );
  const short = withBranch(salon, {
    specialDays: [
      ...salon.branches[0]!.specialDays,
      { date: day, note: 'Đóng sớm', hours: { open: '09:00', close: '12:00' } },
    ],
  });
  report(
    starts(short, day).every((t) => t < '12:00'),
    'BR-02: ngày đặc biệt giờ khác thay giờ thường: không có giờ sau 12:00',
  );
}

// ---- BR-37: a resource out of use ----

{
  const day = '2026-11-10';
  const chairs = salon.resources.filter((r) => r.resourceTypeId === 'may-rt-chair');
  const stop = (ids: string[]) => ({
    ...salon,
    config: {
      ...salon.config,
      outages: ids.map((resourceId, i) => ({
        id: `o${i}`,
        resourceId,
        from: '2026-11-10T02:00:00Z',
        to: '2026-11-10T06:00:00Z',
        reason: 'Bảo trì',
      })),
    },
  });
  const base = starts(salon, day);
  const allOut = starts(stop(chairs.map((c) => c.id)), day);
  report(inRange(base, '09:00', '13:00').length > 0, 'Đối chứng: 10/11 có giờ cắt 09:00–13:00');
  report(
    inRange(allOut, '09:00', '12:15').length === 0,
    'BR-37: ba ghế đều ngưng 09:00–13:00 thì không còn giờ cắt trong khoảng đó',
    inRange(allOut, '09:00', '12:15').join(' '),
  );
  const oneOut = freeSlots({
    fixture: stop(['may-chair-2']),
    variant: cutShort,
    serviceId: cut.id,
    date: day,
    staffResourceId: 'any',
    channel: 'staff',
    notBefore: '2026-11-01T00:00:00Z',
  }).filter(
    (s) =>
      minutesOf(s.startAt) >= minutesOf('2026-11-10T02:00:00Z') &&
      minutesOf(s.startAt) < minutesOf('2026-11-10T06:00:00Z'),
  );
  report(
    oneOut.length > 0 && oneOut.every((s) => s.assignment['may-rt-chair'] !== 'may-chair-2'),
    'BR-37: một ghế ngưng thì giờ vẫn còn nhưng không xếp vào ghế đó',
  );
}

// ---- BR-02, BR-56: the price of a branch ----

{
  const dye = salon.services
    .find((s) => s.id === 'may-dye')!
    .variants.find((v) => v.id === 'may-dye-short')!;
  const priced = applyBranchPrices(salon.services, { 'may-dye-short': 550_000n });
  const out = priced
    .find((s) => s.id === 'may-dye')!
    .variants.find((v) => v.id === 'may-dye-short')!;
  report(
    dye.priceVnd === 500_000n && out.priceVnd === 550_000n,
    'BR-02: giá riêng 550.000 ₫ thay giá chung 500.000 ₫',
  );
  report(
    JSON.stringify(out.pricesByLevel?.map(String)) ===
      JSON.stringify(['550000', '605000', '660000']),
    'BR-56: giá theo cấp tính trên giá chi nhánh: 550.000, 605.000, 660.000 ₫',
    JSON.stringify(out.pricesByLevel?.map(String)),
  );
  const other = priced.find((s) => s.id === 'may-cut')!.variants[0]!;
  report(other.priceVnd === 150_000n, 'BR-02: biến thể không có giá riêng giữ giá chung');
  report(
    applyBranchPrices(salon.services, undefined).length === salon.services.length &&
      dye.priceVnd === 500_000n,
    'Không đổi dữ liệu gốc',
  );
}

// ---- BR-02, BR-35: changing the hours with appointments already booked ----

{
  const b = salon.branches[0]!;
  const lunch: typeof b = {
    ...b,
    businessHours: [
      ...b.businessHours.filter((h) => h.weekday !== 0),
      { weekday: 0, open: '09:00', close: '12:00' },
      { weekday: 0, open: '14:00', close: '20:00' },
    ],
  };
  const out = outsideHours(salon.appointments, lunch, MOCK_NOW);
  report(
    out.length > 0 && out.every((a) => new Date(a.startAt).getUTCDay() !== undefined),
    'BR-35: nghỉ trưa Chủ Nhật 12:00–14:00 thì có lịch đã đặt nằm ngoài giờ',
    out.map((a) => `${a.id}@${a.startAt}`).join(' '),
  );
  report(
    out.every((a) => a.status === 'confirmed' && a.startAt >= MOCK_NOW),
    'BR-35: chỉ lịch sắp tới đã xác nhận mới vào Cần xếp lại',
  );
  report(
    outsideHours(salon.appointments, b, MOCK_NOW).length === 0,
    'Giờ mở cửa hiện tại: không có lịch nào ngoài giờ',
  );
  const sundayOnly = out.every((a) => localDate(a.startAt) >= '2026-11-08');
  report(sundayOnly, 'Lịch bị ảnh hưởng đều từ Chủ Nhật 08/11 trở đi');
  const requeues = branchRequeues(
    out,
    { kind: 'hours', label: 'Chi nhánh', reason: 'Giờ mở cửa mới' },
    MOCK_NOW,
    (n) => `rq-${n}`,
  );
  report(
    requeues.every((r) => r.kind === 'hours' && r.appointmentIds.length > 0) &&
      requeues.reduce((m, r) => m + r.appointmentIds.length, 0) === out.length,
    'BR-35: mỗi ngày một mục Cần xếp lại, đủ mọi lịch bị ảnh hưởng',
  );
  const closed = {
    ...b,
    specialDays: [...b.specialDays, { date: '2026-11-13', note: 'x', hours: null }],
  };
  const closedOut = outsideHours(salon.appointments, closed, MOCK_NOW);
  report(
    closedOut.length > 0 && closedOut.every((a) => localDate(a.startAt) === '2026-11-13'),
    'BR-02: đóng cửa 13/11 thì lịch ngày đó vào Cần xếp lại',
    String(closedOut.length),
  );
  const changes = branchChanges(
    b,
    lunch,
    (id) => id,
    () => 0n,
  );
  report(
    changes.length === 1 &&
      changes[0]!.short === 'giờ Chủ Nhật' &&
      changes[0]!.detail.includes('14:00–20:00'),
    'Lưu thay đổi ghi đúng một dòng "giờ Chủ Nhật"',
    JSON.stringify(changes),
  );
  report(
    windowsProblem([
      { open: '09:00', close: '13:00' },
      { open: '12:00', close: '20:00' },
    ]) !== null &&
      windowsProblem([
        { open: '09:00', close: '12:00' },
        { open: '12:00', close: '20:00' },
      ]) === null &&
      windowsProblem([{ open: '20:00', close: '09:00' }]) !== null &&
      windowsProblem([{ open: '9h', close: '12:00' }]) !== null,
    'BR-02: khung chồng nhau, đảo giờ, sai dạng giờ đều bị từ chối',
  );
  const day = hoursByDay(b.businessHours);
  report(
    toBusinessHours(day).length === b.businessHours.length,
    'Đọc rồi ghi lại giờ mở cửa không mất khung nào',
  );
}

// ---- BR-37: appointments of a resource that is taken out ----

{
  const now = '2026-11-07T03:20:00Z';
  const stop = (resourceId: string, from: string, to: string) =>
    outageImpact({ fixture: salon, resourceId, from, to, now });
  const one = stop('may-chair-1', '2026-11-07T04:00:00Z', '2026-11-07T05:00:00Z');
  report(
    one.length === 1 &&
      one[0]!.appt.id === 'may-a-ngoc' &&
      one[0]!.moved !== null &&
      one[0]!.before.join() === 'Ghế 1' &&
      one[0]!.after.join() === 'Ghế 3',
    'BR-37: Ghế 1 ngưng 11:00–12:00 thì lịch chị Ngọc tự sang Ghế 3, cùng giờ, cùng thợ',
    JSON.stringify(one.map((i) => [i.appt.id, i.before, i.after, i.reason])),
  );
  report(
    Date.parse(one[0]!.moved!.startAt) === Date.parse(one[0]!.appt.startAt) &&
      one[0]!.moved!.items[0]!.staffResourceId === one[0]!.appt.items[0]!.staffResourceId &&
      one[0]!.moved!.items[0]!.priceVnd === one[0]!.appt.items[0]!.priceVnd,
    'BR-37: đổi ghế không đổi giờ, người làm hay giá (BR-12)',
  );
  const jam = stop('may-chair-3', '2026-11-07T06:00:00Z', '2026-11-07T09:00:00Z');
  report(
    jam.length === 1 && jam[0]!.moved === null && jam[0]!.reason === 'Không còn ghế cắt',
    'BR-37: không còn ghế cùng loại trống thì vào Cần xếp lại',
    JSON.stringify(jam.map((i) => [i.appt.id, i.reason])),
  );
  const mixed = stop('may-chair-1', '2026-11-07T02:00:00Z', '2026-11-07T05:30:00Z');
  report(
    mixed.some((i) => i.moved) && mixed.some((i) => !i.moved),
    'BR-37: một khoảng ngưng có lịch tự chuyển được và lịch không chuyển được',
    JSON.stringify(mixed.map((i) => [i.appt.id, i.moved ? 'chuyển' : 'xếp lại'])),
  );

  // After the moves nothing is booked twice (BR-01) and nothing is on the resource in the outage.
  const moved = new Map(mixed.filter((i) => i.moved).map((i) => [i.appt.id, i.moved!]));
  const after = salon.appointments.map((a) => moved.get(a.id) ?? a);
  const clash: string[] = [];
  const byResource = new Map<string, { a: number; b: number; id: string }[]>();
  for (const appt of after) {
    if (!['confirmed', 'checked_in', 'completed', 'held'].includes(appt.status)) continue;
    for (const bk of appt.bookings) {
      const list = byResource.get(bk.resourceId) ?? [];
      list.push({ a: minutesOf(bk.startAt), b: minutesOf(bk.endAt), id: appt.id });
      byResource.set(bk.resourceId, list);
    }
  }
  for (const [resourceId, list] of byResource) {
    list.sort((x, y) => x.a - y.a);
    for (let i = 1; i < list.length; i++) {
      if (list[i]!.a < list[i - 1]!.b && list[i]!.id !== list[i - 1]!.id) {
        clash.push(`${resourceId}: ${list[i - 1]!.id}/${list[i]!.id}`);
      }
    }
  }
  report(
    clash.length === 0,
    'BR-01: sau khi chuyển ghế không có hai lịch chồng nhau',
    clash.slice(0, 3).join('; '),
  );

  report(
    touchedBy(salon.appointments, 'may-chair-1', '2026-11-07T04:00:00Z', '2026-11-07T05:00:00Z')
      .length === 1,
    'Lịch chạm khoảng ngưng tính đúng theo từng đoạn dùng tài nguyên',
  );
  report(
    upcomingCount(salon.appointments, 'may-chair-1', now) > 0 &&
      upcomingCount(salon.appointments, 'may-chair-1', now) >=
        upcomingCount(salon.appointments, 'may-chair-3', now) - 20,
    'Cột "Lịch 7 ngày tới" đếm lịch có dùng tài nguyên',
  );
  const o = {
    id: 'o',
    resourceId: 'may-chair-2',
    from: '2026-11-07T02:00:00Z',
    to: '2026-11-12T10:00:00Z',
    reason: 'x',
  };
  report(
    activeOutage([o], 'may-chair-2', now)?.id === 'o' &&
      activeOutage([o], 'may-chair-1', now) === undefined,
    'Trạng thái "Bảo trì đến …": chỉ tài nguyên đang trong khoảng ngưng',
  );
  report(
    activeOutage([{ ...o, to: now }], 'may-chair-2', now) === undefined,
    '"Mở lại" kết thúc khoảng ngưng ngay (BR-37)',
  );
}

console.log(failures === 0 ? '\nTất cả đạt.' : `\n${failures} mục không đạt.`);
process.exit(failures === 0 ? 0 : 1);
