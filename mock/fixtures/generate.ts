/*
 * Seeded generator for the mock week 02/11–08/11/2026. Same seed, same data on every run.
 * Placement keeps staff skills (BR-03) and never overlaps a resource (BR-01).
 *
 * Cases the week must show, each at least once (set up in the tenant fixture files):
 * - Tóc Mây, Chủ Nhật 08/11: Mai fully booked → customer page shows Mai faded, "Hết giờ ngày này" (BR-14).
 * - Tóc Mây, Thứ Ba 03/11: Lan off (`staffTimeOff`) → her column reads "Nghỉ".
 * - Tóc Mây, Thứ Hai 09/11: closed for maintenance (`specialDays`) → customer date struck, reception "Đóng cửa".
 * - Tóc Mây, Thứ Tư 04/11: near-empty day, 2 appointments.
 * - Tóc Mây, Thứ Năm 05/11: one appointment with gội, cắt, nhuộm back to back, with a wait.
 * - Tóc Mây, Thứ Sáu 06/11: a cancelled appointment, a customer name over 30 characters, a long note.
 * - Pawpaw, Thứ Bảy 07/11: two pets booked together, a dog over 10 kg, dryers busy during the groomer's wait.
 */
import { occupation, prepMinutes, resourceTypesOf, visibleMinutes } from '../occupation.ts';
import { bookVariant, findVariant, matchesAttributes, type ItemSpec } from './bookings.ts';
import type {
  Appointment,
  AppointmentStatus,
  Branch,
  Resource,
  ResourceBooking,
  ServedSubject,
  Service,
  Shift,
  Staff,
  StaffTimeOff,
} from './types.ts';
import type { Interval } from '../intervals.ts';
import { staffWindows } from '../shifts.ts';

/** mulberry32: tiny deterministic PRNG. */
export function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Build = (
  id: string,
  customerId: string | null,
  startAt: string,
  status: AppointmentStatus,
  items: ItemSpec[],
  extra?: Partial<Appointment>,
) => Appointment;

export interface WeekConfig {
  seed: number;
  idPrefix: string;
  branch: Branch;
  services: Service[];
  resources: Resource[];
  staff: Staff[];
  staffTypeId: string;
  subjects: ServedSubject[];
  timeOff: StaffTimeOff[];
  /** Working blocks; a date that has none means everyone works the opening hours. */
  shifts?: Shift[];
  build: Build;
  /** Local dates to fill. */
  dates: string[];
  /** Local date of "now"; earlier days get past statuses, later days only confirmed. */
  today: string;
  /** Appointments written by hand; generated ones fit around them. */
  fixed: Appointment[];
  /** Target count per date; default random 6–14. */
  counts?: Record<string, number>;
  /** Target count for dates not in `counts`; overrides the random 6–14. */
  defaultCount?: number;
  /** Share of past appointments that end as no-show and as cancelled; the rest complete. */
  pastMix?: { noShow: number; cancelled: number };
  /** Staff not to use on a date (besides time off and shifts). */
  avoidStaff?: Record<string, string[]>;
}

const MINUTE = 60_000;
const toUtc = (date: string, hhmm: string) => new Date(`${date}T${hhmm}:00+07:00`).toISOString();
const iso = (ms: number) => new Date(ms).toISOString().replace('.000Z', 'Z');

function openRange(branch: Branch, date: string) {
  const special = branch.specialDays.find((d) => d.date === date);
  if (special) return special.hours;
  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
  return branch.businessHours.find((h) => h.weekday === weekday) ?? null;
}

export class Occupancy {
  private busy: { resourceId: string; start: number; end: number }[] = [];
  add(bookings: ResourceBooking[]) {
    for (const b of bookings) {
      this.busy.push({
        resourceId: b.resourceId,
        start: Date.parse(b.startAt),
        end: Date.parse(b.endAt),
      });
    }
  }
  free(resourceId: string, start: number, end: number) {
    return !this.busy.some((b) => b.resourceId === resourceId && b.start < end && start < b.end);
  }
  fits(bookings: ResourceBooking[]) {
    return bookings.every((b) =>
      this.free(b.resourceId, Date.parse(b.startAt), Date.parse(b.endAt)),
    );
  }
}

/**
 * Picks concrete non-staff resources for one variant for a customer arriving at `start`, or null.
 * A resource is free when it is free for everything the variant holds it for, cleanup included.
 */
export function assign(
  cfg: Pick<WeekConfig, 'services' | 'resources' | 'staffTypeId'>,
  occ: Occupancy,
  variantId: string,
  staffId: string,
  start: string,
): string[] | null {
  const variant = findVariant(cfg.services, variantId);
  const origin = Date.parse(start) - prepMinutes(variant) * MINUTE;
  const ids = [staffId];
  for (const type of resourceTypesOf(variant)) {
    if (type === cfg.staffTypeId) continue;
    const held = occupation(variant, type);
    const candidate = cfg.resources.find(
      (r) =>
        r.resourceTypeId === type &&
        held.every(([from, to]) => occ.free(r.id, origin + from * MINUTE, origin + to * MINUTE)),
    );
    if (!candidate) return null;
    ids.push(candidate.id);
  }
  return ids;
}

export function generateWeek(cfg: WeekConfig): Appointment[] {
  const rand = seeded(cfg.seed);
  const pick = <T>(xs: T[]) => xs[Math.floor(rand() * xs.length)]!;
  const occ = new Occupancy();
  for (const a of cfg.fixed) occ.add(a.bookings);
  const out: Appointment[] = [];
  let n = 0;

  for (const date of cfg.dates) {
    const hours = openRange(cfg.branch, date);
    if (!hours) continue;
    const target = cfg.counts?.[date] ?? cfg.defaultCount ?? 6 + Math.floor(rand() * 9);
    const already = cfg.fixed.filter((a) => toLocal(a.startAt) === date).length;
    const open = Date.parse(toUtc(date, hours.open));
    const close = Date.parse(toUtc(date, hours.close));
    // BR-35, BR-54: staff work their shifts (or the opening hours on a day with no rota), minus leave.
    const windows = new Map(
      cfg.staff.map((s) => [
        s.resourceId,
        staffWindows({
          shifts: cfg.shifts ?? [],
          timeOff: cfg.timeOff,
          resourceId: s.resourceId,
          date,
          open: [[open / MINUTE, close / MINUTE]],
        }),
      ]),
    );
    const off = new Set([
      ...cfg.staff
        .filter((s) => (windows.get(s.resourceId) ?? []).length === 0)
        .map((s) => s.resourceId),
      ...(cfg.avoidStaff?.[date] ?? []),
    ]);
    let placed = already;

    for (let attempt = 0; placed < target && attempt < 400; attempt++) {
      const subject = pick(cfg.subjects);
      const service = pick(cfg.services);
      // BR-55: the customer picks the variant, or it follows the served subject (BR-13).
      const variant =
        service.variantSelection === 'customer'
          ? pick(service.variants)
          : service.variants.find((v) => matchesAttributes(v.match, subject.attributes));
      if (!variant) continue;
      // BR-03: only staff with the skill.
      const staff = cfg.staff.filter(
        (s) => s.skillServiceIds.includes(service.id) && !off.has(s.resourceId),
      );
      if (!staff.length) continue;
      const slots =
        Math.floor((close - open) / MINUTE / 15) - Math.ceil(visibleMinutes(variant) / 15);
      if (slots < 0) continue;
      const start = iso(open + Math.floor(rand() * (slots + 1)) * 15 * MINUTE);
      const staffId = pick(staff).resourceId;
      const ids = assign(cfg, occ, variant.id, staffId, start);
      if (!ids) continue;
      const bookings = bookVariant(
        start,
        variant,
        Object.fromEntries(ids.map((id) => [typeOf(cfg, id), id])),
      );
      // BR-54: other resources stay inside opening hours, cleanup included; staff stay in their shifts.
      const staffTypeId = cfg.staffTypeId;
      const insideHours = bookings.every((b) =>
        typeOf(cfg, b.resourceId) === staffTypeId
          ? within(b, windows.get(b.resourceId) ?? [])
          : inside(b, open, close),
      );
      if (!occ.fits(bookings) || !insideHours) continue;

      const status = statusFor(date, cfg.today, rand, cfg.pastMix);
      // Every third generated appointment names its person (BR-31); no random draw, so the
      // other choices stay where they were.
      const staffChoice = ++n % 3 === 0 ? 'chosen' : 'any';
      const appt = cfg.build(
        `${cfg.idPrefix}-g${n}`,
        subject.customerId,
        start,
        status,
        [{ variantId: variant.id, subjectId: subject.id, resourceIds: ids, staffChoice }],
        status === 'completed' ? { settled: true } : {},
      );
      occ.add(appt.bookings);
      out.push(appt);
      placed++;
    }
  }
  return out;
}

const inside = (b: ResourceBooking, open: number, close: number) =>
  Date.parse(b.startAt) >= open && Date.parse(b.endAt) <= close;

/** The booking lies inside one window (minutes since the epoch). */
const within = (b: ResourceBooking, windows: readonly Interval[]) => {
  const start = Date.parse(b.startAt) / MINUTE;
  const end = Date.parse(b.endAt) / MINUTE;
  return windows.some(([from, to]) => from <= start && end <= to);
};

function typeOf(cfg: Pick<WeekConfig, 'resources'>, id: string) {
  return cfg.resources.find((r) => r.id === id)?.resourceTypeId ?? '';
}

function toLocal(utc: string) {
  return new Date(Date.parse(utc) + 7 * 60 * MINUTE).toISOString().slice(0, 10);
}

function statusFor(
  date: string,
  today: string,
  rand: () => number,
  mix: { noShow: number; cancelled: number } = { noShow: 0.12, cancelled: 0.12 },
): AppointmentStatus {
  if (date >= today) return 'confirmed';
  const r = rand();
  if (r < 1 - mix.noShow - mix.cancelled) return 'completed';
  return r < 1 - mix.cancelled ? 'no_show' : 'cancelled';
}

/** Every local date from `from` to `to`, both included. */
export function dateRange(from: string, to: string): string[] {
  const out: string[] = [];
  for (
    let t = Date.parse(`${from}T00:00:00Z`);
    t <= Date.parse(`${to}T00:00:00Z`);
    t += 86_400_000
  ) {
    out.push(new Date(t).toISOString().slice(0, 10));
  }
  return out;
}
