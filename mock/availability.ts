/*
 * Free-slot finder after content/docs/ky-thuat/thuat-toan-gio-trong.md, sections 2 to 3.
 * `findSlots` is pure and works in whole minutes since the Unix epoch (UTC); `freeSlots` builds its
 * input from a tenant fixture. The real one lives in datn-saas/packages/scheduling-core.
 * Imports only types and pure modules, so Node can run it (scripts/check-availability.ts).
 */
import { openingWindows } from './hours.ts';
import {
  contains,
  fit,
  intersect,
  length,
  normalize,
  shift,
  subtract,
  union,
  type Interval,
} from './intervals.ts';
import { ANY_STAFF, occupation, prepMinutes, resourceTypesOf, visibleRange } from './occupation.ts';
import { isoOf, localMinutes, minutesOf, staffWindows } from './shifts.ts';
import type {
  Appointment,
  ServiceVariant,
  Shift,
  StaffTimeOff,
  TenantFixture,
} from './fixtures/types.ts';

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
  /** Resources to keep when several fit, e.g. the chair an appointment already has. */
  prefer?: ReadonlySet<string>;
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

  // 4. Local grid. Times outside the policy window were cut above, so the loop starts inside it.
  const slots: Slot[] = [];
  const first = Math.max(input.dayStart, input.notBefore);
  const last = Math.min(input.dayEnd - 1, input.notAfter);
  const startAt = input.dayStart + Math.ceil((first - input.dayStart) / input.step) * input.step;
  for (let t = startAt; t <= last; t += input.step) {
    const origin = t - prep;
    if (!contains(origins, origin)) continue;
    const assignment: Record<string, string> = {};
    for (const [typeId, ofType] of candidates) {
      const fitting = ofType.filter((r) => contains(fits.get(r.id) ?? [], origin));
      const kept = fitting.filter((r) => input.prefer?.has(r.id));
      const chosen = pick(kept.length > 0 ? kept : fitting);
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
  /** What to read instead of the fixture, e.g. the state of a screen after edits. */
  state?: {
    appointments?: readonly Appointment[];
    shifts?: readonly Shift[];
    staffTimeOff?: readonly StaffTimeOff[];
  };
  /** Appointments left out of the busy times, e.g. the one being moved. */
  ignore?: ReadonlySet<string>;
  /** People who cannot be assigned, e.g. the one on leave. */
  exclude?: ReadonlySet<string>;
  /** Resources to keep when several fit (a move keeps the chair it has). */
  prefer?: ReadonlySet<string>;
  /** Grid step in minutes; 15 by default, 1 to test a time off the grid (BR-58). */
  step?: number;
  /**
   * `online`: only people who take online bookings (the customer page); `staff`: anybody with
   * the skill (a receptionist booking at the desk, BR-30).
   */
  channel?: 'online' | 'staff';
}

const STEP_MINUTES = 15;
const BLOCKING: Appointment['status'][] = ['held', 'confirmed', 'checked_in', 'completed'];

/** What one day looks like for a tenant: opening hours, the busy times, who works. */
interface DayContext {
  open: Interval[];
  dayStart: number;
  dayEnd: number;
  busy: Map<string, Interval[]>;
  shifts: readonly Shift[];
  timeOff: readonly StaffTimeOff[];
  staffTypeIds: Set<string>;
}

function dayContext(query: Omit<AvailabilityQuery, 'variant' | 'serviceId' | 'staffResourceId'>) {
  const { fixture, date } = query;
  const windows = openingWindows(fixture, date);
  if (windows.length === 0) return null;
  // BR-02: a day may have several windows; the time between them is closed.
  const open = normalize(
    windows.map((w): Interval => [localMinutes(date, w.open), localMinutes(date, w.close)]),
  );
  const dayStart = localMinutes(date, '00:00');
  const now = minutesOf(query.now ?? query.notBefore ?? isoOf(0));

  const busy = new Map<string, Interval[]>();
  const state = query.state ?? {};
  for (const appt of state.appointments ?? fixture.appointments) {
    if (query.ignore?.has(appt.id)) continue;
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
  return {
    open,
    dayStart,
    dayEnd: dayStart + 1440,
    busy,
    shifts: state.shifts ?? fixture.shifts,
    timeOff: state.staffTimeOff ?? fixture.staffTimeOff,
    staffTypeIds: new Set(fixture.resourceTypes.filter((t) => t.isStaff).map((t) => t.id)),
  } satisfies DayContext;
}

/** The resources that may serve one item: right type, skill, channel, the person asked for. */
function resourcesFor(
  query: Pick<AvailabilityQuery, 'fixture' | 'date' | 'channel' | 'exclude'>,
  day: DayContext,
  item: { variant: ServiceVariant; serviceId: string; staffResourceId: string },
): CoreResource[] {
  const { fixture, date } = query;
  const typeIds = new Set(resourceTypesOf(item.variant));
  const resources: CoreResource[] = [];
  for (const r of fixture.resources) {
    if (!typeIds.has(r.resourceTypeId)) continue;
    const isStaff = day.staffTypeIds.has(r.resourceTypeId);
    const member = fixture.staff.find((s) => s.resourceId === r.id);
    if (isStaff) {
      const ok =
        member &&
        (query.channel === 'staff' || member.profile.bookableOnline) &&
        member.skillServiceIds.includes(item.serviceId) &&
        !query.exclude?.has(r.id) &&
        (item.staffResourceId === ANY_STAFF || r.id === item.staffResourceId);
      if (!ok) continue;
    }
    // BR-37: a resource out of use for a while has no free time in it.
    const outages = (fixture.config?.outages ?? [])
      .filter((o) => o.resourceId === r.id)
      .map((o): Interval => [minutesOf(o.from), minutesOf(o.to)]);
    const mine = normalize([...(day.busy.get(r.id) ?? []), ...outages]);
    const working = isStaff
      ? staffWindows({
          shifts: day.shifts,
          timeOff: day.timeOff,
          resourceId: r.id,
          date,
          open: day.open,
        })
      : day.open;
    resources.push({
      id: r.id,
      typeId: r.resourceTypeId,
      isStaff,
      level: member?.level ?? 1,
      free: subtract(working, mine),
      busyToday: length(intersect(mine, [[day.dayStart, day.dayEnd]])),
    });
  }
  return resources;
}

/**
 * Free start times for one item on one day. Staff work their shifts, or the opening hours on a
 * day without a rota; a person on leave is out for that time. With `ANY_STAFF`, each time carries
 * the person `pick` chooses.
 */
export function freeSlots(query: AvailabilityQuery): FreeSlot[] {
  const { variant } = query;
  const day = dayContext(query);
  if (!day) return [];
  const resources = resourcesFor(query, day, {
    variant,
    serviceId: query.serviceId,
    staffResourceId: query.staffResourceId,
  });
  const staffTypeId = resourceTypesOf(variant).find((t) => day.staffTypeIds.has(t)) ?? '';
  return findSlots({
    variant,
    open: day.open,
    resources,
    dayStart: day.dayStart,
    dayEnd: day.dayEnd,
    step: query.step ?? STEP_MINUTES,
    ...(query.prefer ? { prefer: query.prefer } : {}),
    notBefore: query.notBefore ? minutesOf(query.notBefore) : -Infinity,
    notAfter: query.notAfter ? minutesOf(query.notAfter) : Infinity,
  }).map((slot) => ({
    startAt: isoOf(slot.start),
    staffResourceId: slot.assignment[staffTypeId] ?? '',
    assignment: slot.assignment,
  }));
}

// ---- A chain of services for one subject (BR-18) ----

export interface ChainItemInput {
  variant: Pick<ServiceVariant, 'segments' | 'cleanupMinutes'>;
  /** Resources that may serve this item, as for `findSlots`. */
  resources: CoreResource[];
}

export interface FindChainInput {
  items: ChainItemInput[];
  open: Interval[];
  dayStart: number;
  dayEnd: number;
  step: number;
  /** Earliest and latest time the customer may arrive for the first item (BR-06). */
  notBefore: number;
  notAfter: number;
}

export interface ChainSlotItem {
  /** Minute the customer arrives for this item (the start of its visible part). */
  start: number;
  /** Minute the visible part ends. */
  end: number;
  assignment: Record<string, string>;
}

export interface ChainSlot {
  /** Minute the customer arrives for the first item. */
  start: number;
  items: ChainSlotItem[];
}

/** Resources of one type that can serve an item, in the order BR-57 tries them. */
function orderedOfType(ofType: readonly CoreResource[], previousStaff: ReadonlySet<string>) {
  return ofType
    .map((r, index) => ({ r, index }))
    .sort(
      (a, b) =>
        (a.r.isStaff ? a.r.level - b.r.level : 0) ||
        (a.r.isStaff
          ? Number(!previousStaff.has(a.r.id)) - Number(!previousStaff.has(b.r.id))
          : 0) ||
        (a.r.isStaff ? a.r.busyToday - b.r.busyToday : 0) ||
        a.index - b.index,
    )
    .map((x) => x.r);
}

/**
 * Start times for a chain: each item starts when the customer-visible part of the one before
 * ends; the same person doing the next item, when it opens with a `prep` part, makes the customer
 * wait that long (BR-18). Resources go in BR-57 order, the person who did the item before first
 * among equal levels. Each item takes its own resources out of the free time before the next one
 * is placed, and the search backs out of a choice that leaves a later item without a place.
 */
export function findChainSlots(input: FindChainInput): ChainSlot[] {
  const { items, open } = input;
  if (items.length === 0) return [];
  const slots: ChainSlot[] = [];

  const place = (
    index: number,
    previousEnd: number,
    previousStaff: ReadonlySet<string>,
    held: ReadonlyMap<string, Interval[]>,
    first: number,
  ): ChainSlotItem[] | null => {
    const item = items[index]!;
    const { variant, resources } = item;
    const prep = prepMinutes(variant);
    const [visStart, visEnd] = visibleRange(variant);
    const types = resourceTypesOf(variant);
    const choices = types.map((typeId) =>
      orderedOfType(
        resources.filter((r) => r.typeId === typeId),
        previousStaff,
      ),
    );

    const walk = (t: number, chosen: CoreResource[]): ChainSlotItem[] | null => {
      if (t === types.length) {
        const staff = new Set(chosen.filter((r) => r.isStaff).map((r) => r.id));
        const sameStaff = [...staff].some((id) => previousStaff.has(id));
        const arrival = index === 0 ? first : previousEnd + (sameStaff ? prep : 0);
        const origin = arrival - prep;
        if (!contains(fit(open, [[visStart, visEnd]]), origin)) return null;
        const nextHeld = new Map(held);
        for (const r of chosen) {
          const parts = shift(occupation(variant, r.typeId), origin);
          const free = subtract(r.free, held.get(r.id) ?? []);
          if (!contains(fit(free, occupation(variant, r.typeId)), origin)) return null;
          nextHeld.set(r.id, normalize([...(held.get(r.id) ?? []), ...parts]));
        }
        const end = origin + visEnd;
        const here: ChainSlotItem = {
          start: arrival,
          end,
          assignment: Object.fromEntries(chosen.map((r) => [r.typeId, r.id])),
        };
        if (index === items.length - 1) return [here];
        const rest = place(index + 1, end, staff, nextHeld, first);
        return rest && [here, ...rest];
      }
      for (const r of choices[t]!) {
        const found = walk(t + 1, [...chosen, r]);
        if (found) return found;
      }
      return null;
    };
    return walk(0, []);
  };

  const first = Math.max(input.dayStart, input.notBefore);
  const last = Math.min(input.dayEnd - 1, input.notAfter);
  const startAt = input.dayStart + Math.ceil((first - input.dayStart) / input.step) * input.step;
  for (let t = startAt; t <= last; t += input.step) {
    const placed = place(0, 0, new Set(), new Map(), t);
    if (placed) slots.push({ start: t, items: placed });
  }
  return slots;
}

export interface FreeChainItem {
  /** ISO 8601, UTC: when the customer arrives for this item. */
  startAt: string;
  /** ISO 8601, UTC: when the customer-visible part ends. */
  endAt: string;
  staffResourceId: string;
  assignment: Record<string, string>;
}

export interface FreeChainSlot {
  /** ISO 8601, UTC: when the customer arrives for the first item. */
  startAt: string;
  /** When the last item ends. */
  endAt: string;
  items: FreeChainItem[];
}

export interface ChainQuery extends Omit<
  AvailabilityQuery,
  'variant' | 'serviceId' | 'staffResourceId'
> {
  items: { variant: ServiceVariant; serviceId: string; staffResourceId: string }[];
}

/** `findChainSlots` over a tenant fixture; a chain of one gives the same times as `freeSlots`. */
export function freeChainSlots(query: ChainQuery): FreeChainSlot[] {
  const day = dayContext(query);
  if (!day) return [];
  const slots = findChainSlots({
    items: query.items.map((item) => ({
      variant: item.variant,
      resources: resourcesFor(query, day, item),
    })),
    open: day.open,
    dayStart: day.dayStart,
    dayEnd: day.dayEnd,
    step: query.step ?? STEP_MINUTES,
    notBefore: query.notBefore ? minutesOf(query.notBefore) : -Infinity,
    notAfter: query.notAfter ? minutesOf(query.notAfter) : Infinity,
  });
  return slots.map((slot) => ({
    startAt: isoOf(slot.start),
    endAt: isoOf(slot.items.at(-1)!.end),
    items: slot.items.map((it, i) => {
      const staffTypeId =
        resourceTypesOf(query.items[i]!.variant).find((t) => day.staffTypeIds.has(t)) ?? '';
      return {
        startAt: isoOf(it.start),
        endAt: isoOf(it.end),
        staffResourceId: it.assignment[staffTypeId] ?? '',
        assignment: it.assignment,
      };
    }),
  }));
}

// ---- A group: several subjects, one item each (BR-19) ----

export interface FindGroupInput extends FindChainInput {
  /** Longest gap between the first and the last start of a staggered suggestion, in minutes. */
  maxSpread?: number;
}

export interface GroupSlotItem extends ChainSlotItem {
  /** Index into `FindGroupInput.items`. */
  item: number;
}

export interface GroupSlot {
  /** Minute the first one arrives. */
  start: number;
  /** Minute the last one finishes. */
  end: number;
  items: GroupSlotItem[];
}

const SPREAD_MINUTES = 60;

/**
 * BR-19: "together" are the times at which every item starts at once, each with its own person
 * and its own resource of every type. "staggered" are the combinations that start up to
 * `maxSpread` minutes apart, each person still distinct but a resource other than staff shared
 * as long as the held times do not meet; they are sorted by the time the last one is done.
 * Staggered combinations that start together are left out: those are in "together".
 */
export function findGroupSlots(input: FindGroupInput): {
  together: GroupSlot[];
  staggered: GroupSlot[];
} {
  const { items, open } = input;
  const spread = input.maxSpread ?? SPREAD_MINUTES;

  const place = (starts: readonly number[], shareResources: boolean): GroupSlot | null => {
    const go = (
      k: number,
      held: ReadonlyMap<string, Interval[]>,
      used: ReadonlySet<string>,
      out: GroupSlotItem[],
    ): GroupSlotItem[] | null => {
      if (k === items.length) return out;
      const { variant, resources } = items[k]!;
      const prep = prepMinutes(variant);
      const [visStart, visEnd] = visibleRange(variant);
      const origin = starts[k]! - prep;
      if (!contains(fit(open, [[visStart, visEnd]]), origin)) return null;
      const types = resourceTypesOf(variant);
      const walk = (
        t: number,
        chosen: CoreResource[],
        nextHeld: Map<string, Interval[]>,
      ): GroupSlotItem[] | null => {
        if (t === types.length) {
          const nextUsed = new Set(used);
          for (const r of chosen) if (r.isStaff || !shareResources) nextUsed.add(r.id);
          const here: GroupSlotItem = {
            item: k,
            start: starts[k]!,
            end: origin + visEnd,
            assignment: Object.fromEntries(chosen.map((r) => [r.typeId, r.id])),
          };
          return go(k + 1, nextHeld, nextUsed, [...out, here]);
        }
        const typeId = types[t]!;
        const ofType = orderedOfType(
          resources.filter((r) => r.typeId === typeId),
          new Set(),
        );
        for (const r of ofType) {
          if (used.has(r.id)) continue;
          const free = subtract(r.free, nextHeld.get(r.id) ?? []);
          const need = occupation(variant, typeId);
          if (!contains(fit(free, need), origin)) continue;
          const after = new Map(nextHeld);
          after.set(r.id, normalize([...(nextHeld.get(r.id) ?? []), ...shift(need, origin)]));
          const found = walk(t + 1, [...chosen, r], after);
          if (found) return found;
        }
        return null;
      };
      return walk(0, [], new Map(held));
    };
    const placed = go(0, new Map(), new Set(), []);
    if (!placed) return null;
    return {
      start: Math.min(...placed.map((p) => p.start)),
      end: Math.max(...placed.map((p) => p.end)),
      items: placed,
    };
  };

  const together: GroupSlot[] = [];
  const staggered: GroupSlot[] = [];
  if (items.length === 0) return { together, staggered };

  const first = Math.max(input.dayStart, input.notBefore);
  const last = Math.min(input.dayEnd - 1, input.notAfter);
  const startAt = input.dayStart + Math.ceil((first - input.dayStart) / input.step) * input.step;
  const steps = Math.floor(spread / input.step);

  for (let t = startAt; t <= last; t += input.step) {
    const same = place(
      items.map(() => t),
      false,
    );
    if (same) together.push(same);
  }

  // Offsets for every item but the first, in steps after `t`; `t` itself is the earliest start.
  const offsets = (n: number): number[][] =>
    n === 0
      ? [[]]
      : offsets(n - 1).flatMap((rest) => Array.from({ length: steps + 1 }, (_, k) => [...rest, k]));
  if (items.length > 1) {
    const combos = offsets(items.length);
    for (let t = startAt; t <= last; t += input.step) {
      for (const combo of combos) {
        if (!combo.includes(0) || combo.every((k) => k === 0)) continue;
        const starts = combo.map((k) => t + k * input.step);
        if (starts.some((s) => s > last)) continue;
        const found = place(starts, true);
        if (found) staggered.push(found);
      }
    }
    staggered.sort((a, b) => a.end - b.end || a.start - b.start);
  }
  return { together, staggered };
}

export interface FreeGroupSlot extends FreeChainSlot {
  /** Per item of the query, in the same order. */
  items: FreeChainItem[];
}

/** `findGroupSlots` over a tenant fixture. */
export function freeGroupSlots(query: ChainQuery & { maxSpread?: number }): {
  together: FreeGroupSlot[];
  staggered: FreeGroupSlot[];
} {
  const day = dayContext(query);
  if (!day) return { together: [], staggered: [] };
  const found = findGroupSlots({
    items: query.items.map((item) => ({
      variant: item.variant,
      resources: resourcesFor(query, day, item),
    })),
    open: day.open,
    dayStart: day.dayStart,
    dayEnd: day.dayEnd,
    step: query.step ?? STEP_MINUTES,
    notBefore: query.notBefore ? minutesOf(query.notBefore) : -Infinity,
    notAfter: query.notAfter ? minutesOf(query.notAfter) : Infinity,
    ...(query.maxSpread ? { maxSpread: query.maxSpread } : {}),
  });
  const convert = (slot: GroupSlot): FreeGroupSlot => ({
    startAt: isoOf(slot.start),
    endAt: isoOf(slot.end),
    items: [...slot.items]
      .sort((a, b) => a.item - b.item)
      .map((it) => {
        const staffTypeId =
          resourceTypesOf(query.items[it.item]!.variant).find((t) => day.staffTypeIds.has(t)) ?? '';
        return {
          startAt: isoOf(it.start),
          endAt: isoOf(it.end),
          staffResourceId: it.assignment[staffTypeId] ?? '',
          assignment: it.assignment,
        };
      }),
  });
  return { together: found.together.map(convert), staggered: found.staggered.map(convert) };
}
