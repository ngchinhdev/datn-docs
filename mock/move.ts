/*
 * Moving an appointment to another time or person (BR-32): where it may land, what it takes
 * there, and what changes. Pure functions over a fixture and `placeItem`.
 * Imports only types and pure modules, so Node can run it (scripts/check-availability.ts).
 */
import { freeSlots } from './availability.ts';
import type { Appointment, ResourceBooking, TenantFixture } from './fixtures/types.ts';
import { prepMinutes } from './occupation.ts';
import { placeItem } from './placement.ts';
import { isoOf, localMinutes, minutesOf } from './shifts.ts';
import { localDate } from './time.ts';

const MOVING = '__moving__';

/** When the customer arrives for item `index`: the start of its first `work` segment. */
export function itemArrival(appt: Appointment, index: number): string {
  const starts = appt.bookings
    .filter((b) => b.itemIndex === index && b.kind === 'work')
    .map((b) => b.startAt)
    .sort();
  return starts[0] ?? appt.startAt;
}

/** The people who do the items; more than one means the appointment is not moved as a whole. */
export const staffOf = (appt: Appointment) => [
  ...new Set(appt.items.map((i) => i.staffResourceId)),
];

const variantOf = (fixture: TenantFixture, variantId: string) => {
  for (const service of fixture.services) {
    const variant = service.variants.find((v) => v.id === variantId);
    if (variant) return { service, variant };
  }
  return null;
};

/** The day's other appointments, plus what the moved one has taken so far. */
function dayState(
  fixture: TenantFixture,
  appt: Appointment,
  date: string,
  taken: ResourceBooking[],
): TenantFixture {
  const others = fixture.appointments.filter(
    (a) => a.id !== appt.id && localDate(a.startAt) === date,
  );
  const temp: Appointment = {
    ...appt,
    id: MOVING,
    status: 'confirmed',
    items: [],
    bookings: taken,
  };
  return { ...fixture, appointments: [...others, temp] };
}

export interface MoveInput {
  /** The tenant as the screen has it. */
  fixture: TenantFixture;
  appt: Appointment;
  /** Local date of the new time. */
  date: string;
  /** Minutes since midnight on `date`: when the customer arrives for the first item. */
  minute: number;
  /** The person for every item; omitted keeps each item's person. */
  staffResourceId?: string;
  now: string;
}

export type MoveResult =
  | {
      ok: true;
      /** The appointment as it would be: new time, person and resources, same prices (BR-12). */
      appt: Appointment;
      /** Non-staff resource names before and after, for "Ghế 1 → Ghế 3". */
      resourcesBefore: string[];
      resourcesAfter: string[];
    }
  | { ok: false; reason: string };

/** Every item moves by the same amount, so items that run side by side keep doing so. */
export function moveAppointment(input: MoveInput): MoveResult {
  const { fixture, appt, date, now } = input;
  const delta = localMinutes(date, '00:00') + input.minute - minutesOf(itemArrival(appt, 0));
  const taken: ResourceBooking[] = [];
  const items = [...appt.items];
  for (const [index, item] of appt.items.entries()) {
    const found = variantOf(fixture, item.serviceVariantId);
    if (!found) return { ok: false, reason: 'Không tìm thấy dịch vụ của lịch hẹn.' };
    const own = appt.bookings.filter((b) => b.itemIndex === index);
    const minute = minutesOf(itemArrival(appt, index)) + delta - localMinutes(date, '00:00');
    const subject = fixture.servedSubjects.find((s) => s.id === item.servedSubjectId);
    const result = placeItem({
      fixture: dayState(fixture, appt, date, taken),
      service: found.service,
      variant: found.variant,
      date,
      minute,
      staffResourceId: input.staffResourceId ?? item.staffResourceId,
      ...(subject?.kind === 'other' ? { subjectName: subject.name } : {}),
      prefer: new Set(own.map((b) => b.resourceId)),
      now,
    });
    if (!result.ok) return { ok: false, reason: result.reason };
    items[index] = { ...item, staffResourceId: result.placement.staffResourceId };
    taken.push(...result.placement.bookings.map((b) => ({ ...b, itemIndex: index })));
  }
  const nonStaff = (bookings: ResourceBooking[]) => {
    const staffIds = new Set(fixture.staff.map((s) => s.resourceId));
    const names = bookings
      .filter((b) => !staffIds.has(b.resourceId))
      .map((b) => fixture.resources.find((r) => r.id === b.resourceId)?.name ?? b.resourceId);
    return [...new Set(names)];
  };
  return {
    ok: true,
    appt: {
      ...appt,
      startAt: isoOf(minutesOf(appt.startAt) + delta),
      items,
      bookings: taken,
    },
    resourcesBefore: nonStaff(appt.bookings),
    resourcesAfter: nonStaff(taken),
  };
}

/**
 * The minutes of the day at which the appointment's first item may start for `staffResourceId`,
 * on the 15-minute grid. Items after the first are checked by a full move.
 */
export function validStarts(args: {
  fixture: TenantFixture;
  appt: Appointment;
  date: string;
  staffResourceId: string;
  now: string;
}): number[] {
  const { fixture, appt, date, now } = args;
  const first = appt.items[0];
  const found = first && variantOf(fixture, first.serviceVariantId);
  if (!first || !found) return [];
  const day = localMinutes(date, '00:00');
  const slots = freeSlots({
    fixture: dayState(fixture, appt, date, []),
    variant: found.variant,
    serviceId: found.service.id,
    date,
    staffResourceId: args.staffResourceId,
    channel: 'staff',
    now,
  });
  const starts = slots.map((s) => minutesOf(s.startAt) - day);
  if (appt.items.length === 1) return starts;
  return starts.filter(
    (minute) =>
      moveAppointment({ fixture, appt, date, minute, staffResourceId: args.staffResourceId, now })
        .ok,
  );
}

/** Minutes a block covers before the customer arrives (preparation) and until they leave. */
export function blockExtent(fixture: TenantFixture, appt: Appointment) {
  const first = appt.items[0];
  const found = first && variantOf(fixture, first.serviceVariantId);
  const before = found ? prepMinutes(found.variant) : 0;
  const visibleEnd = appt.bookings
    .filter((b) => b.kind === 'work' || b.kind === 'wait')
    .reduce((end, b) => Math.max(end, minutesOf(b.endAt)), 0);
  return { before, after: visibleEnd - minutesOf(itemArrival(appt, 0)) };
}
