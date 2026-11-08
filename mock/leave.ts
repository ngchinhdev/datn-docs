/*
 * Leave and shift changes and the appointments they touch (BR-11, BR-34, BR-35). Pure functions
 * over a fixture; imports only types and pure modules, so Node can run it.
 */
import type { Appointment, StaffTimeOff } from './fixtures/types.ts';
import { intersect, normalize, type Interval } from './intervals.ts';
import { leaveInterval, minutesOf } from './shifts.ts';
import { localDate } from './time.ts';

const LIVE: Appointment['status'][] = ['confirmed', 'checked_in'];

/** The time of the person's own work in an appointment: preparation and cleanup of staff count. */
export function staffIntervals(appt: Appointment, resourceId: string): Interval[] {
  return normalize(
    appt.bookings
      .filter((b) => b.resourceId === resourceId && b.kind !== 'cleanup')
      .map((b): Interval => [minutesOf(b.startAt), minutesOf(b.endAt)]),
  );
}

/** Appointments of the person that touch `window`, in time order. */
export function appointmentsIn(
  appointments: readonly Appointment[],
  resourceId: string,
  window: Interval,
): Appointment[] {
  return appointments
    .filter(
      (a) =>
        LIVE.includes(a.status) &&
        a.items.some((i) => i.staffResourceId === resourceId) &&
        intersect(staffIntervals(a, resourceId), [window]).length > 0,
    )
    .sort((a, b) => a.startAt.localeCompare(b.startAt));
}

/** Appointments a leave request touches: the person's work inside the hours they ask for. */
export function affectedByLeave(
  appointments: readonly Appointment[],
  leave: Pick<StaffTimeOff, 'resourceId' | 'date' | 'from' | 'to'>,
): Appointment[] {
  const window = leaveInterval({ ...leave } as StaffTimeOff);
  return appointmentsIn(
    appointments.filter((a) => localDate(a.startAt) === leave.date),
    leave.resourceId,
    window,
  );
}

export const windowText = (leave: Pick<StaffTimeOff, 'from' | 'to'>) =>
  leave.from && leave.to ? `${leave.from}–${leave.to}` : 'cả ngày';
