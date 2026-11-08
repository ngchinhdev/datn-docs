/*
 * Putting one item on the calendar for a receptionist (BR-30): does it fit, who and what does it
 * take, why not, and which times are nearest. Pure functions over a fixture and `freeSlots`.
 * Imports only types and pure modules, so Node can run it (scripts/check-availability.ts).
 */
import { ANY_STAFF, freeSlots, type FreeSlot } from './availability.ts';
import { bookVariant } from './fixtures/bookings.ts';
import type {
  Appointment,
  ResourceBooking,
  Service,
  ServiceVariant,
  TenantFixture,
} from './fixtures/types.ts';
import { openingHours } from './hours.ts';
import { subtract, type Interval } from './intervals.ts';
import {
  occupation,
  prepMinutes,
  resourceTypesOf,
  visibleMinutes,
  visibleRange,
} from './occupation.ts';
import { isoOf, localMinutes, localTimeOf, minutesOf, staffWindows } from './shifts.ts';

export { ANY_STAFF };

const LIVE: Appointment['status'][] = ['held', 'confirmed', 'checked_in', 'completed'];

/**
 * `14:05`, `14h05`, `1405`, `9.30` or `9` as minutes of the day; `null` when it is not a time.
 * Any minute is allowed, not only the grid (BR-58).
 */
export function parseTime(text: string): number | null {
  const match = /^\s*(\d{1,2})(?:\s*[:.hH]\s*(\d{2})?|(\d{2}))?\s*$/.exec(text);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2] ?? match[3] ?? 0);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

export interface PlaceInput {
  /** Live state: appointments, customers, shifts and leave as the screen has them. */
  fixture: TenantFixture;
  service: Service;
  variant: ServiceVariant;
  /** Local date `YYYY-MM-DD`. */
  date: string;
  /** Minutes since midnight on `date`: when the customer arrives. */
  minute: number;
  /** `ANY_STAFF` or a staff resource id. */
  staffResourceId: string;
  /** What the new item is called in a message, e.g. the pet's name. */
  subjectName?: string;
  /** Appointments to leave out, e.g. the one being moved. */
  ignore?: ReadonlySet<string>;
  /** Resources to keep when several fit. */
  prefer?: ReadonlySet<string>;
  /** People who cannot be assigned. */
  exclude?: ReadonlySet<string>;
  /** ISO 8601, UTC: holds that ran out by then do not block (BR-07). */
  now: string;
}

export interface Placement {
  /** ISO 8601, UTC: when the customer arrives. */
  startAt: string;
  /** ISO 8601, UTC: when the customer is done (BR-51). */
  endAt: string;
  staffResourceId: string;
  /** Resource id per resource type. */
  assignment: Record<string, string>;
  bookings: ResourceBooking[];
}

export interface Suggestion {
  /** ISO 8601, UTC. */
  startAt: string;
  staffResourceId: string;
}

export type PlaceResult =
  { ok: true; placement: Placement } | { ok: false; reason: string; nearest: Suggestion[] };

const query = (input: PlaceInput, extra: Partial<Parameters<typeof freeSlots>[0]> = {}) => ({
  fixture: input.fixture,
  variant: input.variant,
  serviceId: input.service.id,
  date: input.date,
  staffResourceId: input.staffResourceId,
  channel: 'staff' as const,
  now: input.now,
  ...(input.ignore ? { ignore: input.ignore } : {}),
  ...(input.prefer ? { prefer: input.prefer } : {}),
  ...(input.exclude ? { exclude: input.exclude } : {}),
  ...extra,
});

const arrival = (input: PlaceInput) => localMinutes(input.date, '00:00') + input.minute;

/** Is the item placeable at that exact minute, and if not, why and when instead? */
export function placeItem(input: PlaceInput): PlaceResult {
  const start = arrival(input);
  const startAt = isoOf(start);
  const exact = freeSlots(query(input, { step: 1, notBefore: startAt, notAfter: startAt }));
  const slot = exact[0];
  if (slot) {
    const bookings = bookVariant(startAt, input.variant, slot.assignment);
    return {
      ok: true,
      placement: {
        startAt,
        endAt: isoOf(start + visibleMinutes(input.variant)),
        staffResourceId: slot.staffResourceId,
        assignment: slot.assignment,
        bookings,
      },
    };
  }
  return { ok: false, reason: explain(input), nearest: nearestSlots(input) };
}

/** The `limit` grid times nearest to the one asked for, in time order, each with a person. */
export function nearestSlots(input: PlaceInput, limit = 3): Suggestion[] {
  const start = arrival(input);
  const anyone = freeSlots(query(input, { staffResourceId: ANY_STAFF }));
  const mine: FreeSlot[] = input.staffResourceId === ANY_STAFF ? [] : freeSlots(query(input));
  const byTime = new Map<string, Suggestion>();
  for (const slot of anyone) {
    byTime.set(slot.startAt, { startAt: slot.startAt, staffResourceId: slot.staffResourceId });
  }
  // The person asked for stays on the chip when they are free then.
  for (const slot of mine) {
    byTime.set(slot.startAt, { startAt: slot.startAt, staffResourceId: slot.staffResourceId });
  }
  return [...byTime.values()]
    .filter((s) => minutesOf(s.startAt) !== start)
    .sort(
      (a, b) =>
        Math.abs(minutesOf(a.startAt) - start) - Math.abs(minutesOf(b.startAt) - start) ||
        minutesOf(a.startAt) - minutesOf(b.startAt),
    )
    .slice(0, limit)
    .sort((a, b) => minutesOf(a.startAt) - minutesOf(b.startAt));
}

/** Free minutes of the day at which the item fits, `HH:mm` of the first, for a default time. */
export function firstFreeMinute(input: PlaceInput, notBefore: number): number | null {
  const slots = freeSlots(query(input, { staffResourceId: ANY_STAFF }));
  const day = localMinutes(input.date, '00:00');
  const found = slots.map((s) => minutesOf(s.startAt) - day).find((m) => m >= notBefore);
  return found ?? null;
}

// ---- Why not ----

const lowerFirst = (text: string) => text.charAt(0).toLowerCase() + text.slice(1);
const range = (from: number, to: number) => `${localTimeOf(from)}–${localTimeOf(to)}`;

interface Held {
  typeId: string;
  /** Absolute minutes. */
  interval: Interval;
}

/** Name of the part of the item that holds `[from, to)` of its resource type, for a message. */
function partName(variant: ServiceVariant, typeId: string, origin: number, at: Interval) {
  const rel: Interval = [at[0] - origin, at[1] - origin];
  const segment = variant.segments.find(
    (s) => s.resourceTypeIds.includes(typeId) && s.startMinute < rel[1] && rel[0] < s.endMinute,
  );
  return segment ? lowerFirst(segment.name) : 'dọn';
}

/** Who occupies `resourceId` in `[from, to)`: the other appointment's subject or customer. */
function whoIsIn(input: PlaceInput, resourceId: string, at: Interval) {
  const { fixture } = input;
  for (const appt of fixture.appointments) {
    if (input.ignore?.has(appt.id) || !LIVE.includes(appt.status)) continue;
    for (const b of appt.bookings) {
      if (b.resourceId !== resourceId) continue;
      const from = minutesOf(b.startAt);
      const to = minutesOf(b.endAt);
      if (from >= at[1] || at[0] >= to) continue;
      const item = appt.items[b.itemIndex];
      const subject = fixture.servedSubjects.find((s) => s.id === item?.servedSubjectId);
      const customer = fixture.customers.find((c) => c.id === appt.customerId);
      const name =
        subject?.kind === 'other' ? subject.name : (customer?.callName ?? 'khách đang đặt online');
      return { name, from, to };
    }
  }
  return null;
}

/** Why `resourceId` cannot hold `at`: out of its shift, on leave, or in another appointment. */
function problemOf(
  input: PlaceInput,
  resourceId: string,
  isStaff: boolean,
  at: Interval,
  open: Interval[],
): { kind: 'shift' | 'leave' | 'busy'; text: string } | null {
  const { fixture, date } = input;
  if (isStaff) {
    const own = staffWindows({
      shifts: fixture.shifts,
      timeOff: [],
      resourceId,
      date,
      open,
    });
    if (subtract([at], own).length > 0) return { kind: 'shift', text: 'không có ca' };
    const free = staffWindows({
      shifts: fixture.shifts,
      timeOff: fixture.staffTimeOff,
      resourceId,
      date,
      open,
    });
    if (subtract([at], free).length > 0) return { kind: 'leave', text: 'xin nghỉ' };
  } else if (subtract([at], open).length > 0) {
    return { kind: 'shift', text: 'ngoài giờ mở cửa' };
  }
  const other = whoIsIn(input, resourceId, at);
  return other
    ? { kind: 'busy', text: `đang bận ${other.name} (${range(other.from, other.to)})` }
    : null;
}

function explain(input: PlaceInput): string {
  const { fixture, variant, service, date } = input;
  const time = localTimeOf(arrival(input));
  const lead = `Không đặt được ${time}`;
  const hours = openingHours(fixture, date);
  if (!hours) {
    const special = fixture.branches[0]?.specialDays.find((d) => d.date === date);
    return `${lead}: cơ sở đóng cửa ngày này${special ? ` (${special.note})` : ''}.`;
  }
  const open: Interval[] = [[localMinutes(date, hours.open), localMinutes(date, hours.close)]];
  const origin = arrival(input) - prepMinutes(variant);
  const [visFrom, visTo] = visibleRange(variant);
  const visible: Interval = [origin + visFrom, origin + visTo];
  if (subtract([visible], open).length > 0) {
    return `${lead}: ngoài giờ mở cửa (${hours.open}–${hours.close}).`;
  }

  const staffTypeIds = new Set(fixture.resourceTypes.filter((t) => t.isStaff).map((t) => t.id));
  const nameOf = (id: string) => fixture.resources.find((r) => r.id === id)?.name ?? id;
  for (const typeId of resourceTypesOf(variant)) {
    const isStaff = staffTypeIds.has(typeId);
    const held: Held[] = occupation(variant, typeId).map(([a, b]) => ({
      typeId,
      interval: [origin + a, origin + b],
    }));
    let candidates = fixture.resources.filter((r) => r.resourceTypeId === typeId);
    if (isStaff) {
      const capable = candidates.filter((r) =>
        fixture.staff.find((s) => s.resourceId === r.id)?.skillServiceIds.includes(service.id),
      );
      if (input.staffResourceId !== ANY_STAFF) {
        const chosen = candidates.find((r) => r.id === input.staffResourceId);
        if (chosen && !capable.some((r) => r.id === chosen.id)) {
          return `${lead}: ${chosen.name} chưa làm được ${lowerFirst(service.name)}.`;
        }
        candidates = capable.filter((r) => r.id === input.staffResourceId);
      } else {
        candidates = capable.filter((r) => !input.exclude?.has(r.id));
      }
      if (candidates.length === 0)
        return `${lead}: chưa có ai làm được ${lowerFirst(service.name)}.`;
    }

    // A candidate must be free for every interval the item holds its type.
    const firstProblem = (resourceId: string) => {
      for (const h of held) {
        const problem = problemOf(input, resourceId, isStaff, h.interval, open);
        if (problem) return { h, problem };
      }
      return null;
    };
    const checked = candidates.map((r) => ({ resource: r, found: firstProblem(r.id) }));
    if (checked.some((c) => !c.found)) continue;

    const mine = input.subjectName ? ` ${input.subjectName}` : '';
    const when = (h: Held) =>
      `lúc ${partName(variant, typeId, origin, h.interval)}${mine} (${range(h.interval[0], h.interval[1])})`;
    const only = checked.length === 1 ? checked[0] : undefined;
    if (only?.found) {
      return `${lead}: ${when(only.found.h)}, ${only.resource.name} ${only.found.problem.text}.`;
    }
    if (isStaff) {
      const parts = checked.slice(0, 3).map((c) => ({
        when: when(c.found!.h),
        text: `${nameOf(c.resource.id)} ${c.found!.problem.text}`,
      }));
      const same = parts.every((p) => p.when === parts[0]!.when);
      return same
        ? `${lead}: ${parts[0]!.when} không ai trống. ${parts.map((p) => p.text).join('; ')}.`
        : `${lead}: không ai làm trọn được. ${parts.map((p) => `${p.text} ${p.when}`).join('; ')}.`;
    }
    const typeName = fixture.resourceTypes.find((t) => t.id === typeId)?.name ?? 'tài nguyên';
    return `${lead}: không còn ${lowerFirst(typeName)} trống cho ${when(checked[0]!.found!.h)}.`;
  }
  return `${lead}.`;
}
