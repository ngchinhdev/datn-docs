/*
 * Cài đặt of a shop as pure functions: the prices of a branch, the opening hours with several
 * windows a day, the appointments a change of hours leaves outside, the colour of the shop, the
 * address of the booking page. Imports types and pure modules only, so Node can run it
 * (scripts/check-shop.ts).
 */
import type {
  Appointment,
  Branch,
  BusinessHours,
  Requeue,
  Service,
  Weekday,
} from './fixtures/types.ts';
import { formatVnd } from './format.ts';
import { openingWindows, type OpenWindow } from './hours.ts';
import { normalize, subtract, type Interval } from './intervals.ts';
import { localMinutes, minutesOf } from './shifts.ts';
import { localDate } from './time.ts';

/**
 * BR-02, BR-56: a branch may price a variant on its own. The prices by staff level follow the
 * branch price in the same proportions, rounded down to whole VND; a variant without an entry
 * keeps the shared price.
 */
export function applyBranchPrices(
  services: readonly Service[],
  prices: Record<string, bigint> | undefined,
): Service[] {
  if (!prices) return [...services];
  return services.map((service) => ({
    ...service,
    variants: service.variants.map((variant) => {
      const own = prices[variant.id];
      if (own === undefined) return variant;
      const levels = variant.pricesByLevel;
      const lowest = levels?.[0] ?? variant.priceVnd;
      return {
        ...variant,
        priceVnd: own,
        ...(levels && lowest > 0n
          ? { pricesByLevel: levels.map((price) => (own * price) / lowest) }
          : {}),
      };
    }),
  }));
}

// ---- Opening hours (BR-02) ----

/** Monday first, as a week is read. */
export const WEEK: Weekday[] = [1, 2, 3, 4, 5, 6, 0];

export const WEEKDAY_NAME: Record<Weekday, string> = {
  0: 'Chủ Nhật',
  1: 'Thứ Hai',
  2: 'Thứ Ba',
  3: 'Thứ Tư',
  4: 'Thứ Năm',
  5: 'Thứ Sáu',
  6: 'Thứ Bảy',
};

export type DayHours = Record<Weekday, OpenWindow[]>;

/** The regular hours as the windows of each weekday, in time order. */
export function hoursByDay(list: readonly BusinessHours[]): DayHours {
  const days = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] } as DayHours;
  for (const h of list) days[h.weekday].push({ open: h.open, close: h.close });
  for (const w of WEEK) days[w].sort((a, b) => a.open.localeCompare(b.open));
  return days;
}

export function toBusinessHours(days: DayHours): BusinessHours[] {
  return WEEK.flatMap((weekday) =>
    days[weekday].map((w) => ({
      weekday,
      open: w.open as BusinessHours['open'],
      close: w.close as BusinessHours['close'],
    })),
  );
}

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
export const isTime = (text: string) => TIME.test(text);

/** BR-02: each window is a real time range, and the windows of one day do not overlap. */
export function windowsProblem(windows: readonly OpenWindow[]): string | null {
  for (const w of windows) {
    if (!isTime(w.open) || !isTime(w.close)) return 'Nhập giờ dạng 09:00.';
    if (w.open >= w.close) return 'Giờ đóng phải sau giờ mở.';
  }
  const sorted = [...windows].sort((a, b) => a.open.localeCompare(b.open));
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i]!.open < sorted[i - 1]!.close)
      return 'Các khung giờ không được chồng nhau (BR-02).';
  }
  return null;
}

/** `09:00–12:00, 14:00–20:00`, or `Nghỉ`. */
export const windowsText = (windows: readonly OpenWindow[]) =>
  windows.length === 0 ? 'Nghỉ' : windows.map((w) => `${w.open}–${w.close}`).join(', ');

const LIVE = new Set<Appointment['status']>(['confirmed']);

/**
 * BR-02, BR-35: the appointments still to come whose time the customer sees falls outside the
 * opening hours of `branch`; they go to "Cần xếp lại" when the change is saved.
 */
export function outsideHours(
  appointments: readonly Appointment[],
  branch: Branch,
  now: string,
): Appointment[] {
  return appointments
    .filter((a) => LIVE.has(a.status) && a.startAt >= now)
    .filter((a) => {
      const date = localDate(a.startAt);
      const open: Interval[] = normalize(
        openingWindows({ branches: [branch] }, date).map((w): Interval => [
          localMinutes(date, w.open),
          localMinutes(date, w.close),
        ]),
      );
      return a.bookings
        .filter((b) => b.kind === 'work' || b.kind === 'wait')
        .some((b) => subtract([[minutesOf(b.startAt), minutesOf(b.endAt)]], open).length > 0);
    })
    .sort((a, b) => a.startAt.localeCompare(b.startAt));
}

/**
 * One "Cần xếp lại" entry per day for appointments a change of the branch leaves without a
 * place (BR-35, BR-37). `reason` says what changed.
 */
export function branchRequeues(
  appointments: readonly Appointment[],
  input: { kind: 'hours' | 'outage'; label: string; reason: string; resourceId?: string },
  now: string,
  makeId: (n: number) => string,
): Requeue[] {
  const byDate = new Map<string, Appointment[]>();
  for (const a of appointments) {
    const date = localDate(a.startAt);
    byDate.set(date, [...(byDate.get(date) ?? []), a]);
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, list], i) => ({
      id: makeId(i),
      resourceId: input.resourceId ?? '',
      date,
      reason: input.reason,
      createdAt: now,
      appointmentIds: list.map((a) => a.id),
      handling: {},
      kind: input.kind,
      label: input.label,
      title: `${input.reason} · ${date.slice(8)}/${date.slice(5, 7)}`,
    }));
}

// ---- What a save changes (BR-63) ----

export interface BranchChange {
  /** For the bar under the form: `giờ Chủ Nhật`, `giá Nhuộm ngắn`. */
  short: string;
  /** For the audit log. */
  detail: string;
}

const sameHours = (a: readonly OpenWindow[], b: readonly OpenWindow[]) =>
  windowsText(a) === windowsText(b);

const dayMonth = (date: string) => `${date.slice(8)}/${date.slice(5, 7)}`;

/** The differences of two versions of a branch, in the order the page shows them. */
export function branchChanges(
  before: Branch,
  after: Branch,
  variantLabel: (variantId: string) => string,
  sharedPrice: (variantId: string) => bigint,
): BranchChange[] {
  const out: BranchChange[] = [];
  if (
    before.name !== after.name ||
    before.phone !== after.phone ||
    before.address !== after.address
  ) {
    const parts = [
      before.name !== after.name ? `tên ${before.name} → ${after.name}` : null,
      before.phone !== after.phone
        ? `số điện thoại ${before.phone ?? ''} → ${after.phone ?? ''}`
        : null,
      before.address !== after.address ? `địa chỉ ${before.address} → ${after.address}` : null,
    ].filter(Boolean);
    out.push({ short: 'thông tin', detail: parts.join('; ') });
  }
  const was = hoursByDay(before.businessHours);
  const now = hoursByDay(after.businessHours);
  for (const w of WEEK) {
    if (!sameHours(was[w], now[w])) {
      out.push({
        short: `giờ ${WEEKDAY_NAME[w]}`,
        detail: `${WEEKDAY_NAME[w]}: ${windowsText(was[w])} → ${windowsText(now[w])}`,
      });
    }
  }
  const text = (d: Branch['specialDays'][number]) =>
    d.hours ? `${d.hours.open}–${d.hours.close}` : 'đóng cửa';
  for (const d of after.specialDays) {
    const old = before.specialDays.find((x) => x.date === d.date);
    if (!old)
      out.push({
        short: `ngày đặc biệt ${dayMonth(d.date)}`,
        detail: `Thêm ${dayMonth(d.date)}: ${text(d)} · ${d.note}`,
      });
    else if (text(old) !== text(d) || old.note !== d.note) {
      out.push({
        short: `ngày đặc biệt ${dayMonth(d.date)}`,
        detail: `${dayMonth(d.date)}: ${text(old)} → ${text(d)} · ${d.note}`,
      });
    }
  }
  for (const d of before.specialDays) {
    if (!after.specialDays.some((x) => x.date === d.date)) {
      out.push({
        short: `ngày đặc biệt ${dayMonth(d.date)}`,
        detail: `Bỏ ${dayMonth(d.date)}: ${text(d)}`,
      });
    }
  }
  const ids = new Set([...Object.keys(before.prices ?? {}), ...Object.keys(after.prices ?? {})]);
  for (const id of ids) {
    const a = before.prices?.[id];
    const b = after.prices?.[id];
    if (a === b) continue;
    const show = (v: bigint | undefined) =>
      v === undefined ? `giá chung ${formatVnd(sharedPrice(id))}` : formatVnd(v);
    out.push({
      short: `giá ${variantLabel(id)}`,
      detail: `${variantLabel(id)}: ${show(a)} → ${show(b)}`,
    });
  }
  return out;
}
