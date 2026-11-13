import type { Customer, TenantFixture } from './fixtures';
import { normalizePhone } from './format';

/** K of BR-10: no-shows in the last six months after which the next booking needs a deposit. */
export const NO_SHOW_DEPOSIT_THRESHOLD = 2;
const SIX_MONTHS_MS = 183 * 86_400_000;
const DAY_MS = 86_400_000;

export interface CustomerRow {
  id: string;
  name: string;
  /** E.164 (BR-61). */
  phone: string;
  visits: number;
  /** No-shows in the last six months. */
  noShows: number;
  /** ISO 8601, UTC; `null` when they have not come yet. */
  lastVisitAt: string | null;
  /** First confirmed appointment after now. */
  nextAt: string | null;
  /** Staff who did most of the visits, once there are at least two. */
  preferredStaffId: string | null;
  depositRequired: boolean;
  hasNote: boolean;
}

const KEPT_AS_VISIT = new Set(['completed', 'checked_in']);

/** Everything the customer list shows, counted from the appointments of the fixture. */
export function customerRows(fixture: TenantFixture, now: string): CustomerRow[] {
  const nowMs = Date.parse(now);
  const byCustomer = new Map<string, TenantFixture['appointments']>();
  for (const a of fixture.appointments) {
    if (!a.customerId) continue;
    const list = byCustomer.get(a.customerId);
    if (list) list.push(a);
    else byCustomer.set(a.customerId, [a]);
  }

  return fixture.customers.map((c: Customer) => {
    const list = byCustomer.get(c.id) ?? [];
    const visits = list.filter(
      (a) => KEPT_AS_VISIT.has(a.status) && Date.parse(a.startAt) <= nowMs,
    );
    const noShows = list.filter(
      (a) => a.status === 'no_show' && nowMs - Date.parse(a.startAt) <= SIX_MONTHS_MS,
    ).length;
    const upcoming = list
      .filter((a) => a.status === 'confirmed' && Date.parse(a.startAt) > nowMs)
      .map((a) => a.startAt)
      .sort();
    const lastVisitAt =
      visits
        .map((a) => a.startAt)
        .sort()
        .at(-1) ?? null;

    const perStaff = new Map<string, number>();
    for (const a of visits) {
      for (const staffId of new Set(a.items.map((i) => i.staffResourceId))) {
        perStaff.set(staffId, (perStaff.get(staffId) ?? 0) + 1);
      }
    }
    const [top, topCount] = [...perStaff.entries()].sort((x, y) => y[1] - x[1])[0] ?? [];

    return {
      id: c.id,
      name: c.name,
      phone: c.phone,
      visits: visits.length,
      noShows,
      lastVisitAt,
      nextAt: upcoming[0] ?? null,
      preferredStaffId: top && topCount && topCount >= 2 ? top : null,
      depositRequired: noShows >= NO_SHOW_DEPOSIT_THRESHOLD,
      hasNote: Boolean(c.note),
    };
  });
}

/** Lower case without accents, so "ha" finds "Hà" and "dung" finds "Đũng". */
export function fold(text: string) {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase();
}

/**
 * Name: any accent-free match. Phone: digits typed in any form ("0934 567", "+84934567") match
 * the stored E.164 number (BR-61).
 */
export const matchesSearch = (row: CustomerRow, query: string) =>
  matchesPerson(row.name, row.phone, query);

/** The same match for anyone with a name and an E.164 phone number. */
export function matchesPerson(name: string, phone: string, query: string) {
  const text = query.trim();
  if (!text) return true;
  // Each typed word must start a word of the name: "ha" finds Hà and Hải, not Phan or Khánh.
  const words = fold(name).split(/\s+/);
  const typed = fold(text).split(/\s+/);
  if (typed.every((t) => words.some((w) => w.startsWith(t)))) return true;
  if (/[^\d\s+().-]/.test(text)) return false;
  const digits = text.replace(/\D/g, '');
  if (digits.length < 3) return false;
  const international = digits.startsWith('0') ? `84${digits.slice(1)}` : digits;
  const whole = normalizePhone(text);
  return whole ? whole === phone : phone.replace(/\D/g, '').includes(international);
}

export const SORT_KEYS = ['name', 'phone', 'last', 'next', 'visits', 'noShows'] as const;
export type SortKey = (typeof SORT_KEYS)[number];
export const PAGE_SIZES = [20, 50, 100] as const;
export type PageSize = (typeof PAGE_SIZES)[number];
export type VisitFilter = 'all' | '30' | '90' | 'lapsed';

export interface CustomerQuery {
  q: string;
  visit: VisitFilter;
  upcoming: boolean;
  deposit: boolean;
  note: boolean;
  /** Preferred staff resource id, or `''` for anyone. */
  staff: string;
  sort: SortKey;
  dir: 'asc' | 'desc';
  page: number;
  size: PageSize;
}

export const DEFAULT_QUERY: CustomerQuery = {
  q: '',
  visit: 'all',
  upcoming: false,
  deposit: false,
  note: false,
  staff: '',
  sort: 'last',
  dir: 'desc',
  page: 1,
  size: 20,
};

/** Reads the list state from the URL; unknown values fall back to the defaults. */
export function parseCustomerQuery(params: URLSearchParams): CustomerQuery {
  const pick = <T extends string>(value: string | null, allowed: readonly T[], fallback: T) =>
    allowed.find((a) => a === value) ?? fallback;
  const size = Number(params.get('size'));
  const page = Number(params.get('page'));
  return {
    q: params.get('q') ?? '',
    visit: pick(params.get('visit'), ['all', '30', '90', 'lapsed'], 'all'),
    upcoming: params.get('upcoming') === '1',
    deposit: params.get('deposit') === '1',
    note: params.get('note') === '1',
    staff: params.get('staff') ?? '',
    sort: pick(params.get('sort'), SORT_KEYS, DEFAULT_QUERY.sort),
    dir: pick(params.get('dir'), ['asc', 'desc'], DEFAULT_QUERY.dir),
    page: Number.isInteger(page) && page > 0 ? page : 1,
    size: PAGE_SIZES.find((s) => s === size) ?? DEFAULT_QUERY.size,
  };
}

/** Writes only what differs from the defaults, so a plain list has a plain URL. */
export function customerQueryParams(query: CustomerQuery, base?: URLSearchParams) {
  const params = new URLSearchParams(base);
  const set = (key: string, value: string, fallback: string) => {
    if (value === fallback) params.delete(key);
    else params.set(key, value);
  };
  set('q', query.q.trim(), '');
  set('visit', query.visit, DEFAULT_QUERY.visit);
  set('upcoming', query.upcoming ? '1' : '', '');
  set('deposit', query.deposit ? '1' : '', '');
  set('note', query.note ? '1' : '', '');
  set('staff', query.staff, '');
  set('sort', query.sort, DEFAULT_QUERY.sort);
  set('dir', query.dir, DEFAULT_QUERY.dir);
  set('page', String(query.page), '1');
  set('size', String(query.size), String(DEFAULT_QUERY.size));
  return params;
}

/** Number of filters that are on, not counting the search box. */
export function activeFilterCount(query: CustomerQuery) {
  return (
    Number(query.visit !== 'all') +
    Number(query.upcoming) +
    Number(query.deposit) +
    Number(query.note) +
    Number(query.staff !== '')
  );
}

export function filterCustomers(rows: CustomerRow[], query: CustomerQuery, now: string) {
  const nowMs = Date.parse(now);
  const within = (iso: string | null, days: number) =>
    iso !== null && nowMs - Date.parse(iso) <= days * DAY_MS;
  return rows.filter((row) => {
    if (!matchesSearch(row, query.q)) return false;
    if (query.visit === '30' && !within(row.lastVisitAt, 30)) return false;
    if (query.visit === '90' && !within(row.lastVisitAt, 90)) return false;
    if (query.visit === 'lapsed' && (row.lastVisitAt === null || within(row.lastVisitAt, 90))) {
      return false;
    }
    if (query.upcoming && !row.nextAt) return false;
    if (query.deposit && !row.depositRequired) return false;
    if (query.note && !row.hasNote) return false;
    if (query.staff && row.preferredStaffId !== query.staff) return false;
    return true;
  });
}

const collator = new Intl.Collator('vi');

/** Rows without a value (never came, nothing booked) go last in either direction. */
export function sortCustomers(rows: CustomerRow[], sort: SortKey, dir: 'asc' | 'desc') {
  const sign = dir === 'asc' ? 1 : -1;
  const text = (a: string | null, b: string | null) => {
    if (a === b) return 0;
    if (a === null) return 1;
    if (b === null) return -1;
    return sign * (a < b ? -1 : 1);
  };
  return [...rows].sort((a, b) => {
    switch (sort) {
      case 'name':
        return sign * collator.compare(a.name, b.name);
      case 'phone':
        return sign * (a.phone < b.phone ? -1 : 1);
      case 'last':
        return text(a.lastVisitAt, b.lastVisitAt) || collator.compare(a.name, b.name);
      case 'next':
        return text(a.nextAt, b.nextAt) || collator.compare(a.name, b.name);
      case 'visits':
        return sign * (a.visits - b.visits) || collator.compare(a.name, b.name);
      case 'noShows':
        return sign * (a.noShows - b.noShows) || collator.compare(a.name, b.name);
    }
  });
}
