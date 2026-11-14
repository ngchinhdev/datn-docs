/*
 * Checks what Cài đặt does to the rest of the mock (BR-02, BR-37, BR-38, BR-56, BR-65): opening
 * windows and special days in the free times, resources out of use, branch prices.
 * Run: pnpm check:shop   (Node 24 runs TypeScript directly)
 */
import { freeSlots } from '../mock/availability.ts';
import { tenantFixtures } from '../mock/fixtures/index.ts';
import type { TenantFixture } from '../mock/fixtures/types.ts';
import { openingHours, openingWindows } from '../mock/hours.ts';
import { subtract, type Interval } from '../mock/intervals.ts';
import { openIntervals, uncoveredHours } from '../mock/rota.ts';
import { localMinutes, localTimeOf } from '../mock/shifts.ts';
import { topupBonus } from '../mock/money.ts';
import { addAudit, addAudits, SYSTEM_ACTOR } from '../mock/audit.ts';
import { chatbotPreview, chatbotProblem, limitExample } from '../mock/chatbot.ts';
import { buildEmails } from '../mock/emails.ts';
import {
  ACCENT_SUGGESTIONS,
  keyTailFor,
  packageSaving,
  percentText,
  soldCount,
  tiersProblem,
  accentProblem,
  accentStyle,
  contrastText,
  REDIRECT_DAYS,
  whiteContrast,
  applyBranchPrices,
  branchChanges,
  branchRequeues,
  hoursByDay,
  outsideHours,
  toBusinessHours,
  windowsProblem,
  windowsText,
} from '../mock/shop.ts';
import {
  earliestBooking,
  noShowFrom,
  noShowsInSixMonths,
  refundPercent,
  refundVnd,
  selfChangeBlock,
  selfChangeUntil,
  termsFrom,
} from '../mock/policy.ts';
import { openingTerms, termsOfAppointment } from '../mock/terms.ts';
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
    specialDays: [...salon.branches[0]!.specialDays, { date: day, note: 'Nghỉ lễ', hours: [] }],
  });
  report(starts(salon, day).length > 0, 'Đối chứng: 15/11 còn giờ trống khi mở cửa thường');
  report(
    starts(closed, day).length === 0 && openingWindows(closed, day).length === 0,
    'BR-02: thêm ngày đóng cửa 15/11 thì không còn giờ nào',
  );
  const short = withBranch(salon, {
    specialDays: [
      ...salon.branches[0]!.specialDays,
      { date: day, note: 'Đóng sớm', hours: [{ open: '09:00', close: '12:00' }] },
    ],
  });
  report(
    starts(short, day).every((t) => t < '12:00'),
    'BR-02: ngày đặc biệt giờ khác thay giờ thường: không có giờ sau 12:00',
  );
}

{
  // A special day may have several windows, like a regular day (BR-02).
  const day = '2026-11-20';
  const split = withBranch(salon, {
    specialDays: [
      ...salon.branches[0]!.specialDays,
      {
        date: day,
        note: 'Giờ đặc biệt',
        hours: [
          { open: '09:00', close: '12:00' },
          { open: '15:00', close: '20:00' },
        ],
      },
    ],
  });
  const times = starts(split, day);
  report(
    openingWindows(split, day).length === 2 &&
      times.some((t) => t < '12:00') &&
      times.some((t) => t >= '15:00') &&
      times.every((t) => t < '12:00' || t >= '15:00'),
    'BR-02: ngày đặc biệt 20/11 mở 09:00–12:00 và 15:00–20:00 thì không có giờ trong 12:00–15:00',
    times.join(' '),
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
    specialDays: [...b.specialDays, { date: '2026-11-13', note: 'x', hours: [] }],
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

// ---- BR-06 to BR-10, BR-23, BR-38: policies and the terms of a booking ----

{
  const NOW = '2026-11-07T03:20:00Z';
  const local = (iso: string) => localTimeOf(minutesOf(iso));
  report(
    local(earliestBooking(NOW, 3)) === '13:30' && local(earliestBooking(NOW, 2)) === '12:30',
    'BR-06: bây giờ 10:20, đặt trước ít nhất 3 giờ thì từ 13:30 (2 giờ thì từ 12:30)',
    local(earliestBooking(NOW, 3)),
  );
  const start = '2026-11-07T07:00:00.000Z';
  report(
    local(selfChangeUntil(start, 4)) === '10:00',
    'BR-08: lịch 14:00, tự đổi trước 4 giờ thì tới 10:00',
  );
  report(
    local(noShowFrom(start, 15)) === '14:15',
    'BR-09: lịch 14:00, sau 15 phút thì lễ tân thấy "Không đến" từ 14:15',
  );
  const tenHoursBefore = '2026-11-06T21:00:00.000Z';
  report(
    refundVnd(100_000n, start, tenHoursBefore) === 50_000n &&
      refundVnd(100_000n, start, tenHoursBefore, { over24: 100, over4: 70, under4: 0 }) === 70_000n,
    'BR-23: cọc 100.000 ₫, hủy khi còn 10 giờ: mức mặc định hoàn 50.000 ₫, mức 70% hoàn 70.000 ₫',
  );
  report(
    refundPercent(start, '2026-11-05T07:00:00.000Z', { over24: 90, over4: 50, under4: 10 }) ===
      90 &&
      refundPercent(start, '2026-11-07T06:00:00.000Z', { over24: 90, over4: 50, under4: 10 }) ===
        10,
    'BR-23: ba mức theo 24 giờ và 4 giờ, mức cấu hình thay mức mặc định',
  );

  // BR-38: the sample bookings keep the opening terms, a new booking its own.
  const opened = openingTerms('toc-may');
  report(
    opened.cancelBeforeHours === 4 && opened.maxReschedules === 2 && opened.refund.over24 === 100,
    'BR-38: lịch mẫu giữ điều khoản lúc cơ sở mở (tự đổi trước 4 giờ, tối đa 2 lần, hoàn 100/50/0)',
  );
  const promised = termsFrom(
    { cancelBeforeHours: 6, maxReschedules: 1 },
    { over24: 80, over4: 40, under4: 0 },
  );
  report(
    termsOfAppointment({ terms: promised }, 'toc-may').cancelBeforeHours === 6 &&
      termsOfAppointment({}, 'toc-may').cancelBeforeHours === 4,
    'BR-38: lịch có điều khoản riêng giữ điều khoản đó, lịch không có thì dùng điều khoản lúc mở',
  );
  const appt = { status: 'confirmed', startAt: start, selfChanges: 1 };
  report(
    selfChangeBlock(appt, '2026-11-07T01:30:00.000Z', promised, false) !== null &&
      selfChangeBlock(appt, '2026-11-07T01:30:00.000Z', opened, false) === null,
    'BR-38: đổi chính sách không đụng lịch đã đặt: cùng giờ, điều khoản 6 giờ chặn, điều khoản 4 giờ cho đổi',
  );
}

// ---- BR-65: the colour of the shop ----

{
  report(
    Math.abs(whiteContrast('#000000') - 21) < 0.01 &&
      Math.abs(whiteContrast('#FFFFFF') - 1) < 0.001,
    'BR-65: tương phản chữ trắng: nền đen 21 : 1, nền trắng 1 : 1',
  );
  report(
    ACCENT_SUGGESTIONS.every((c) => accentProblem(c.hex) === null),
    'BR-65: năm màu gợi ý đều đạt 4,5 : 1 với chữ trắng',
    ACCENT_SUGGESTIONS.map((c) => c.hex + ' ' + contrastText(whiteContrast(c.hex))).join('; '),
  );
  report(
    accentProblem('#F5D76E') !== null && accentProblem('#FFFF00') !== null,
    'BR-65: màu vàng nhạt không đạt tương phản, không lưu được',
    accentProblem('#F5D76E') ?? '',
  );
  report(
    accentProblem('B4235A') !== null &&
      accentProblem('#B4235') !== null &&
      accentProblem('#b4235a') === null,
    'BR-65: mã màu phải dạng #RRGGBB (chữ hoa hay thường đều được)',
  );
  report(
    accentProblem(salon.config.branding.accent) === null &&
      accentProblem(tenantFixtures[1]!.config.branding.accent) === null,
    'Màu mẫu của hai cơ sở đạt tương phản',
  );
  const style = accentStyle('may', '#1F5FA8');
  report(
    style['--tenant-may'] === '#1F5FA8' &&
      style['--on-tenant-may'] === '#ffffff' &&
      Boolean(style['--tenant-may-soft']?.includes('#1F5FA8')),
    'Trang khách nhận màu đã chọn qua ba biến của cơ sở',
  );
  report(REDIRECT_DAYS === 90, 'BR-65: link cũ chuyển hướng 90 ngày');
}

// ---- BR-25, BR-26, BR-27, BR-38: packages and payments ----

{
  const saving = packageSaving(700_000n, 10, 80_000n);
  report(
    saving.perSession === 70_000n &&
      saving.percentTenths === 125 &&
      percentText(saving.percentTenths) === '12,5',
    'BR-26: gói 700.000 ₫ / 10 buổi = 70.000 ₫ mỗi buổi, rẻ hơn giá lẻ 80.000 ₫ là 12,5%',
    JSON.stringify([String(saving.perSession), saving.percentTenths]),
  );
  report(
    packageSaving(900_000n, 10, 80_000n).percentTenths < 0 && percentText(50) === '5',
    'Gói đắt hơn giá lẻ thì phần tiết kiệm âm; 5,0% viết là 5%',
  );
  const tiers = [
    { minVnd: 1_000_000n, percent: 10 },
    { minVnd: 3_000_000n, percent: 15 },
  ];
  report(
    topupBonus(1_500_000n, tiers) === 150_000n && topupBonus(3_000_000n, tiers) === 450_000n,
    'BR-25: thêm mức nạp 3.000.000 ₫ tặng 15% thì nạp 3.000.000 ₫ tặng 450.000 ₫, nạp 1.500.000 ₫ vẫn tặng 150.000 ₫',
  );
  report(
    tiersProblem(tiers) === null &&
      tiersProblem([{ minVnd: 0n, percent: 10 }]) !== null &&
      tiersProblem([{ minVnd: 1_000_000n, percent: 101 }]) !== null &&
      tiersProblem([{ minVnd: 1_000_000n, percent: -1 }]) !== null &&
      tiersProblem([
        { minVnd: 1_000_000n, percent: 5 },
        { minVnd: 1_000_000n, percent: 10 },
      ]) !== null &&
      tiersProblem([]) === null,
    'BR-25: mức tặng sai (nạp 0 ₫, trên 100%, âm, trùng số nạp) bị từ chối; không có mức nào là hợp lệ',
  );
  const sold = [
    { packages: [{ productId: 'a' }, { productId: 'b' }] },
    { packages: [{ productId: 'a' }] },
    {},
  ];
  report(
    soldCount(sold, 'a') === 2 && soldCount(sold, 'z') === 0,
    'Cột "Đã bán" đếm gói khách đang giữ theo sản phẩm',
  );
  const catalog = salon.packageCatalog;
  report(
    catalog.some((p) => !p.selling) && catalog.some((p) => p.selling),
    'BR-38: gói ngừng bán vẫn nằm trong danh sách để sửa, MH-30 chỉ liệt kê gói đang bán',
  );
  const an = salon.customers.find((c) => c.id === 'may-c-an')!.packages![0]!;
  report(
    an.productId === 'may-pkg-5' && an.priceVnd === 380_000n,
    'BR-38: gói khách đã mua giữ giá lúc mua dù gói trong danh sách đổi giá',
  );
  report(
    keyTailFor(1) !== keyTailFor(2) &&
      keyTailFor(2) === keyTailFor(2) &&
      /^[0-9a-f]{4}$/.test(keyTailFor(7)),
    'Khóa mới có 4 ký tự cuối khác khóa cũ, cùng phiên bản thì cùng kết quả',
  );
}

// ---- BR-66, BR-67: notifications and the chatbot ----

{
  const NOW = '2026-11-07T03:20:00Z';
  const ids = (f: TenantFixture, all = false) =>
    buildEmails(f, NOW, all ? { all: true } : {}).map((e) => e.id);
  const off = (patch: Partial<TenantFixture['config']['notifications']>): TenantFixture => ({
    ...salon,
    config: { ...salon.config, notifications: { ...salon.config.notifications, ...patch } },
  });
  report(
    ids(salon).includes('remind24') && ids(salon).includes('remind2'),
    'Mặc định cả hai email nhắc đều có trong mẫu email',
  );
  report(
    !ids(off({ reminder24h: false })).includes('remind24') &&
      ids(off({ reminder24h: false })).includes('remind2'),
    'BR-66: tắt nhắc 24 giờ thì mẫu đó biến mất, nhắc 2 giờ còn',
  );
  const noReminders = ids(off({ reminder24h: false, reminder2h: false }));
  report(
    ['code', 'booked', 'moved', 'cancelled', 'asked'].every((id) => noReminders.includes(id)),
    'BR-66: email mã xác nhận, đã đặt, đổi giờ, hủy, hỏi ý đổi người không tắt được',
    noReminders.join(', '),
  );
  report(
    ids(off({ reminder24h: false, reminder2h: false }), true).includes('remind24'),
    'Trang cài đặt vẫn xem trước được email nhắc đang tắt',
  );

  const reply = chatbotPreview(salon, NOW);
  report(
    reply.question === 'Chiều nay còn giờ cắt ngắn không?' &&
      reply.answer.includes('150.000 ₫') &&
      reply.answer.includes('45 phút') &&
      /\d{2}:\d{2}/.test(reply.answer),
    'BR-67: trợ lý nói giờ trống, giá và thời lượng lấy từ hệ thống',
    reply.answer,
  );
  const pricier: TenantFixture = {
    ...salon,
    branches: [{ ...salon.branches[0]!, prices: { 'may-cut-short': 170_000n } }],
    services: applyBranchPrices(salon.services, { 'may-cut-short': 170_000n }),
  };
  report(
    chatbotPreview(pricier, NOW).answer.includes('170.000 ₫'),
    'BR-67: đổi giá riêng của chi nhánh thì trợ lý nói giá mới',
  );
  const later = chatbotPreview(salon, '2026-11-07T12:30:00Z').answer;
  report(
    later.includes('hết giờ trống') && later.includes('028 3930 1234'),
    'BR-67: hết giờ trống thì mời gọi số của chi nhánh',
    later,
  );
  const ok = { greeting: 'Chào bạn', perCustomerPerDay: 20, perShopPerMonth: 3000 };
  report(
    chatbotProblem(ok) === null &&
      chatbotProblem({ ...ok, greeting: 'x'.repeat(201) }) !== null &&
      chatbotProblem({ ...ok, greeting: 'x'.repeat(200) }) === null &&
      chatbotProblem({ ...ok, greeting: '  ' }) !== null &&
      chatbotProblem({ ...ok, perCustomerPerDay: 0 }) !== null &&
      chatbotProblem({ ...ok, perShopPerMonth: 0 }) !== null,
    'BR-67: lời chào tối đa 200 ký tự, hai giới hạn từ 1 lượt',
  );
  report(
    limitExample(20).includes('lượt thứ 21'),
    'BR-67: giới hạn 20 lượt thì lượt thứ 21 trong ngày được mời gọi tiệm',
  );
  report(
    salon.config.chatbot.usedThisMonth < salon.config.chatbot.perShopPerMonth,
    'Số lượt đã dùng tháng này nhỏ hơn giới hạn của cơ sở',
  );
}

// ---- BR-63: the audit log only grows ----

{
  const base = salon.money.audit;
  const lan = { name: 'Lan', role: 'Lễ tân' };
  const next = addAudit(base, '2026-11-07T03:30:00Z', lan, {
    action: 'Sửa chính sách',
    object: 'Đặt trước ít nhất',
    detail: '2 → 3 giờ',
  });
  report(
    next.length === base.length + 1 && base.every((e, i) => next[i] === e),
    'BR-63: thêm một dòng nhật ký không đổi các dòng đã có',
  );
  const added = next.at(-1)!;
  report(
    added.by === 'Lan' &&
      added.role === 'Lễ tân' &&
      added.action === 'Sửa chính sách' &&
      added.at === '2026-11-07T03:30:00Z',
    'BR-63: dòng nhật ký có giờ, người, vai trò, thao tác, đối tượng, chi tiết',
  );
  const many = addAudits(next, '2026-11-07T03:31:00Z', SYSTEM_ACTOR, [
    { action: 'a', object: 'x', detail: '1' },
    { action: 'b', object: 'y', detail: '2' },
  ]);
  report(
    new Set(many.map((e) => e.id)).size === many.length && many.at(-1)!.by === 'Hệ thống',
    'Mọi dòng nhật ký có mã riêng; việc hệ thống tự làm ghi người là "Hệ thống"',
  );
  report(
    salon.money.audit.some((e) => e.by === 'Hệ thống' && e.action === 'Bật bắt buộc cọc') &&
      salon.money.audit.some((e) => e.action === 'Hoàn cọc tự động'),
    'BR-63: nhật ký mẫu có việc hệ thống tự làm (bật bắt buộc cọc, hoàn cọc tự động)',
  );
  const appts = [
    { customerId: 'c', status: 'no_show', startAt: '2026-10-01T03:00:00Z' },
    { customerId: 'c', status: 'no_show', startAt: '2026-01-01T03:00:00Z' },
    { customerId: 'c', status: 'completed', startAt: '2026-10-05T03:00:00Z' },
    { customerId: 'd', status: 'no_show', startAt: '2026-10-01T03:00:00Z' },
  ];
  report(
    noShowsInSixMonths(appts, 'c', '2026-11-07T03:20:00Z') === 1,
    'BR-10: chỉ tính lần không đến của khách đó trong 6 tháng gần nhất',
  );
}

// ---- BR-02, BR-35: the rota screens see every opening window ----

{
  const sunday = '2026-11-08';
  const b = salon.branches[0]!;
  const lunch = withBranch(salon, {
    businessHours: [
      ...b.businessHours.filter((h) => h.weekday !== 0),
      { weekday: 0, open: '09:00', close: '12:00' },
      { weekday: 0, open: '14:00', close: '20:00' },
    ],
  });
  const m = (hhmm: string) => localMinutes(sunday, hhmm);
  const windows = openIntervals(lunch, sunday);
  report(
    windowsText(openingWindows(lunch, sunday)) === '09:00–12:00, 14:00–20:00' &&
      windows.length === 2 &&
      windows[0]![0] === m('09:00') &&
      windows[1]![1] === m('20:00'),
    'BR-02: hàng "Mở cửa" Chủ Nhật ghi từng khung 09:00–12:00, 14:00–20:00',
  );
  const person = salon.staff[0]!;
  const onlyPerson = { ...lunch, staff: [person] };
  const block = (start: string, end: string) => ({
    resourceId: person.resourceId,
    date: sunday,
    start: start as `${number}:${number}`,
    end: end as `${number}:${number}`,
  });
  const gaps = (shifts: ReturnType<typeof block>[], branch = onlyPerson) =>
    uncoveredHours({ fixture: branch, shifts, timeOff: [], date: sunday });
  const both = [block('09:00', '12:00'), block('14:00', '20:00')];
  report(
    gaps(both).length === 0,
    'BR-35: thợ làm 09:00–12:00 và 14:00–20:00, Chủ Nhật mở hai khung đó thì không có cảnh báo',
    JSON.stringify(gaps(both)),
  );
  // What the single range would have said: the lunch break counted as an hour nobody covers.
  const envelope: Interval[] = [[m('09:00'), m('20:00')]];
  const covered = both.flatMap((s): Interval[] => [[m(s.start), m(s.end)]]);
  report(
    subtract(envelope, covered).length === 1,
    'Đối chứng: tính theo một khoảng 09:00–20:00 thì nghỉ trưa 12:00–14:00 bị báo là không ai trực',
  );
  const morningOnly = gaps([block('09:00', '12:00')]);
  report(
    morningOnly.length === 1 &&
      morningOnly[0]![0] === m('14:00') &&
      morningOnly[0]![1] === m('20:00'),
    'BR-35: thợ chỉ làm buổi sáng thì báo đúng khung chiều 14:00–20:00 không ai trực',
    JSON.stringify(morningOnly),
  );
  const partial = gaps([block('09:00', '12:00'), block('14:00', '18:00')]);
  report(
    partial.length === 1 && partial[0]![0] === m('18:00') && partial[0]![1] === m('20:00'),
    'BR-35: thợ làm tới 18:00 thì báo 18:00–20:00, không báo giờ nghỉ trưa',
  );
  report(
    (() => {
      const g = gaps(both, { ...salon, staff: [person] } as typeof onlyPerson);
      return g.length === 1 && g[0]![0] === m('12:00') && g[0]![1] === m('14:00');
    })(),
    'BR-35: nếu Chủ Nhật mở cả ngày thì giờ nghỉ trưa mới là giờ không ai trực',
  );
  const away = uncoveredHours({
    fixture: onlyPerson,
    shifts: both,
    timeOff: [
      {
        id: 'o',
        resourceId: person.resourceId,
        date: sunday,
        from: '15:00',
        to: '16:00',
        reason: 'x',
        status: 'approved',
        sentAt: '2026-11-01T00:00:00Z',
      },
    ],
    date: sunday,
  });
  report(
    away.length === 1 && away[0]![0] === m('15:00') && away[0]![1] === m('16:00'),
    'BR-35: nghỉ phép đã duyệt 15:00–16:00 trong khung chiều thì báo đúng giờ đó',
  );
}

console.log(failures === 0 ? '\nTất cả đạt.' : `\n${failures} mục không đạt.`);
process.exit(failures === 0 ? 0 : 1);
