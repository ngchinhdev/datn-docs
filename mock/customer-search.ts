import type { Customer, TenantFixture } from './fixtures/types.ts';

/** Lower case without tone marks, so "nguyen" finds "Nguyễn". */
export const fold = (text: string) =>
  text.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'd').toLowerCase();

const nationalDigits = (e164: string) => e164.replace(/^\+84/, '0');

/**
 * Customers whose phone contains the digits typed (once there are three) or whose name contains
 * the words typed; numbers compare after normalising (BR-61). Phone matches that start with the
 * digits come first.
 */
export function searchCustomers(customers: readonly Customer[], query: string, limit = 5) {
  const digits = query.replace(/\D/g, '');
  const text = fold(query.replace(/[\d\s.+-]/g, ' ')).trim();
  const byPhone = digits.length >= 3;
  if (!byPhone && !text) return [];
  const national = digits.startsWith('84') ? `0${digits.slice(2)}` : digits;
  const scored = customers.flatMap((c) => {
    if (byPhone) {
      const phone = nationalDigits(c.phone);
      const at = phone.indexOf(national);
      return at >= 0 ? [{ c, rank: at }] : [];
    }
    return fold(c.name).includes(text) || fold(c.callName).includes(text) ? [{ c, rank: 0 }] : [];
  });
  return scored
    .sort((a, b) => a.rank - b.rank || a.c.name.localeCompare(b.c.name, 'vi'))
    .slice(0, limit)
    .map((x) => x.c);
}

/** The person who did most of a customer's visits, once there are at least two. */
export function preferredStaffOf(fixture: TenantFixture, customerId: string): string | null {
  const counts = new Map<string, number>();
  for (const a of fixture.appointments) {
    if (a.customerId !== customerId) continue;
    if (a.status !== 'completed' && a.status !== 'checked_in') continue;
    for (const id of new Set(a.items.map((i) => i.staffResourceId))) {
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
  }
  const [top, count] = [...counts.entries()].sort((x, y) => y[1] - x[1])[0] ?? [];
  return top && count && count >= 2 ? top : null;
}
