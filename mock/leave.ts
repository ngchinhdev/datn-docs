/*
 * Leave and shift changes and the appointments they touch (BR-11, BR-33 to BR-35): which
 * appointments are affected, what could be done with each, and what the decisions do. Pure
 * functions over a fixture; imports only types and pure modules, so Node can run it.
 */
import { ANY_STAFF } from './availability.ts';
import type {
  Appointment,
  LeaveHandling,
  Shift,
  StaffTimeOff,
  TenantFixture,
} from './fixtures/types.ts';
import { intersect, length, normalize, subtract, type Interval } from './intervals.ts';
import { itemArrival, moveAppointment } from './move.ts';
import { placeItem } from './placement.ts';
import { isoOf, leaveInterval, localMinutes, minutesOf, staffWindows } from './shifts.ts';
import { localDate } from './time.ts';

const LIVE: Appointment['status'][] = ['confirmed', 'checked_in'];

/** The time of the person's own work in an appointment: preparation counts, cleanup does not. */
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
  return appointmentsIn(
    appointments.filter((a) => localDate(a.startAt) === leave.date),
    leave.resourceId,
    leaveInterval({ ...leave } as StaffTimeOff),
  );
}

/**
 * Appointments of the person that fall outside their blocks once `shiftsAfter` is in force
 * (BR-35). `open` is the day's opening hours, used when the day has no rota.
 */
export function affectedByShifts(args: {
  appointments: readonly Appointment[];
  shiftsAfter: readonly Shift[];
  resourceId: string;
  date: string;
  open: readonly Interval[];
}): Appointment[] {
  const { appointments, shiftsAfter, resourceId, date, open } = args;
  const windows = staffWindows({ shifts: shiftsAfter, timeOff: [], resourceId, date, open });
  return appointments
    .filter(
      (a) =>
        localDate(a.startAt) === date &&
        LIVE.includes(a.status) &&
        a.items.some((i) => i.staffResourceId === resourceId) &&
        subtract(staffIntervals(a, resourceId), windows).length > 0,
    )
    .sort((a, b) => a.startAt.localeCompare(b.startAt));
}

export const windowText = (leave: Pick<StaffTimeOff, 'from' | 'to'>) =>
  leave.from && leave.to ? `${leave.from}–${leave.to}` : 'cả ngày';

// ---- BR-33: asking the customer ----

/** The answer is due 24 hours after the question, and at the latest 2 hours before the time. */
export const answerDeadline = (sentAt: string, appt: Appointment) =>
  isoOf(Math.min(minutesOf(sentAt) + 24 * 60, minutesOf(appt.startAt) - 120));

export const isOverdue = (sentAt: string, appt: Appointment, now: string) =>
  minutesOf(now) > minutesOf(answerDeadline(sentAt, appt));

// ---- BR-34: what could be done with each appointment ----

export interface Candidate {
  staffResourceId: string;
  ok: boolean;
  /** Names of the other resources it would use (chair, bed). */
  resources: string[];
  /** Why not, when it does not fit. */
  reason?: string;
}

export interface Fix {
  /** The person BR-57 would pick at the same time. */
  swap?: Candidate;
  /** Everyone else, for "Người khác". */
  candidates: Candidate[];
  /** When nobody is free then: the nearest time and person. */
  nearest?: { startAt: string; staffResourceId: string };
  /** Why nobody is free at the same time. */
  reason?: string;
}

const busyMinutes = (fixture: TenantFixture, resourceId: string, date: string) =>
  length(
    normalize(
      fixture.appointments
        .filter((a) => LIVE.includes(a.status) && localDate(a.startAt) === date)
        .flatMap((a) => a.bookings)
        .filter((b) => b.resourceId === resourceId)
        .map((b): Interval => [minutesOf(b.startAt), minutesOf(b.endAt)]),
    ),
  );

/**
 * What could replace `leaver` on an appointment at the same time (someone else, the one BR-57
 * would pick first), and when nobody can, the nearest time. `fixture` already holds the
 * decisions made for the other appointments of the case.
 */
export function suggest(args: {
  fixture: TenantFixture;
  appt: Appointment;
  leaver: string;
  now: string;
}): Fix {
  const { fixture, appt, leaver, now } = args;
  const date = localDate(appt.startAt);
  const day = localMinutes(date, '00:00');
  const minute = minutesOf(itemArrival(appt, 0)) - day;
  const serviceOf = (variantId: string) =>
    fixture.services.find((s) => s.variants.some((v) => v.id === variantId))?.id ?? '';
  const candidates: Candidate[] = fixture.staff
    .filter(
      (s) =>
        s.resourceId !== leaver &&
        appt.items.every((i) => s.skillServiceIds.includes(serviceOf(i.serviceVariantId))),
    )
    .map((s) => {
      const result = moveAppointment({
        fixture,
        appt,
        date,
        minute,
        staffResourceId: s.resourceId,
        now,
      });
      return result.ok
        ? { staffResourceId: s.resourceId, ok: true, resources: result.resourcesAfter }
        : { staffResourceId: s.resourceId, ok: false, resources: [], reason: result.reason };
    });
  const level = (id: string) => fixture.staff.find((s) => s.resourceId === id)?.level ?? 1;
  const ordered = candidates
    .map((c, index) => ({ c, index }))
    .filter(({ c }) => c.ok)
    .sort(
      (a, b) =>
        level(a.c.staffResourceId) - level(b.c.staffResourceId) ||
        busyMinutes(fixture, a.c.staffResourceId, date) -
          busyMinutes(fixture, b.c.staffResourceId, date) ||
        a.index - b.index,
    );
  const swap = ordered[0]?.c;
  if (swap) return { swap, candidates };

  // Nobody at the same time: why, and the nearest time for the first item.
  const first = appt.items[0];
  const variantId = first?.serviceVariantId ?? '';
  const service = fixture.services.find((s) => s.variants.some((v) => v.id === variantId));
  const variant = service?.variants.find((v) => v.id === variantId);
  if (!service || !variant) return { candidates };
  const result = placeItem({
    fixture,
    service,
    variant,
    date,
    minute,
    staffResourceId: ANY_STAFF,
    ignore: new Set([appt.id]),
    exclude: new Set([leaver]),
    now,
  });
  if (result.ok) return { candidates };
  const arrival = minutesOf(itemArrival(appt, 0));
  const nearest = [...result.nearest].sort(
    (a, b) =>
      Math.abs(minutesOf(a.startAt) - arrival) - Math.abs(minutesOf(b.startAt) - arrival) ||
      minutesOf(a.startAt) - minutesOf(b.startAt),
  )[0];
  const reason = result.reason.replace(/^Không đặt được [\d:]+: /, '');
  return {
    candidates,
    reason: reason.includes('không ai trống. ')
      ? reason.split('không ai trống. ')[1]!.replace(/\.$/, '')
      : reason.replace(/\.$/, ''),
    ...(nearest ? { nearest } : {}),
  };
}

// ---- What the decisions do ----

/** A decision that settles the appointment; "asked" is still waiting for the customer. */
export const isSettled = (
  h: LeaveHandling | undefined,
): h is Exclude<LeaveHandling, { kind: 'asked' }> => h !== undefined && h.kind !== 'asked';

/**
 * The appointments as they will be once the decisions are carried out: swaps and moves done,
 * cancelled ones gone. An appointment whose decision no longer fits is left as it is.
 */
export function applyHandling(
  fixture: TenantFixture,
  appointments: readonly Appointment[],
  handling: Record<string, LeaveHandling>,
  now: string,
): Appointment[] {
  let current = [...appointments];
  for (const [id, h] of Object.entries(handling)) {
    const appt = current.find((a) => a.id === id);
    if (!appt) continue;
    if (h.kind === 'cancel') {
      current = current.map((a) => (a.id === id ? { ...a, status: 'cancelled' as const } : a));
    } else if (h.kind === 'swap' || h.kind === 'agreed' || h.kind === 'move') {
      const date = h.kind === 'move' ? localDate(h.startAt) : localDate(appt.startAt);
      const minute =
        h.kind === 'move'
          ? minutesOf(h.startAt) - localMinutes(date, '00:00')
          : minutesOf(itemArrival(appt, 0)) - localMinutes(date, '00:00');
      const result = moveAppointment({
        fixture: { ...fixture, appointments: current },
        appt,
        date,
        minute,
        staffResourceId: h.staffResourceId,
        now,
      });
      if (result.ok) current = current.map((a) => (a.id === id ? result.appt : a));
    }
  }
  return current;
}
