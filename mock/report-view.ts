/*
 * What the Báo cáo screen (MH-55) shows for a choice of days: the range and the one it is compared
 * with, the five figures, the tables, and the CSV of the same numbers. Pure, so Node can run it
 * (scripts/check-reports.ts).
 */
import { formatPercentTenths, formatVnd } from './format.ts';
import {
  byDay,
  byService,
  byStaff,
  cashIn,
  changePercent,
  changePoints,
  noShows,
  occupancy,
  prepaidHeld,
  previousRange,
  revenueRealised,
  sameDaysLastMonth,
  type DateRange,
  type DayRow,
  type NoShows,
  type PrepaidHeld,
  type ReportInput,
  type ServiceRow,
  type StaffRow,
} from './reports.ts';
import { addDays } from './time.ts';

export type RangeKind = 'today' | '7' | 'month' | 'custom';

/** `01/11/2026`. */
const full = (date: string) => `${date.slice(8, 10)}/${date.slice(5, 7)}/${date.slice(0, 4)}`;
const short = (date: string) => `${date.slice(8, 10)}/${date.slice(5, 7)}`;

/**
 * The range for a choice and the one it is compared with: today with yesterday, 7 days with the 7
 * before, the month so far with the same days of the month before, a custom range with the stretch
 * of the same length before it.
 */
export function chooseRange(
  kind: RangeKind,
  today: string,
  custom?: { from?: string | undefined; to?: string | undefined },
): { range: DateRange; previous: DateRange } {
  let range: DateRange;
  if (kind === 'today') range = { from: today, to: today };
  else if (kind === '7') range = { from: addDays(today, -6), to: today };
  else if (kind === 'month') range = { from: `${today.slice(0, 7)}-01`, to: today };
  else {
    const from =
      custom?.from && /^\d{4}-\d{2}-\d{2}$/.test(custom.from) ? custom.from : addDays(today, -6);
    const to = custom?.to && /^\d{4}-\d{2}-\d{2}$/.test(custom.to) ? custom.to : today;
    range = from <= to ? { from, to } : { from: to, to: from };
  }
  return { range, previous: kind === 'month' ? sameDaysLastMonth(range) : previousRange(range) };
}

/** `01/11 – 07/11/2026`, or one date for one day. */
export const rangeText = (range: DateRange) =>
  range.from === range.to
    ? full(range.from)
    : range.from.slice(0, 4) === range.to.slice(0, 4)
      ? `${short(range.from)} – ${full(range.to)}`
      : `${full(range.from)} – ${full(range.to)}`;

/** `01/10 – 07/10`: the range it is compared with. */
export const compareText = (range: DateRange) =>
  range.from === range.to ? short(range.from) : `${short(range.from)} – ${short(range.to)}`;

export interface Figures {
  revenueVnd: bigint;
  revenueChange: number | null;
  cash: { totalVnd: bigint; prepaidVnd: bigint };
  held: PrepaidHeld;
  fill: { percent: number | null; points: number | null };
  noShows: NoShows;
}

/** The five figures of the top of the screen. */
export function figures(input: ReportInput, range: DateRange, previous: DateRange): Figures {
  const revenue = revenueRealised(input, range);
  const before = revenueRealised(input, previous);
  const fill = occupancy(input, range).percent;
  return {
    revenueVnd: revenue,
    revenueChange: changePercent(revenue, before),
    cash: cashIn(input, range),
    held: prepaidHeld(input, range.to),
    fill: { percent: fill, points: changePoints(fill, occupancy(input, previous).percent) },
    noShows: noShows(input, range),
  };
}

export interface ReportData {
  figures: Figures;
  days: DayRow[];
  staff: StaffRow[];
  services: ServiceRow[];
}

export function reportData(input: ReportInput, range: DateRange, previous: DateRange): ReportData {
  return {
    figures: figures(input, range, previous),
    days: byDay(input, range),
    staff: byStaff(input, range),
    services: byService(input, range),
  };
}

const cell = (value: string | number | bigint) => {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

/** The numbers of the screen as CSV: whole VND, rates in percent; a byte-order mark opens it in Excel. */
export function reportCsv(args: {
  branchName: string;
  range: DateRange;
  data: ReportData;
  nameOf: (resourceId: string) => string;
}): string {
  const { data, range } = args;
  const f = data.figures;
  const rows: (string | number | bigint)[][] = [
    ['Báo cáo', args.branchName],
    ['Khoảng ngày', `${full(range.from)} – ${full(range.to)}`],
    [],
    ['Chỉ số', 'Giá trị'],
    ['Doanh thu thực hiện (₫)', f.revenueVnd],
    ['Tiền thu vào (₫)', f.cash.totalVnd],
    ['Tiền trả trước còn giữ (₫)', f.held.totalVnd],
    ['Lấp đầy (%)', f.fill.percent ?? ''],
    ['Không đến', f.noShows.noShow],
    ['Lịch đã tới giờ', f.noShows.due],
    [],
    ['Theo ngày'],
    ['Ngày', 'Doanh thu thực hiện (₫)', 'Tiền thu vào (₫)'],
    ...data.days.map((d) => [full(d.date), d.revenueVnd, d.cashInVnd]),
    [],
    ['Theo nhân viên'],
    [
      'Nhân viên',
      'Lịch',
      'Doanh thu thực hiện (₫)',
      'Lấp đầy (%)',
      'Không đến',
      'Hoa hồng tạm tính (₫)',
    ],
    ...data.staff.map((s) => [
      s.staffResourceId ? args.nameOf(s.staffResourceId) : 'Không gắn ai',
      s.appointments,
      s.revenueVnd,
      s.occupancyPercent ?? '',
      s.noShows,
      s.commissionVnd,
    ]),
    [],
    ['Theo dịch vụ'],
    ['Dịch vụ', 'Lượt', 'Doanh thu thực hiện (₫)', 'Phần trăm'],
    ...data.services.map((s) => [s.label, s.count, s.revenueVnd, s.percent]),
  ];
  return `\uFEFF${rows.map((r) => r.map(cell).join(',')).join('\r\n')}\r\n`;
}

/** `5 / 119` and its line: `4,2% · mất 600.000 ₫, giữ 150.000 ₫ cọc`. */
export function noShowNote(n: NoShows): string {
  if (n.rateTenths === null) return 'Chưa có lịch đến giờ';
  const kept = n.depositKeptVnd > 0n ? `, giữ ${formatVnd(n.depositKeptVnd)} cọc` : '';
  return `${formatPercentTenths(n.rateTenths)} · mất ${formatVnd(n.lostVnd)}${kept}`;
}
