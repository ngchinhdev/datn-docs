import type { TenantFixture } from './fixtures';

/** A window of open time on one local date, `HH:mm`. */
export interface OpenWindow {
  open: string;
  close: string;
}

/**
 * The windows the first branch is open on a local date, in time order; none when closed (BR-02).
 * A special day replaces the regular hours; a regular day may have several windows.
 */
export function openingWindows(
  fixture: Pick<TenantFixture, 'branches'>,
  date: string,
): OpenWindow[] {
  const branch = fixture.branches[0];
  if (!branch) return [];
  const special = branch.specialDays.find((d) => d.date === date);
  if (special) return special.hours ? [special.hours] : [];
  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
  return branch.businessHours
    .filter((h) => h.weekday === weekday)
    .map(({ open, close }) => ({ open, close }))
    .sort((a, b) => a.open.localeCompare(b.open));
}

/**
 * Opening hours of the first branch on a local date as one range, from the first window's start to
 * the last one's end; `null` when closed (BR-02). Free times use `openingWindows`, so a break in
 * the middle stays closed.
 */
export function openingHours(fixture: TenantFixture, date: string) {
  const windows = openingWindows(fixture, date);
  const first = windows[0];
  const last = windows.at(-1);
  return first && last ? { open: first.open, close: last.close } : null;
}

/** What a calendar draws for one day: visible range, opening hours, and why it is closed. */
export function dayHours(fixture: TenantFixture, date: string) {
  const branch = fixture.branches[0];
  const hours = openingHours(fixture, date);
  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
  const regular = branch?.businessHours.find((h) => h.weekday === weekday);
  const range = hours ?? regular ?? { open: '08:00', close: '18:00' };
  const special = branch?.specialDays.find((d) => d.date === date);
  const closeHour = Number(range.close.slice(0, 2)) + (range.close.slice(3) === '00' ? 0 : 1);
  return {
    open: hours?.open ?? null,
    close: hours?.close ?? null,
    from: `${range.open.slice(0, 2)}:00`,
    to: `${String(closeHour).padStart(2, '0')}:00`,
    closedLabel: hours ? undefined : `Đóng cửa${special ? `: ${special.note}` : ''}`,
  };
}
