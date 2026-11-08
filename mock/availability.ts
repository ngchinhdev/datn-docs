/*
 * Free-slot finder after content/docs/ky-thuat/thuat-toan-gio-trong.md, sections 2 to 3.
 * `findSlots` is pure and works in whole minutes since the Unix epoch (UTC); `freeSlots` builds its
 * input from a tenant fixture. The real one lives in datn-saas/packages/scheduling-core.
 * Imports only types and pure modules, so Node can run it (scripts/check-availability.ts).
 */
import { openingHours } from './hours.ts';
import {
  contains,
  fit,
  intersect,
  length,
  normalize,
  subtract,
  union,
  type Interval,
} from './intervals.ts';
import { ANY_STAFF, occupation, prepMinutes, resourceTypesOf, visibleRange } from './occupation.ts';
import type { Appointment, ServiceVariant, TenantFixture } from './fixtures/types.ts';

export { ANY_STAFF };

/** A resource that may serve the item: right type, skill, online, the person asked for. */
export interface CoreResource {
  id: string;
  typeId: string;
  isStaff: boolean;
  /** Staff pay level, 1 the lowest; used to assign "Bất kỳ ai" (BR-57). */
  level: number;
  /** Available time minus active bookings and holds that have not expired (BR-07). */
  free: Interval[];
  /** Minutes already booked that day, to split ties (BR-57). */
  busyToday: number;
}

export interface FindSlotsInput {
  variant: Pick<ServiceVariant, 'segments' | 'cleanupMinutes'>;
  /** Opening hours of the day (BR-02). */
  open: Interval[];
  /** Resources of every type the variant uses. Order is the order of the list (BR-57). */
  resources: CoreResource[];
  /** Local midnight; the grid counts from here. */
  dayStart: number;
  dayEnd: number;
  /** Grid step in minutes (BR-58). */
  step: number;
  /** Earliest and latest time the customer may start (BR-06). */
  notBefore: number;
  notAfter: number;
}

export interface Slot {
  /** Minute the customer arrives. */
  start: number;
  /** Resource id per resource type. */
  assignment: Record<string, string>;
}

/** BR-57: lowest staff level first, then the least busy, then list order; other types by list. */
export function pick(candidates: readonly CoreResource[]): CoreResource | undefined {
  return candidates
    .map((r, index) => ({ r, index }))
    .sort(
      (a, b) =>
        (a.r.isStaff ? a.r.level - b.r.level : 0) ||
        (a.r.isStaff ? a.r.busyToday - b.r.busyToday : 0) ||
        a.index - b.index,
    )[0]?.r;
}

export function findSlots(input: FindSlotsInput): Slot[] {
  const { variant, open, resources } = input;
  const [visStart, visEnd] = visibleRange(variant);
  const prep = prepMinutes(variant);

  // 1. The visible part sits inside opening hours. Origins are minutes of the first segment.
  let origins = fit(open, [[visStart, visEnd]]);

  // 2. Each resource type on its own: some resource of the type fits every interval it is held.
  const fits = new Map<string, Interval[]>();
  const candidates = new Map<string, CoreResource[]>();
  for (const typeId of resourceTypesOf(variant)) {
    const held = occupation(variant, typeId);
    const ofType = resources.filter((r) => r.typeId === typeId);
    candidates.set(typeId, ofType);
    let any: Interval[] = [];
    for (const r of ofType) {
      const f = fit(r.free, held);
      fits.set(r.id, f);
      any = union(any, f);
    }
    origins = intersect(origins, any);
    if (origins.length === 0) return [];
  }

  // 3. Booking policy, as origins: arrive at T means origin T - prep.
  origins = intersect(origins, [[input.notBefore - prep, input.notAfter - prep + 1]]);

  // 4. Local grid.
  const slots: Slot[] = [];
  for (let t = input.dayStart; t < input.dayEnd; t += input.step) {
    const origin = t - prep;
    if (!contains(origins, origin)) continue;
    const assignment: Record<string, string> = {};
    for (const [typeId, ofType] of candidates) {
      const chosen = pick(ofType.filter((r) => contains(fits.get(r.id) ?? [], origin)));
      if (chosen) assignment[typeId] = chosen.id;
    }
    slots.push({ start: t, assignment });
  }
  return slots;
}

export interface FreeSlot {
  /** ISO 8601, UTC: when the customer arrives. */
  startAt: string;
  /** The staff member assigned. */
  staffResourceId: string;
  /** Resource id per resource type. */
  assignment: Record<string, string>;
}

export interface AvailabilityQuery {
  fixture: TenantFixture;
  variant: ServiceVariant;
  serviceId: string;
  /** Local date in the branch time zone, `YYYY-MM-DD`. */
  date: string;
  /** `ANY_STAFF` or a staff resource id. */
  staffResourceId: string;
  /** Slots before this instant are dropped. ISO 8601, UTC. */
  notBefore?: string;
  /** Slots after this instant are dropped. ISO 8601, UTC. */
  notAfter?: string;
  /** Holds that ran out by this instant do not block (BR-07); defaults to `notBefore`. */
  now?: string;
}

const STEP_MINUTES = 15;
const BLOCKING: Appointment['status'][] = ['held', 'confirmed', 'checked_in', 'completed'];
/** Fixed offset is enough for Asia/Ho_Chi_Minh, which has no DST. */
const BRANCH_UTC_OFFSET_MINUTES = 7 * 60;

const minutesOf = (iso: string) => Date.parse(iso) / 60_000;
const isoOf = (minutes: number) => new Date(minutes * 60_000).toISOString();
const localMinutes = (date: string, time: string) =>
  minutesOf(`${date}T${time}:00Z`) - BRANCH_UTC_OFFSET_MINUTES;

/**
 * Free start times for one item on one day. Staff work during opening hours (the fixtures have no
 * shifts); a person on leave that day is out. With `ANY_STAFF`, each time carries the person
 * `pick` chooses.
 */
export function freeSlots(query: AvailabilityQuery): FreeSlot[] {
  const { fixture, variant, date } = query;
  const hours = openingHours(fixture, date);
  if (!hours) return [];

  const open: Interval[] = [[localMinutes(date, hours.open), localMinutes(date, hours.close)]];
  const dayStart = localMinutes(date, '00:00');
  const dayEnd = dayStart + 1440;
  const now = minutesOf(query.now ?? query.notBefore ?? isoOf(0));

  const busy = new Map<string, Interval[]>();
  for (const appt of fixture.appointments) {
    if (!BLOCKING.includes(appt.status)) continue;
    if (appt.status === 'held' && appt.holdExpiresAt && minutesOf(appt.holdExpiresAt) <= now) {
      continue;
    }
    for (const b of appt.bookings) {
      const list = busy.get(b.resourceId) ?? [];
      list.push([minutesOf(b.startAt), minutesOf(b.endAt)]);
      busy.set(b.resourceId, list);
    }
  }

  const staffTypeIds = new Set(fixture.resourceTypes.filter((t) => t.isStaff).map((t) => t.id));
  const typeIds = new Set(resourceTypesOf(variant));
  const resources: CoreResource[] = [];
  for (const r of fixture.resources) {
    if (!typeIds.has(r.resourceTypeId)) continue;
    const isStaff = staffTypeIds.has(r.resourceTypeId);
    const member = fixture.staff.find((s) => s.resourceId === r.id);
    if (isStaff) {
      const ok =
        member &&
        member.profile.bookableOnline &&
        member.skillServiceIds.includes(query.serviceId) &&
        !fixture.staffTimeOff.some((t) => t.resourceId === r.id && t.date === date) &&
        (query.staffResourceId === ANY_STAFF || r.id === query.staffResourceId);
      if (!ok) continue;
    }
    const mine = normalize(busy.get(r.id) ?? []);
    resources.push({
      id: r.id,
      typeId: r.resourceTypeId,
      isStaff,
      level: member?.level ?? 1,
      free: subtract(open, mine),
      busyToday: length(intersect(mine, [[dayStart, dayEnd]])),
    });
  }

  const staffTypeId = [...typeIds].find((t) => staffTypeIds.has(t)) ?? '';
  return findSlots({
    variant,
    open,
    resources,
    dayStart,
    dayEnd,
    step: STEP_MINUTES,
    notBefore: query.notBefore ? minutesOf(query.notBefore) : -Infinity,
    notAfter: query.notAfter ? minutesOf(query.notAfter) : Infinity,
  }).map((slot) => ({
    startAt: isoOf(slot.start),
    staffResourceId: slot.assignment[staffTypeId] ?? '',
    assignment: slot.assignment,
  }));
}
