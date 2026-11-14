/*
 * The numbers of the reports (BR-45, BR-46, BR-47): revenue realised, money taken in, prepaid money
 * still held, occupancy, no-shows, by day, by person, by service. Pure; imports types and pure
 * modules only, so Node can run it (scripts/check-reports.ts). Every amount is a `bigint`.
 */
import type {
  Appointment,
  Invoice,
  MoneyState,
  Service,
  Shift,
  StaffTimeOff,
  TenantFixture,
} from './fixtures/types.ts';
import { serviceIdOfVariant } from './commission.ts';
import { normalize, type Interval } from './intervals.ts';
import { discountAmount, lineAmount, netByLine } from './money.ts';
import { openIntervals } from './rota.ts';
import { staffWindows } from './shifts.ts';
import { addDays, localDate } from './time.ts';

/** Local dates `YYYY-MM-DD`, both included. */
export interface DateRange {
  from: string;
  to: string;
}

export interface ReportInput {
  fixture: Pick<TenantFixture, 'branches' | 'staff' | 'config'>;
  services: readonly Service[];
  money: MoneyState;
  appointments: readonly Appointment[];
  shifts: readonly Shift[];
  timeOff: readonly StaffTimeOff[];
  /** ISO 8601, UTC. */
  now: string;
}

/** Every local date of the range. */
export function daysOf(range: DateRange): string[] {
  const out: string[] = [];
  for (let d = range.from; d <= range.to; d = addDays(d, 1)) out.push(d);
  return out;
}

const inRange = (iso: string, range: DateRange) => {
  const day = localDate(iso);
  return day >= range.from && day <= range.to;
};

/** The same days of the month before, cut to its length: 01–07/11 against 01–07/10. */
export function sameDaysLastMonth(range: DateRange): DateRange {
  const shift = (date: string) => {
    const [y, m, d] = date.split('-').map(Number) as [number, number, number];
    const month = m === 1 ? 12 : m - 1;
    const year = m === 1 ? y - 1 : y;
    const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
    return `${year}-${String(month).padStart(2, '0')}-${String(Math.min(d, last)).padStart(2, '0')}`;
  };
  return { from: shift(range.from), to: shift(range.to) };
}

/** The stretch of the same length right before the range. */
export function previousRange(range: DateRange): DateRange {
  const length = daysOf(range).length;
  return { from: addDays(range.from, -length), to: addDays(range.from, -1) };
}

// --- Revenue realised (BR-45) -----------------------------------------------------------------

export interface RevenueItem {
  /** Local date. */
  date: string;
  /** `null` when no person is on the line (a retail line without a seller). */
  staffResourceId: string | null;
  /** Service name, or `Bán lẻ`. */
  label: string;
  /** Signed: a refund is negative. */
  amountVnd: bigint;
  /** Lines counted: 1 for a sold line, 0 for a refund. */
  count: number;
}

export const RETAIL_LABEL = 'Bán lẻ';

const serviceName = (services: readonly Service[], variantId: string | undefined) =>
  services.find((s) => s.id === serviceIdOfVariant(services, variantId))?.name ?? 'Dịch vụ';

/**
 * BR-45: service and retail lines of invoices collected in the range, after the discount, plus the
 * revenue of package sessions used; minus what refunds approved in the range give back for those
 * lines. A package sold and a wallet top-up are prepaid money, not revenue (BR-46).
 */
export function revenueItems(input: ReportInput, range: DateRange): RevenueItem[] {
  const { money, services } = input;
  const out: RevenueItem[] = [];
  const labelOf = (line: { kind: string; serviceVariantId?: string | undefined }) =>
    line.kind === 'retail' ? RETAIL_LABEL : serviceName(services, line.serviceVariantId);

  for (const invoice of money.invoices) {
    if (!invoice.paidAt || !inRange(invoice.paidAt, range)) continue;
    const discount = discountOf(invoice);
    for (const { line, net } of netByLine(invoice.lines, discount)) {
      if (line.kind !== 'service' && line.kind !== 'retail') continue;
      const amount = line.packageId ? (line.sessionRevenueVnd ?? 0n) : net;
      out.push({
        date: localDate(invoice.paidAt),
        staffResourceId: line.staffResourceId ?? null,
        label: labelOf(line),
        amountVnd: amount,
        count: 1,
      });
    }
  }

  for (const refund of money.refunds) {
    if (refund.status !== 'approved' || !refund.decidedAt || !inRange(refund.decidedAt, range)) {
      continue;
    }
    if (refund.packageId) continue;
    const invoice = money.invoices.find((i) => i.id === refund.invoiceId);
    if (!invoice) continue;
    const date = localDate(refund.decidedAt);
    const line = invoice.lines.find((l) => l.id === refund.lineId);
    const give = (l: typeof line, amount: bigint) => {
      if (!l || amount <= 0n || (l.kind !== 'service' && l.kind !== 'retail')) return;
      out.push({
        date,
        staffResourceId: l.staffResourceId ?? null,
        label: labelOf(l),
        amountVnd: -amount,
        count: 0,
      });
    };
    if (refund.amountVnd > 0n) {
      if (line) give(line, refund.amountVnd);
      else {
        const shares = netByLine(invoice.lines, discountOf(invoice)).filter(
          (s) => s.net > 0n && (s.line.kind === 'service' || s.line.kind === 'retail'),
        );
        const total = shares.reduce((m, s) => m + s.net, 0n);
        for (const s of shares) give(s.line, (refund.amountVnd * s.net) / total);
      }
    }
    if (refund.returnSession && line?.sessionRevenueVnd) give(line, line.sessionRevenueVnd);
  }
  return out;
}

function discountOf(invoice: Invoice) {
  const net = invoice.lines.reduce((m, l) => m + lineAmount(l), 0n);
  return discountAmount(invoice.discount, net);
}

const sumItems = (items: readonly RevenueItem[]) => items.reduce((m, i) => m + i.amountVnd, 0n);

/** BR-45: the revenue realised in the range. */
export const revenueRealised = (input: ReportInput, range: DateRange) =>
  sumItems(revenueItems(input, range));

// --- Money taken in and prepaid (BR-46) -------------------------------------------------------

export interface CashIn {
  /** Money in by cash, transfer, card and gateway, less what was paid back out. */
  totalVnd: bigint;
  /** Of what came in: packages sold, wallets topped up, deposits. */
  prepaidVnd: bigint;
}

/**
 * BR-46: every payment that arrived in the range, wallet and package sessions excluded, less the
 * refunds paid out in the range. A refund back to a wallet is not money out.
 */
export function cashIn(input: ReportInput, range: DateRange): CashIn {
  const { money } = input;
  let total = 0n;
  let prepaid = 0n;
  for (const p of money.payments) {
    if (p.status !== 'paid' || p.method === 'wallet' || !inRange(p.at, range)) continue;
    total += p.amountVnd;
    if (p.purpose === 'deposit') prepaid += p.amountVnd;
  }
  for (const invoice of money.invoices) {
    if (!invoice.paidAt || !inRange(invoice.paidAt, range)) continue;
    for (const line of invoice.lines) {
      if (line.kind === 'package_sale' || line.kind === 'wallet_topup') {
        prepaid += BigInt(line.quantity) * line.unitPriceVnd;
      }
    }
  }
  for (const r of money.refunds) {
    if (r.method === 'wallet') continue;
    if (r.status !== 'approved' && r.status !== 'auto') continue;
    const when = r.status === 'auto' ? r.createdAt : r.decidedAt;
    if (!when || !inRange(when, range)) continue;
    total -= r.amountVnd;
  }
  return { totalVnd: total, prepaidVnd: prepaid };
}

export interface PrepaidHeld {
  /** Revenue of the package sessions not used yet. */
  packagesVnd: bigint;
  /** Real money in wallets; bonus is not counted. */
  walletVnd: bigint;
  totalVnd: bigint;
}

/** BR-46: what the shop still owes in service at the end of `date`. */
export function prepaidHeld(input: ReportInput, date: string): PrepaidHeld {
  const { money } = input;
  const upTo = (iso: string) => localDate(iso) <= date;
  let packages = 0n;
  for (const invoice of money.invoices) {
    if (!invoice.paidAt || !upTo(invoice.paidAt)) continue;
    for (const line of invoice.lines) {
      if (line.kind === 'package_sale') packages += BigInt(line.quantity) * line.unitPriceVnd;
      if (line.packageId && line.sessionRevenueVnd) packages -= line.sessionRevenueVnd;
    }
  }
  for (const r of money.refunds) {
    if (r.status !== 'approved' || !r.decidedAt || !upTo(r.decidedAt)) continue;
    if (r.packageId) packages -= r.amountVnd;
    if (r.returnSession) {
      const line = money.invoices
        .find((i) => i.id === r.invoiceId)
        ?.lines.find((l) => l.id === r.lineId);
      packages += line?.sessionRevenueVnd ?? 0n;
    }
  }
  let wallet = 0n;
  for (const e of money.walletEntries) if (upTo(e.at)) wallet += e.realVnd;
  if (packages < 0n) packages = 0n;
  return { packagesVnd: packages, walletVnd: wallet, totalVnd: packages + wallet };
}

// --- Occupancy and no-shows (BR-47) -----------------------------------------------------------

export interface Occupancy {
  busyMinutes: number;
  shiftMinutes: number;
  /** Whole percent; `null` when nobody was on shift. */
  percent: number | null;
}

const minutesIn = (list: readonly Interval[]) => list.reduce((m, [s, e]) => m + (e - s), 0);

/** The minutes a person is on shift on a date, leave that was approved taken off (BR-47). */
export function shiftMinutes(input: ReportInput, staffResourceId: string, date: string): number {
  const open = openIntervals(input.fixture, date);
  if (open.length === 0) return 0;
  return minutesIn(
    staffWindows({
      shifts: input.shifts,
      timeOff: input.timeOff.filter((t) => t.status === 'approved'),
      resourceId: staffResourceId,
      date,
      open,
    }),
  );
}

/** BR-47: minutes of prep and work for customers (waiting does not count) of appointments not cancelled. */
export function busyMinutes(input: ReportInput, staffResourceId: string, date: string): number {
  let total = 0;
  for (const appt of input.appointments) {
    if (appt.status === 'cancelled' || appt.status === 'held') continue;
    const mine: Interval[] = appt.bookings
      .filter(
        (b) =>
          b.resourceId === staffResourceId &&
          (b.kind === 'prep' || b.kind === 'work') &&
          localDate(b.startAt) === date,
      )
      .map((b): Interval => [Date.parse(b.startAt) / 60_000, Date.parse(b.endAt) / 60_000]);
    total += minutesIn(normalize(mine));
  }
  return total;
}

const percentOf = (part: number, whole: number) =>
  whole > 0 ? Math.round((part / whole) * 100) : null;

/** BR-47: busy minutes over minutes on shift, for some people over some days. */
export function occupancy(
  input: ReportInput,
  range: DateRange,
  staffIds: readonly string[] = input.fixture.staff.map((s) => s.resourceId),
): Occupancy {
  let busy = 0;
  let shift = 0;
  for (const date of daysOf(range)) {
    for (const id of staffIds) {
      shift += shiftMinutes(input, id, date);
      busy += busyMinutes(input, id, date);
    }
  }
  return { busyMinutes: busy, shiftMinutes: shift, percent: percentOf(busy, shift) };
}

export interface NoShows {
  noShow: number;
  /** Appointments that came due and were not cancelled. */
  due: number;
  /** Tenths of a percent: `42` is 4,2%. */
  rateTenths: number | null;
  /** What the lost appointments were worth at their booked price. */
  lostVnd: bigint;
  /** The part of their deposits the shop kept (BR-23). */
  depositKeptVnd: bigint;
}

/** BR-47: appointments "không đến" over appointments due, with what was lost and kept. */
export function noShows(input: ReportInput, range: DateRange): NoShows {
  let due = 0;
  let noShow = 0;
  let lost = 0n;
  let kept = 0n;
  for (const appt of input.appointments) {
    if (appt.status === 'cancelled' || appt.status === 'held') continue;
    if (!inRange(appt.startAt, range) || appt.startAt > input.now) continue;
    due++;
    if (appt.status !== 'no_show') continue;
    noShow++;
    lost += appt.items.reduce((m, i) => m + i.priceVnd, 0n);
    const deposit = appt.depositVnd ?? 0n;
    if (deposit > 0n) {
      const refunded = (appt.terms?.refund ?? input.fixture.config.refundTiers).under4;
      kept += (deposit * BigInt(100 - refunded)) / 100n;
    }
  }
  return {
    noShow,
    due,
    rateTenths: due > 0 ? Math.round((noShow / due) * 1000) : null,
    lostVnd: lost,
    depositKeptVnd: kept,
  };
}

// --- Breakdowns -------------------------------------------------------------------------------

export interface DayRow {
  date: string;
  revenueVnd: bigint;
  cashInVnd: bigint;
}

/** Revenue realised and money taken in, one row per day. */
export function byDay(input: ReportInput, range: DateRange): DayRow[] {
  const items = revenueItems(input, range);
  return daysOf(range).map((date) => ({
    date,
    revenueVnd: sumItems(items.filter((i) => i.date === date)),
    cashInVnd: cashIn(input, { from: date, to: date }).totalVnd,
  }));
}

export interface StaffRow {
  /** `null`: lines with no person on them. */
  staffResourceId: string | null;
  appointments: number;
  revenueVnd: bigint;
  occupancyPercent: number | null;
  noShows: number;
  /** Commission posted in the range, clawbacks off (BR-44). */
  commissionVnd: bigint;
}

/** One row per member of staff, and one for revenue that has no person. */
export function byStaff(input: ReportInput, range: DateRange): StaffRow[] {
  const items = revenueItems(input, range);
  const rows: StaffRow[] = input.fixture.staff.map((s) => {
    const id = s.resourceId;
    const mine = input.appointments.filter(
      (a) =>
        a.status !== 'cancelled' &&
        a.status !== 'held' &&
        inRange(a.startAt, range) &&
        a.items.some((i) => i.staffResourceId === id),
    );
    return {
      staffResourceId: id,
      appointments: mine.length,
      revenueVnd: sumItems(items.filter((i) => i.staffResourceId === id)),
      occupancyPercent: occupancy(input, range, [id]).percent,
      noShows: mine.filter((a) => a.status === 'no_show' && a.startAt <= input.now).length,
      commissionVnd: input.money.commission
        .filter((c) => c.staffResourceId === id && inRange(c.at, range))
        .reduce((m, c) => m + c.amountVnd, 0n),
    };
  });
  const loose = sumItems(items.filter((i) => i.staffResourceId === null));
  if (loose !== 0n) {
    rows.push({
      staffResourceId: null,
      appointments: 0,
      revenueVnd: loose,
      occupancyPercent: null,
      noShows: 0,
      commissionVnd: 0n,
    });
  }
  return rows;
}

export interface ServiceRow {
  label: string;
  count: number;
  revenueVnd: bigint;
  /** Whole percent of all revenue realised. */
  percent: number;
}

/** One row per service and one for retail, biggest first; package sessions count with their service. */
export function byService(input: ReportInput, range: DateRange): ServiceRow[] {
  const items = revenueItems(input, range);
  const total = sumItems(items);
  const map = new Map<string, { count: number; revenueVnd: bigint }>();
  for (const i of items) {
    const row = map.get(i.label) ?? { count: 0, revenueVnd: 0n };
    row.count += i.count;
    row.revenueVnd += i.amountVnd;
    map.set(i.label, row);
  }
  return [...map.entries()]
    .map(([label, r]) => ({
      label,
      count: r.count,
      revenueVnd: r.revenueVnd,
      percent: total > 0n ? Number((r.revenueVnd * 100n) / total) : 0,
    }))
    .sort((a, b) => (a.revenueVnd < b.revenueVnd ? 1 : a.revenueVnd > b.revenueVnd ? -1 : 0));
}

// --- Comparison -------------------------------------------------------------------------------

/** Change against the earlier number, in whole percent; `null` when there is nothing to compare. */
export function changePercent(now: bigint, before: bigint): number | null {
  if (before <= 0n) return null;
  return Number(((now - before) * 100n) / before);
}

/** The rate of two ranges in points: `-3` is three points lower. */
export const changePoints = (now: number | null, before: number | null) =>
  now === null || before === null ? null : now - before;

/** Occupancy of each future day, over every person on shift; `closed` when the branch is shut. */
export function forecast(
  input: ReportInput,
  from: string,
  days: number,
): { date: string; closed: boolean; percent: number | null }[] {
  return Array.from({ length: days }, (_, i) => {
    const date = addDays(from, i);
    const closed = openIntervals(input.fixture, date).length === 0;
    const range = { from: date, to: date };
    return { date, closed, percent: closed ? null : occupancy(input, range).percent };
  });
}
