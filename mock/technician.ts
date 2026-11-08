/*
 * What a technician sees and does with their own appointments (BR-36). Pure functions; imports
 * only types, so Node can run it.
 */
import type { Appointment, ResourceBooking, TenantFixture } from './fixtures/types.ts';

export type ItemPhase =
  /** Not yet time. */
  | 'upcoming'
  /** Time to begin (from 15 minutes before the customer arrives). */
  | 'due'
  /** Working on it. */
  | 'working'
  /** In a waiting segment: the technician is free. */
  | 'waiting'
  /** The waiting segment is over and the next part has not been started. */
  | 'back'
  | 'done'
  /** Cancelled or no-show. */
  | 'closed';

const MINUTE = 60_000;
const EARLY_MINUTES = 15;

const itemBookings = (appt: Appointment, index: number) =>
  appt.bookings.filter((b) => b.itemIndex === index);

/** Where item `index` stands for the technician at `now` (ISO 8601, UTC). */
export function itemPhase(appt: Appointment, index: number, now: string): ItemPhase {
  const item = appt.items[index];
  if (!item) return 'closed';
  if (appt.status === 'cancelled' || appt.status === 'no_show' || appt.status === 'held') {
    return 'closed';
  }
  if (item.stage === 'done' || appt.status === 'completed') return 'done';

  const started =
    appt.status === 'checked_in' || item.stage === 'started' || item.stage === 'resumed';
  if (!started) {
    const arrival = itemBookings(appt, index)
      .filter((b) => b.kind === 'work')
      .map((b) => b.startAt)
      .sort()[0];
    return Date.parse(now) >= Date.parse(arrival ?? appt.startAt) - EARLY_MINUTES * MINUTE
      ? 'due'
      : 'upcoming';
  }
  const wait = itemBookings(appt, index)
    .filter((b) => b.kind === 'wait')
    .sort((a, b) => a.startAt.localeCompare(b.startAt))[0];
  if (wait && item.stage !== 'resumed') {
    if (now < wait.startAt) return 'working';
    return now < wait.endAt ? 'waiting' : 'back';
  }
  return 'working';
}

/** The first waiting segment of an item: when the technician is free, and until when. */
export function waitOf(appt: Appointment, index: number): ResourceBooking | undefined {
  return itemBookings(appt, index)
    .filter((b) => b.kind === 'wait')
    .sort((a, b) => a.startAt.localeCompare(b.startAt))[0];
}

/** "xả thuốc, gội ở Giường gội 1": the part that starts when the wait ends, and where. */
export function nextPartText(fixture: TenantFixture, appt: Appointment, index: number) {
  const wait = waitOf(appt, index);
  if (!wait) return '';
  const next = itemBookings(appt, index).filter(
    (b) => b.startAt === wait.endAt && b.kind === 'work',
  );
  const label = next.find((b) => b.label)?.label ?? 'phần tiếp';
  const staffIds = new Set(fixture.staff.map((s) => s.resourceId));
  const where = next
    .filter((b) => !staffIds.has(b.resourceId))
    .map((b) => fixture.resources.find((r) => r.id === b.resourceId)?.name ?? b.resourceId);
  return where.length ? `${label} ở ${[...new Set(where)].join(', ')}` : label;
}

/** The new state of an appointment after the technician presses Bắt đầu, Bắt đầu phần tiếp or Xong. */
export function advanceItem(
  appt: Appointment,
  index: number,
  action: 'start' | 'resume' | 'finish',
  now: string,
): Appointment {
  const items = appt.items.map((item, i) =>
    i === index
      ? {
          ...item,
          stage:
            action === 'start'
              ? ('started' as const)
              : action === 'resume'
                ? ('resumed' as const)
                : ('done' as const),
        }
      : item,
  );
  const allDone = items.every((i) => i.stage === 'done');
  const status: Appointment['status'] = allDone
    ? 'completed'
    : appt.status === 'confirmed'
      ? 'checked_in'
      : appt.status;
  return {
    ...appt,
    items,
    status,
    ...(appt.status === 'confirmed' && status === 'checked_in' ? { checkedInAt: now } : {}),
    ...(allDone ? { settled: false } : {}),
  };
}
