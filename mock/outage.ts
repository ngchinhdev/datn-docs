/*
 * A resource out of use for a while (BR-37): which appointments it touches, which of them move to
 * another resource of the same type by themselves, and which are left without a place. Pure
 * functions over a fixture and `moveAppointment`; imports only types and pure modules.
 */
import type { Appointment, ResourceOutage, TenantFixture } from './fixtures/types.ts';
import { itemArrival, moveAppointment } from './move.ts';
import { localMinutes, minutesOf } from './shifts.ts';
import { localDate } from './time.ts';

const LIVE: Appointment['status'][] = ['confirmed', 'checked_in'];

export interface OutageImpact {
  appt: Appointment;
  /** The appointment on another resource of the same type, same time and same person; `null` when none fits. */
  moved: Appointment | null;
  /** Names of the resources it uses now and would use after, `Ghế 2` and `Ghế 1`. */
  before: string[];
  after: string[];
  /** Why it has no place, when `moved` is `null`. */
  reason: string | null;
}

/** The appointments that use `resourceId` at some time of `[from, to)`, in time order. */
export function touchedBy(
  appointments: readonly Appointment[],
  resourceId: string,
  from: string,
  to: string,
): Appointment[] {
  const a = minutesOf(from);
  const b = minutesOf(to);
  return appointments
    .filter(
      (appt) =>
        LIVE.includes(appt.status) &&
        appt.bookings.some(
          (x) => x.resourceId === resourceId && minutesOf(x.startAt) < b && a < minutesOf(x.endAt),
        ),
    )
    .sort((x, y) => x.startAt.localeCompare(y.startAt));
}

/**
 * BR-37: with the resource out, each appointment it touches moves to another resource of the same
 * type when one is free then (the customer is not told), else it waits in "Cần xếp lại". The
 * appointments are taken in time order and each move counts for the next.
 */
export function outageImpact(args: {
  fixture: TenantFixture;
  resourceId: string;
  from: string;
  to: string;
  now: string;
}): OutageImpact[] {
  const { fixture, resourceId, from, to, now } = args;
  const outage: ResourceOutage = { id: 'preview', resourceId, from, to, reason: '' };
  const config = { ...fixture.config, outages: [...fixture.config.outages, outage] };
  const typeName =
    fixture.resourceTypes.find(
      (t) => t.id === fixture.resources.find((r) => r.id === resourceId)?.resourceTypeId,
    )?.name ?? 'tài nguyên';
  let state = [...fixture.appointments];
  const impacts: OutageImpact[] = [];
  for (const appt of touchedBy(fixture.appointments, resourceId, from, to)) {
    const date = localDate(appt.startAt);
    const result = moveAppointment({
      fixture: { ...fixture, config, appointments: state },
      appt,
      date,
      minute: minutesOf(itemArrival(appt, 0)) - localMinutes(date, '00:00'),
      now,
    });
    if (result.ok) {
      state = state.map((a) => (a.id === appt.id ? result.appt : a));
      impacts.push({
        appt,
        moved: result.appt,
        before: result.resourcesBefore,
        after: result.resourcesAfter,
        reason: null,
      });
    } else {
      impacts.push({
        appt,
        moved: null,
        before: [],
        after: [],
        reason: `Không còn ${typeName.toLowerCase()}`,
      });
    }
  }
  return impacts;
}

/** Live appointments that use the resource in the `days` days from `now`. */
export function upcomingCount(
  appointments: readonly Appointment[],
  resourceId: string,
  now: string,
  days = 7,
): number {
  const from = now;
  const to = new Date(minutesOf(now) * 60_000 + days * 86_400_000).toISOString();
  return touchedBy(appointments, resourceId, from, to).length;
}

/** The outage that holds the resource at `now`, if any. */
export function activeOutage(
  outages: readonly ResourceOutage[],
  resourceId: string,
  now: string,
): ResourceOutage | undefined {
  return outages.find((o) => o.resourceId === resourceId && o.from <= now && now < o.to);
}
