/*
 * The tenants of the platform as the platform administration sees them (BR-89): who they are, their
 * plan, and totals; never their appointments, customers or invoices. Four of them are the tenants
 * of `accounts.ts` (`may`, `pawpaw`, `havy`, `bong`, same ids); the rest are only data.
 */
import {
  DEFAULT_CATALOG,
  TRIAL_DAYS,
  daysLeft,
  periodEnd,
  periodPrice,
  upgradeCharge,
  type PeriodMonths,
  type PlanCode,
  type Subscription,
} from '../subscription.ts';
import { addDays } from '../time.ts';
import type { AuditEntry } from './types.ts';

export type IndustryId = 'hair_salon' | 'pet_spa';

export interface PlatformPayment {
  id: string;
  /** Local date `YYYY-MM-DD`. */
  date: string;
  label: string;
  /** Integer VND; 0 for a manual extension (BR-91). */
  amountVnd: bigint;
  /** `QR · SP-2610-0091`, or `Quản trị` for what the admin did. */
  source: string;
}

/** Totals the platform may read about a tenant (BR-89). */
export interface TenantTotals {
  branches: number;
  members: number;
  /** Members with a column on the calendar. */
  takingBookings: number;
  /** Appointments dated this month up to today, every status but cancelled. */
  appointmentsMonth: number;
  appointments30: number;
  /** Customers saved. */
  customers: number;
  /** Appointments still to come. */
  upcoming: number;
  /** Booked for after the plan ended, still readable (BR-82). */
  afterExpiry: number;
}

export interface PlatformTenant {
  id: string;
  slug: string;
  name: string;
  industry: IndustryId;
  /** Version of the industry template the tenant was created from (BR-70). */
  templateVersion: number;
  /** Local date. */
  createdOn: string;
  ownerName: string;
  ownerEmail: string;
  /** ISO 8601, UTC. */
  ownerLastLoginAt: string;
  /** Length of the period paid last, for "Chuyên nghiệp, 1 tháng". */
  planMonths: PeriodMonths;
  subscription: Subscription;
  totals: TenantTotals;
  /** Newest first. */
  payments: PlatformPayment[];
}

/** One thing the platform admin did: lock, unlock, extend, change the plans (BR-63, BR-75). */
export interface PlatformLogEntry extends AuditEntry {
  /** The tenant it concerns; `null` for the plans. */
  tenantId: string | null;
  /** What the admin wrote; only the platform sees it (BR-90, BR-91). */
  reason?: string;
}

export const PLATFORM_ADMIN = { name: 'Chính Nguyễn', role: 'Quản trị nền tảng' };

const catalog = DEFAULT_CATALOG;

const counters: Record<string, number> = {};
/** `SP-2611-0101`: the reference of a payment made through the gateway. */
function reference(date: string): string {
  const key = `${date.slice(2, 4)}${date.slice(5, 7)}`;
  counters[key] = (counters[key] ?? 100) + 1;
  return `SP-${key}-${String(counters[key]).padStart(4, '0')}`;
}

/**
 * Payments of a tenant that pays each period the day the one before ends, so the end of the last
 * period follows from the dates. `renewFirst` calls the first a renewal, not an activation.
 */
function chain(
  tenantId: string,
  plan: PlanCode,
  first: string,
  months: PeriodMonths[],
  options: { refs?: string[]; renewFirst?: boolean } = {},
): { payments: PlatformPayment[]; endsOn: string; lastMonths: PeriodMonths } {
  const payments: PlatformPayment[] = [];
  let start = first;
  let endsOn = first;
  months.forEach((m, i) => {
    endsOn = periodEnd(start, m);
    const verb = i === 0 && !options.renewFirst ? 'Kích hoạt' : 'Gia hạn';
    payments.push({
      id: `pay-${tenantId}-${start}`,
      date: start,
      label: `${verb} ${catalog.plans[plan].name}, ${m} tháng`,
      amountVnd: periodPrice(catalog.plans[plan], m, catalog.periods),
      source: `QR · ${options.refs?.[i] ?? reference(start)}`,
    });
    start = addDays(endsOn, 1);
  });
  return { payments, endsOn, lastMonths: months.at(-1) ?? 1 };
}

const newestFirst = (list: PlatformPayment[]) =>
  [...list].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));

type Base = Omit<PlatformTenant, 'subscription' | 'payments' | 'planMonths' | 'totals'> & {
  totals: Partial<TenantTotals> &
    Pick<TenantTotals, 'branches' | 'members' | 'takingBookings' | 'customers'>;
};

const totalsOf = (t: Base['totals']): TenantTotals => ({
  appointmentsMonth: 0,
  appointments30: 0,
  upcoming: 0,
  afterExpiry: 0,
  ...t,
});

function paid(
  base: Base,
  plan: PlanCode,
  first: string,
  months: PeriodMonths[],
  options?: { refs?: string[]; renewFirst?: boolean },
): PlatformTenant {
  const c = chain(base.id, plan, first, months, options);
  return {
    ...base,
    totals: totalsOf(base.totals),
    planMonths: c.lastMonths,
    subscription: { planCode: plan, trialEndsOn: null, periodEndsOn: c.endsOn },
    payments: newestFirst(c.payments),
  };
}

/** A tenant still on its trial: every feature of Professional, 7 days from the day it was created (BR-80). */
function trialing(base: Base): PlatformTenant {
  return {
    ...base,
    totals: totalsOf(base.totals),
    planMonths: 1,
    subscription: {
      planCode: 'pro',
      trialEndsOn: addDays(base.createdOn, TRIAL_DAYS - 1),
      periodEndsOn: null,
    },
    payments: [],
  };
}

// ---------------------------------------------------------------------------------------------
// Tóc Mây: a manual extension on 22/09 sits between two paid periods.

const mayFirst = chain('may', 'pro', '2026-08-22', [1], { refs: ['SP-2608-0019'] });
const maySecond = chain('may', 'pro', '2026-09-29', [1, 1], {
  refs: ['SP-2609-0057', 'SP-2610-0091'],
  renewFirst: true,
});

const salonTocMay: PlatformTenant = {
  id: 'may',
  slug: 'toc-may',
  name: 'Salon Tóc Mây',
  industry: 'hair_salon',
  templateVersion: 3,
  createdOn: '2026-08-15',
  ownerName: 'Chính Nguyễn',
  ownerEmail: 'chinh@tocmay.vn',
  ownerLastLoginAt: '2026-11-07T03:02:00Z',
  planMonths: 1,
  subscription: { planCode: 'pro', trialEndsOn: null, periodEndsOn: maySecond.endsOn },
  totals: totalsOf({
    branches: 1,
    members: 5,
    takingBookings: 3,
    appointmentsMonth: 138,
    appointments30: 612,
    customers: 1284,
    upcoming: 41,
  }),
  payments: newestFirst([
    ...mayFirst.payments,
    {
      id: 'pay-may-2026-09-22',
      date: '2026-09-22',
      label: 'Gia hạn thủ công 7 ngày',
      amountVnd: 0n,
      source: 'Quản trị',
    },
    ...maySecond.payments,
  ]),
};

// ---------------------------------------------------------------------------------------------
// Moc: paid Basic on 25/10, moved up to Professional on 05/11 for the days left (BR-85).

const mocBase = chain('toc-moc-q10', 'basic', '2026-10-25', [1]);
const MOC_UPGRADE_ON = '2026-11-05';

const tocMocQuan10: PlatformTenant = {
  id: 'toc-moc-q10',
  slug: 'toc-moc-q10',
  name: 'Tóc Mộc Quận 10',
  industry: 'hair_salon',
  templateVersion: 3,
  createdOn: '2026-09-12',
  ownerName: 'Lý Thanh Mộc',
  ownerEmail: 'moc.ly@email.vn',
  ownerLastLoginAt: '2026-11-06T13:40:00Z',
  planMonths: 1,
  subscription: { planCode: 'pro', trialEndsOn: null, periodEndsOn: mocBase.endsOn },
  totals: totalsOf({
    branches: 2,
    members: 6,
    takingBookings: 4,
    appointmentsMonth: 99,
    appointments30: 360,
    customers: 640,
    upcoming: 28,
  }),
  payments: newestFirst([
    ...mocBase.payments,
    {
      id: `pay-toc-moc-q10-${MOC_UPGRADE_ON}`,
      date: MOC_UPGRADE_ON,
      label: 'Nâng lên Chuyên nghiệp',
      amountVnd: upgradeCharge(
        catalog.plans.basic,
        catalog.plans.pro,
        daysLeft(mocBase.endsOn, MOC_UPGRADE_ON),
      ),
      source: `QR · ${reference(MOC_UPGRADE_ON)}`,
    },
  ]),
};

// ---------------------------------------------------------------------------------------------

/** The 23 tenants; 15 pay, 5 try, 3 let their plan run out, on `MOCK_NOW`. */
export const platformTenants: PlatformTenant[] = [
  salonTocMay,
  paid(
    {
      id: 'pawpaw',
      slug: 'pawpaw',
      name: 'Spa thú cưng Pawpaw',
      industry: 'pet_spa',
      templateVersion: 1,
      createdOn: '2026-09-20',
      ownerName: 'Lê Thu Hà',
      ownerEmail: 'ha.le@pawpaw.vn',
      ownerLastLoginAt: '2026-11-07T01:30:00Z',
      totals: {
        branches: 1,
        members: 4,
        takingBookings: 2,
        appointmentsMonth: 96,
        appointments30: 380,
        customers: 540,
        upcoming: 24,
      },
    },
    'basic',
    '2026-09-29',
    [1, 1],
  ),
  trialing({
    id: 'barber-pho-co',
    slug: 'barber-pho-co',
    name: 'Barber Phố Cổ',
    industry: 'hair_salon',
    templateVersion: 3,
    createdOn: '2026-11-06',
    ownerName: 'Nguyễn Minh Đức',
    ownerEmail: 'duc.barber@email.vn',
    ownerLastLoginAt: '2026-11-07T02:15:00Z',
    totals: { branches: 1, members: 1, takingBookings: 1, customers: 0 },
  }),
  trialing({
    id: 'pet-house-q7',
    slug: 'pethouse-q7',
    name: 'Pet House Quận 7',
    industry: 'pet_spa',
    templateVersion: 2,
    createdOn: '2026-11-06',
    ownerName: 'Trần Hoài An',
    ownerEmail: 'an.pethouse@email.vn',
    ownerLastLoginAt: '2026-11-06T11:20:00Z',
    totals: { branches: 1, members: 2, takingBookings: 1, customers: 0 },
  }),
  trialing({
    id: 'bong',
    slug: 'tiem-goi-bong',
    name: 'Tiệm gội Bống',
    industry: 'hair_salon',
    templateVersion: 3,
    createdOn: '2026-11-05',
    ownerName: 'Bống Trần',
    ownerEmail: 'bong.tran@email.vn',
    ownerLastLoginAt: '2026-11-07T00:50:00Z',
    totals: { branches: 1, members: 1, takingBookings: 1, customers: 0 },
  }),
  trialing({
    id: 'barber-anh-tuan',
    slug: 'barber-anh-tuan',
    name: 'Barber Anh Tuấn',
    industry: 'hair_salon',
    templateVersion: 3,
    createdOn: '2026-11-04',
    ownerName: 'Phạm Anh Tuấn',
    ownerEmail: 'tuan.barber@email.vn',
    ownerLastLoginAt: '2026-11-06T09:05:00Z',
    totals: { branches: 1, members: 2, takingBookings: 2, customers: 0 },
  }),
  trialing({
    id: 'spa-meo-u',
    slug: 'spa-meo-u',
    name: 'Spa Mèo Ú',
    industry: 'pet_spa',
    templateVersion: 2,
    createdOn: '2026-11-02',
    ownerName: 'Hoàng Thị Mèo',
    ownerEmail: 'meou.spa@email.vn',
    ownerLastLoginAt: '2026-11-06T14:30:00Z',
    totals: { branches: 1, members: 2, takingBookings: 1, customers: 0 },
  }),
  paid(
    {
      id: 'tocdep-td',
      slug: 'tocdep-td',
      name: 'Tóc Đẹp Thủ Đức',
      industry: 'hair_salon',
      templateVersion: 3,
      createdOn: '2026-08-10',
      ownerName: 'Đỗ Minh Quang',
      ownerEmail: 'quang.tocdep@email.vn',
      ownerLastLoginAt: '2026-11-07T01:10:00Z',
      totals: {
        branches: 2,
        members: 7,
        takingBookings: 5,
        appointmentsMonth: 121,
        appointments30: 540,
        customers: 960,
        upcoming: 36,
      },
    },
    'pro',
    '2026-08-10',
    [1, 1, 1],
  ),
  paid(
    {
      id: 'xinh',
      slug: 'nailxinh247',
      name: 'Nail Xinh 247',
      industry: 'hair_salon',
      templateVersion: 2,
      createdOn: '2026-09-01',
      ownerName: 'Võ Thị Xinh',
      ownerEmail: 'xinh247@email.vn',
      ownerLastLoginAt: '2026-11-06T14:14:00Z',
      totals: {
        branches: 1,
        members: 6,
        takingBookings: 4,
        appointmentsMonth: 41,
        appointments30: 190,
        customers: 402,
        upcoming: 14,
      },
    },
    'basic',
    '2026-09-16',
    [3],
    { refs: ['SP-2609-0031'] },
  ),
  paid(
    {
      id: 'havy',
      slug: 'nail-ha-vy',
      name: 'Nail Hạ Vy',
      industry: 'hair_salon',
      templateVersion: 2,
      createdOn: '2026-08-25',
      ownerName: 'Đặng Hạ Vy',
      ownerEmail: 'havy.nail@email.vn',
      ownerLastLoginAt: '2026-11-07T01:47:00Z',
      totals: {
        branches: 1,
        members: 3,
        takingBookings: 1,
        appointments30: 190,
        customers: 330,
        afterExpiry: 9,
      },
    },
    'basic',
    '2026-09-01',
    [1, 1],
    { refs: ['SP-2609-0001', 'SP-2610-0002'] },
  ),
  paid(
    {
      id: 'toc-xinh-gv',
      slug: 'toc-xinh-gv',
      name: 'Tóc Xinh Gò Vấp',
      industry: 'hair_salon',
      templateVersion: 3,
      createdOn: '2026-11-03',
      ownerName: 'Ngô Thị Xinh',
      ownerEmail: 'xinh.gv@email.vn',
      ownerLastLoginAt: '2026-11-07T02:40:00Z',
      totals: {
        branches: 1,
        members: 3,
        takingBookings: 2,
        appointmentsMonth: 24,
        appointments30: 24,
        customers: 31,
        upcoming: 9,
      },
    },
    'basic',
    '2026-11-04',
    [1],
  ),
  paid(
    {
      id: 'toc-sg-xua',
      slug: 'toc-sg-xua',
      name: 'Salon Tóc Sài Gòn Xưa',
      industry: 'hair_salon',
      templateVersion: 2,
      createdOn: '2026-07-20',
      ownerName: 'Vũ Quốc Bảo',
      ownerEmail: 'bao.sgxua@email.vn',
      ownerLastLoginAt: '2026-11-07T02:05:00Z',
      totals: {
        branches: 3,
        members: 11,
        takingBookings: 8,
        appointmentsMonth: 156,
        appointments30: 640,
        customers: 1510,
        upcoming: 52,
      },
    },
    'pro',
    '2026-08-03',
    [1, 1, 1, 1],
  ),
  paid(
    {
      id: 'an-nhien',
      slug: 'an-nhien',
      name: 'Tiệm Cắt Tóc An Nhiên',
      industry: 'hair_salon',
      templateVersion: 3,
      createdOn: '2026-08-02',
      ownerName: 'Bùi An Nhiên',
      ownerEmail: 'nhien.an@email.vn',
      ownerLastLoginAt: '2026-11-06T10:25:00Z',
      totals: {
        branches: 1,
        members: 4,
        takingBookings: 3,
        appointmentsMonth: 84,
        appointments30: 330,
        customers: 700,
        upcoming: 22,
      },
    },
    'basic',
    '2026-08-03',
    [1, 1, 1, 1],
  ),
  paid(
    {
      id: 'hair-lua',
      slug: 'hair-lua',
      name: 'Hair Studio Lụa',
      industry: 'hair_salon',
      templateVersion: 3,
      createdOn: '2026-10-28',
      ownerName: 'Trương Thu Lụa',
      ownerEmail: 'lua.studio@email.vn',
      ownerLastLoginAt: '2026-11-07T00:20:00Z',
      totals: {
        branches: 1,
        members: 3,
        takingBookings: 2,
        appointmentsMonth: 52,
        appointments30: 120,
        customers: 210,
        upcoming: 17,
      },
    },
    'basic',
    '2026-11-04',
    [12],
  ),
  paid(
    {
      id: 'kim-ngan',
      slug: 'kim-ngan',
      name: 'Nail & Hair Kim Ngân',
      industry: 'hair_salon',
      templateVersion: 3,
      createdOn: '2026-08-28',
      ownerName: 'Lương Kim Ngân',
      ownerEmail: 'ngan.kim@email.vn',
      ownerLastLoginAt: '2026-11-06T16:00:00Z',
      totals: {
        branches: 1,
        members: 4,
        takingBookings: 3,
        appointmentsMonth: 67,
        appointments30: 280,
        customers: 530,
        upcoming: 19,
      },
    },
    'basic',
    '2026-09-01',
    [1, 1, 1],
  ),
  tocMocQuan10,
  paid(
    {
      id: 'barber-hem-25',
      slug: 'barber-hem-25',
      name: 'Barber Hẻm 25',
      industry: 'hair_salon',
      templateVersion: 3,
      createdOn: '2026-10-01',
      ownerName: 'Đinh Công Hẻm',
      ownerEmail: 'hem25.barber@email.vn',
      ownerLastLoginAt: '2026-11-07T01:55:00Z',
      totals: {
        branches: 1,
        members: 3,
        takingBookings: 2,
        appointmentsMonth: 38,
        appointments30: 150,
        customers: 260,
        upcoming: 12,
      },
    },
    'basic',
    '2026-10-05',
    [1, 1],
  ),
  paid(
    {
      id: 'salon-bao-chau',
      slug: 'salon-bao-chau',
      name: 'Salon Bảo Châu',
      industry: 'hair_salon',
      templateVersion: 3,
      createdOn: '2026-09-30',
      ownerName: 'Phan Bảo Châu',
      ownerEmail: 'chau.salon@email.vn',
      ownerLastLoginAt: '2026-11-07T02:30:00Z',
      totals: {
        branches: 2,
        members: 7,
        takingBookings: 5,
        appointmentsMonth: 110,
        appointments30: 450,
        customers: 780,
        upcoming: 31,
      },
    },
    'pro',
    '2026-10-06',
    [1, 1],
  ),
  paid(
    {
      id: 'toc-nha-minh',
      slug: 'toc-nha-minh',
      name: 'Tóc Nhà Mình',
      industry: 'hair_salon',
      templateVersion: 2,
      createdOn: '2026-08-30',
      ownerName: 'Cao Nhật Minh',
      ownerEmail: 'minh.nhatoc@email.vn',
      ownerLastLoginAt: '2026-11-02T09:00:00Z',
      totals: {
        branches: 1,
        members: 2,
        takingBookings: 1,
        appointments30: 60,
        customers: 120,
        afterExpiry: 3,
      },
    },
    'basic',
    '2026-09-02',
    [1, 1],
  ),
  paid(
    {
      id: 'thu-cung-bong-bong',
      slug: 'bong-bong',
      name: 'Thú Cưng Bông Bông',
      industry: 'pet_spa',
      templateVersion: 2,
      createdOn: '2026-09-02',
      ownerName: 'Lâm Bông',
      ownerEmail: 'bong.pet@email.vn',
      ownerLastLoginAt: '2026-11-07T00:40:00Z',
      totals: {
        branches: 2,
        members: 5,
        takingBookings: 3,
        appointmentsMonth: 74,
        appointments30: 220,
        customers: 380,
        upcoming: 21,
      },
    },
    'pro',
    '2026-10-05',
    [1, 3],
  ),
  paid(
    {
      id: 'happy-paws',
      slug: 'happy-paws',
      name: 'Spa Chó Mèo Happy Paws',
      industry: 'pet_spa',
      templateVersion: 2,
      createdOn: '2026-09-14',
      ownerName: 'Mai Hạnh Phúc',
      ownerEmail: 'phuc.paws@email.vn',
      ownerLastLoginAt: '2026-11-06T12:10:00Z',
      totals: {
        branches: 1,
        members: 3,
        takingBookings: 2,
        appointmentsMonth: 61,
        appointments30: 250,
        customers: 290,
        upcoming: 15,
      },
    },
    'basic',
    '2026-10-02',
    [1, 1],
  ),
  paid(
    {
      id: 'pet-spa-go-vap',
      slug: 'pet-spa-gv',
      name: 'Pet Spa Gò Vấp',
      industry: 'pet_spa',
      templateVersion: 1,
      createdOn: '2026-09-29',
      ownerName: 'Tạ Gia Huy',
      ownerEmail: 'huy.petgv@email.vn',
      ownerLastLoginAt: '2026-11-07T01:00:00Z',
      totals: {
        branches: 1,
        members: 2,
        takingBookings: 1,
        appointmentsMonth: 33,
        appointments30: 90,
        customers: 140,
        upcoming: 8,
      },
    },
    'basic',
    '2026-10-06',
    [1, 3],
  ),
  paid(
    {
      id: 'spa-thu-cung-mimi',
      slug: 'mimi-pet',
      name: 'Spa Thú Cưng Mimi',
      industry: 'pet_spa',
      templateVersion: 1,
      createdOn: '2026-09-18',
      ownerName: 'Dương Mi Mi',
      ownerEmail: 'mimi.pet@email.vn',
      ownerLastLoginAt: '2026-10-30T08:30:00Z',
      totals: {
        branches: 1,
        members: 2,
        takingBookings: 1,
        appointments30: 120,
        customers: 175,
        afterExpiry: 2,
      },
    },
    'basic',
    '2026-09-20',
    [1],
  ),
];

/** Locks the platform already holds on `MOCK_NOW`, by tenant id (BR-75). */
export const SEED_LOCKS: Record<string, { at: string; reason: string }> = {
  xinh: {
    at: '2026-11-06T15:05:00Z',
    reason:
      'Trang đặt lịch quảng cáo dịch vụ không được phép theo mục 4.2 điều khoản sử dụng. Gỡ nội dung đó và trả lời email hotro@sapio.vn để được mở lại.',
  },
};

/** What the admin did before `MOCK_NOW`, oldest first. */
export const SEED_LOG: PlatformLogEntry[] = [
  {
    id: 'pl-1',
    at: '2026-09-22T08:40:00Z',
    by: PLATFORM_ADMIN.name,
    role: PLATFORM_ADMIN.role,
    action: 'Gia hạn thủ công',
    object: 'Salon Tóc Mây',
    detail: '7 ngày: hạn 21/09 → 28/09',
    tenantId: 'may',
    reason: 'Chủ cơ sở đang đổi tài khoản ngân hàng, hẹn thanh toán trước 28/09.',
  },
  {
    id: 'pl-2',
    at: SEED_LOCKS.xinh!.at,
    by: PLATFORM_ADMIN.name,
    role: PLATFORM_ADMIN.role,
    action: 'Khóa cơ sở',
    object: 'Nail Xinh 247',
    detail: 'Khóa; gói vẫn chạy đến 15/12/2026',
    tenantId: 'xinh',
    reason: SEED_LOCKS.xinh!.reason,
  },
];
