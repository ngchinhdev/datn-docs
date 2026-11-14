/*
 * The opening hours as time ranges for the rota screens (BR-02, BR-35): a day may have several
 * windows, and "nobody on shift" is only looked for inside them. Pure; imports only types and pure
 * modules, so Node can run it (scripts/check-shop.ts).
 */
import type { Shift, StaffTimeOff, TenantFixture } from './fixtures/types.ts';
import { openingWindows, type OpenWindow } from './hours.ts';
import { normalize, subtract, union, type Interval } from './intervals.ts';
import { localMinutes, staffWindows } from './shifts.ts';

/** The opening windows of a date as minute ranges, in time order; empty when closed. */
export function openIntervals(fixture: Pick<TenantFixture, 'branches'>, date: string): Interval[] {
  return normalize(
    openingWindows(fixture, date).map((w: OpenWindow): Interval => [
      localMinutes(date, w.open),
      localMinutes(date, w.close),
    ]),
  );
}

/**
 * The hours inside the opening windows of `date` that nobody is on shift for, once the approved
 * leave is off (BR-35). Time between two windows is closed, so it is never a gap.
 */
export function uncoveredHours(args: {
  fixture: Pick<TenantFixture, 'branches' | 'staff'>;
  shifts: readonly Shift[];
  timeOff: readonly StaffTimeOff[];
  date: string;
}): Interval[] {
  const { fixture, shifts, timeOff, date } = args;
  const open = openIntervals(fixture, date);
  const covered = fixture.staff.reduce<Interval[]>(
    (all, member) =>
      union(
        all,
        staffWindows({
          shifts,
          timeOff: timeOff.filter((t) => t.status === 'approved'),
          resourceId: member.resourceId,
          date,
          open,
        }),
      ),
    [],
  );
  return subtract(open, covered);
}
