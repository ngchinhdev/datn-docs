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
import { applyBranchPrices } from '../mock/shop.ts';
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

console.log(failures === 0 ? '\nTất cả đạt.' : `\n${failures} mục không đạt.`);
process.exit(failures === 0 ? 0 : 1);
