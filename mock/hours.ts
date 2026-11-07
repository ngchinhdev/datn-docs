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
