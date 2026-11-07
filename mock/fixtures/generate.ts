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
import { bookVariant, findVariant, type ItemSpec } from './bookings';
import type {
  Appointment,
  AppointmentStatus,
  Branch,
  Resource,
  ResourceBooking,
  ServedSubject,
  Service,
  Staff,
  StaffTimeOff,
} from './types';

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
  /** Staff not to use on a date (besides time off). */
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

/** Picks concrete non-staff resources for one variant starting at `start`, or null. */
export function assign(
  cfg: Pick<WeekConfig, 'services' | 'resources' | 'staffTypeId'>,
  occ: Occupancy,
  variantId: string,
  staffId: string,
  start: string,
): string[] | null {
  const variant = findVariant(cfg.services, variantId);
  const types = [...new Set(variant.segments.flatMap((s) => s.resourceTypeIds))].filter(
    (t) => t !== cfg.staffTypeId,
  );
  const ids = [staffId];
  for (const type of types) {
    const segs = variant.segments.filter((s) => s.resourceTypeIds.includes(type));
    const candidate = cfg.resources.find(
      (r) =>
        r.resourceTypeId === type &&
        segs.every((s) =>
          occ.free(
            r.id,
            Date.parse(start) + s.startMinute * MINUTE,
            Date.parse(start) + s.endMinute * MINUTE,
          ),
        ),
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
    const off = new Set([
      ...cfg.timeOff.filter((t) => t.date === date).map((t) => t.resourceId),
      ...(cfg.avoidStaff?.[date] ?? []),
    ]);
    const open = Date.parse(toUtc(date, hours.open));
    const close = Date.parse(toUtc(date, hours.close));
    let placed = already;

    for (let attempt = 0; placed < target && attempt < 400; attempt++) {
      const subject = pick(cfg.subjects);
      const service = pick(cfg.services);
      // BR-13: the variant follows the served subject.
      const variant = service.variants.find((v) =>
        Object.entries(v.match).every(([k, val]) => subject.attributes[k] === val),
      );
      if (!variant) continue;
      // BR-03: only staff with the skill.
      const staff = cfg.staff.filter(
        (s) => s.skillServiceIds.includes(service.id) && !off.has(s.resourceId),
      );
      if (!staff.length) continue;
      const length = Math.max(...variant.segments.map((s) => s.endMinute));
      const slots = Math.floor((close - open) / MINUTE / 15) - Math.ceil(length / 15);
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
      if (!occ.fits(bookings)) continue;

      const status = statusFor(date, cfg.today, rand, cfg.pastMix);
      const appt = cfg.build(
        `${cfg.idPrefix}-g${++n}`,
        subject.customerId,
        start,
        status,
        [{ variantId: variant.id, subjectId: subject.id, resourceIds: ids }],
        status === 'completed' ? { settled: true } : {},
      );
      occ.add(appt.bookings);
      out.push(appt);
      placed++;
    }
  }
  return out;
}

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
