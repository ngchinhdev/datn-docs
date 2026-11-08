/*
 * Seeded customers for the list screens. Names are made of common Vietnamese family, middle and
 * given names; the same seed gives the same people on every run.
 */
import { seeded } from './generate.ts';
import type { Appointment, Customer, ServedSubject } from './types.ts';

const FAMILY = [
  'Nguyễn',
  'Trần',
  'Lê',
  'Phạm',
  'Hoàng',
  'Huỳnh',
  'Phan',
  'Vũ',
  'Võ',
  'Đặng',
  'Bùi',
  'Đỗ',
  'Hồ',
  'Ngô',
  'Dương',
  'Lý',
  'Trịnh',
  'Đinh',
  'Lâm',
  'Tạ',
  'Cao',
  'Châu',
  'Tô',
  'Mai',
];
const FEMALE = {
  middle: ['Thị', 'Thu', 'Ngọc', 'Bảo', 'Kim', 'Diễm', 'Hồng', 'Tú', 'Khánh', 'Thanh', 'Mỹ'],
  given: [
    'Hà',
    'Linh',
    'Lan',
    'Trang',
    'Hương',
    'Nhi',
    'Vy',
    'Chi',
    'My',
    'Thảo',
    'Quyên',
    'Hân',
    'Mai',
    'Phương',
    'Yến',
    'Nga',
    'Hằng',
    'Vân',
    'Ngân',
    'Trinh',
    'Tâm',
    'Uyên',
    'Oanh',
    'Loan',
    'Dung',
    'Hoa',
    'Lam',
    'Châu',
    'Hạnh',
    'Anh',
  ],
  call: 'Chị',
};
const MALE = {
  middle: ['Văn', 'Minh', 'Hữu', 'Quốc', 'Gia', 'Anh', 'Hoài', 'Đức', 'Tấn', 'Thành', 'Bảo'],
  given: [
    'Tuấn',
    'Phúc',
    'Khánh',
    'Duy',
    'Kha',
    'Sang',
    'Vĩ',
    'Nam',
    'Trí',
    'Hùng',
    'Long',
    'Bình',
    'Hiếu',
    'Đạt',
    'Khoa',
    'Phát',
    'Quân',
    'Tài',
    'Thịnh',
    'Việt',
    'Lộc',
    'Nhân',
    'Huy',
    'Dũng',
    'An',
    'Hải',
  ],
  call: 'Anh',
};
/** Mobile prefixes after +84, so every number is a plausible 9-digit mobile (BR-61: stored as E.164). */
const PHONE_PREFIX = ['90', '93', '91', '94', '98', '97', '96', '86', '77', '78', '79', '70', '76'];

export interface PeopleConfig {
  seed: number;
  /** Ids look like `${prefix}-c-g1`. */
  prefix: string;
  tenantId: string;
  count: number;
  /** Names and numbers already taken by hand-written customers. */
  existing: Customer[];
  /** Internal notes (BR-62) given to about one customer in ten. */
  notes: string[];
  /** Builds the served subjects of one customer. */
  subjects: (rand: () => number, customer: Customer, n: number) => ServedSubject[];
}

export function generatePeople(cfg: PeopleConfig): {
  customers: Customer[];
  subjects: ServedSubject[];
} {
  const rand = seeded(cfg.seed);
  const pick = <T>(xs: readonly T[]) => xs[Math.floor(rand() * xs.length)]!;
  const names = new Set(cfg.existing.map((c) => c.name));
  const phones = new Set(cfg.existing.map((c) => c.phone));
  const customers: Customer[] = [];
  const subjects: ServedSubject[] = [];

  for (let n = 1; customers.length < cfg.count; n++) {
    const gender = rand() < 0.62 ? FEMALE : MALE;
    const name = `${pick(FAMILY)} ${pick(gender.middle)} ${pick(gender.given)}`;
    // Every so often a long name: it must fit a table cell and a card.
    const long = rand() < 0.03 ? ` ${pick(gender.given)} ${pick(FAMILY)}` : '';
    const full = name + long;
    const phone = `+84${pick(PHONE_PREFIX)}${String(Math.floor(rand() * 10_000_000)).padStart(7, '0')}`;
    if (names.has(full) || phones.has(phone)) continue;
    names.add(full);
    phones.add(phone);
    const given = full.split(' ').slice(-1)[0]!;
    const customer: Customer = {
      id: `${cfg.prefix}-c-g${n}`,
      tenantId: cfg.tenantId,
      name: full,
      callName: `${gender.call} ${given}`,
      phone,
      ...(rand() < 0.1 ? { note: pick(cfg.notes) } : {}),
    };
    customers.push(customer);
    subjects.push(...cfg.subjects(rand, customer, n));
  }
  return { customers, subjects };
}

/** Sets `visitCount` from the appointments: those that were checked in or completed. */
export function withVisitCounts(customers: Customer[], appointments: Appointment[]): Customer[] {
  const counts = new Map<string, number>();
  for (const a of appointments) {
    if (a.customerId && (a.status === 'completed' || a.status === 'checked_in')) {
      counts.set(a.customerId, (counts.get(a.customerId) ?? 0) + 1);
    }
  }
  return customers.map((c) => ({ ...c, visitCount: counts.get(c.id) ?? 0 }));
}
