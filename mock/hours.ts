import type { TenantFixture } from './fixtures';

/** Opening hours of the first branch on a local date; `null` when closed (BR-02). */
export function openingHours(fixture: TenantFixture, date: string) {
  const branch = fixture.branches[0];
  if (!branch) return null;
  const special = branch.specialDays.find((d) => d.date === date);
  if (special) return special.hours;
  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
  return branch.businessHours.find((h) => h.weekday === weekday) ?? null;
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
