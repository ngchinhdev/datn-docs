/*
 * Working windows of staff: shifts, and the leave taken out of them (BR-35, BR-34). Pure; imports
 * only types and pure modules, so Node can run it (scripts/check-availability.ts).
 */
import { normalize, subtract, type Interval } from './intervals.ts';
import type { LocalTime, Shift, StaffTimeOff } from './fixtures/types.ts';

/** Fixed offset is enough for Asia/Ho_Chi_Minh, which has no DST. */
const BRANCH_UTC_OFFSET_MINUTES = 7 * 60;

export const minutesOf = (iso: string) => Date.parse(iso) / 60_000;
export const isoOf = (minutes: number) => new Date(minutes * 60_000).toISOString();

/** Minutes since the Unix epoch of a local date and time (or `24:00`). */
export const localMinutes = (date: string, time: string) => {
  const [h = 0, m = 0] = time.split(':').map(Number);
  return minutesOf(`${date}T00:00:00Z`) - BRANCH_UTC_OFFSET_MINUTES + h * 60 + m;
};

/** Local `HH:mm` of a minute count since the epoch. */
export const localTimeOf = (minutes: number): LocalTime => {
  const local = minutes + BRANCH_UTC_OFFSET_MINUTES;
  const inDay = ((local % 1440) + 1440) % 1440;
  return `${String(Math.floor(inDay / 60)).padStart(2, '0')}:${String(inDay % 60).padStart(2, '0')}` as LocalTime;
};

/** Minutes of `HH:mm`, for lengths: `minutesOfDay('08:45')` is 525. */
export const minutesOfDay = (time: string) => {
  const [h = 0, m = 0] = time.split(':').map(Number);
  return h * 60 + m;
};

/** Does anybody have a shift that day? If not, the day has no rota and everyone works the opening hours. */
export const hasRota = (shifts: readonly Shift[], date: string) =>
  shifts.some((s) => s.date === date);

export const shiftsOf = (shifts: readonly Shift[], resourceId: string, date: string) =>
  shifts
    .filter((s) => s.resourceId === resourceId && s.date === date)
    .sort((a, b) => a.start.localeCompare(b.start));

/** Hours of the blocks of one person that day, as local `HH:mm` pairs. */
export function shiftIntervals(
  shifts: readonly Shift[],
  resourceId: string,
  date: string,
): Interval[] {
  return normalize(
    shiftsOf(shifts, resourceId, date).map((s): Interval => [
      localMinutes(date, s.start),
      localMinutes(date, s.end),
    ]),
  );
}

/** The time a request takes: the whole day, or from–to. */
export function leaveInterval(leave: StaffTimeOff): Interval {
  return leave.from && leave.to
    ? [localMinutes(leave.date, leave.from), localMinutes(leave.date, leave.to)]
    : [localMinutes(leave.date, '00:00'), localMinutes(leave.date, '00:00') + 1440];
}

/** A request that has not been refused keeps the person from new bookings. */
export const blocksStaff = (leave: StaffTimeOff) => leave.status !== 'rejected';

/**
 * When a person can be booked on a date: their blocks, or the opening hours on a day without a
 * rota, minus any leave that was not refused.
 */
export function staffWindows(args: {
  shifts: readonly Shift[];
  timeOff: readonly StaffTimeOff[];
  resourceId: string;
  date: string;
  open: readonly Interval[];
}): Interval[] {
  const { shifts, timeOff, resourceId, date, open } = args;
  const base = hasRota(shifts, date) ? shiftIntervals(shifts, resourceId, date) : normalize(open);
  const away = normalize(
    timeOff
      .filter((t) => t.resourceId === resourceId && t.date === date && blocksStaff(t))
      .map(leaveInterval),
  );
  return subtract(base, away);
}

/** Hours worked in the blocks of a week, `49,5` style callers format it. */
export function weekHours(shifts: readonly Shift[], resourceId: string, dates: readonly string[]) {
  let minutes = 0;
  for (const date of dates) {
    for (const s of shiftsOf(shifts, resourceId, date)) {
      minutes += minutesOfDay(s.end) - minutesOfDay(s.start);
    }
  }
  return minutes / 60;
}
