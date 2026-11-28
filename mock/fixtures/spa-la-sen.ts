import { appointmentBuilder } from './bookings.ts';
import { dateRange, generateWeek } from './generate.ts';
import { generatePeople, withVisitCounts } from './people.ts';
import { laSenMoney } from './la-sen-money.ts';
import { laSenConfig } from './shop-config.ts';
import { spaServices as services } from './la-sen-services.ts';
import { beautySpaTemplate } from './templates.ts';
import type {
  Appointment,
  Branch,
  BusinessHours,
  Customer,
  Shift,
  Staff,
  StaffTimeOff,
  TenantFixture,
  Weekday,
} from './types.ts';

const tenantId = 'la-sen';
const branchId = 'sen-q7';

const mondayToSaturday = (
  open: BusinessHours['open'],
  close: BusinessHours['close'],
): BusinessHours[] =>
  ([1, 2, 3, 4, 5, 6] as Weekday[]).map((weekday) => ({ weekday, open, close }));

const resources = [
  { id: 'sen-thao', tenantId, branchId, resourceTypeId: 'sen-rt-tech', name: 'Thảo' },
  { id: 'sen-ngan', tenantId, branchId, resourceTypeId: 'sen-rt-tech', name: 'Ngân' },
  { id: 'sen-bed-1', tenantId, branchId, resourceTypeId: 'sen-rt-bed', name: 'Giường 1' },
  { id: 'sen-bed-2', tenantId, branchId, resourceTypeId: 'sen-rt-bed', name: 'Giường 2' },
  { id: 'sen-tub-1', tenantId, branchId, resourceTypeId: 'sen-rt-tub', name: 'Bồn 1' },
  { id: 'sen-tub-2', tenantId, branchId, resourceTypeId: 'sen-rt-tub', name: 'Bồn 2' },
  { id: 'sen-steam-1', tenantId, branchId, resourceTypeId: 'sen-rt-steam', name: 'Phòng xông 1' },
  { id: 'sen-steam-2', tenantId, branchId, resourceTypeId: 'sen-rt-steam', name: 'Phòng xông 2' },
];

const allServices = ['sen-mud', 'sen-massage', 'sen-facial', 'sen-hairwash'];

const staffList: Staff[] = [
  {
    resourceId: 'sen-thao',
    profile: {
      displayName: 'Thảo',
      title: 'Kỹ thuật viên chính',
      specialty: 'ngâm bùn, massage',
      bookableOnline: true,
      fullName: 'Phạm Thanh Thảo',
      employeeCode: 'LS-001',
      phone: '+84902000001',
      email: 'thao@lasen.vn',
      joinedAt: '2024-08',
    },
    role: 'technician',
    level: 2,
    skillServiceIds: allServices,
  },
  {
    resourceId: 'sen-ngan',
    profile: {
      displayName: 'Ngân',
      title: 'Kỹ thuật viên',
      specialty: 'chăm sóc da',
      bookableOnline: true,
      fullName: 'Đặng Bảo Ngân',
      employeeCode: 'LS-002',
      phone: '+84902000002',
      email: 'ngan@lasen.vn',
      joinedAt: '2025-04',
    },
    role: 'technician',
    level: 1,
    skillServiceIds: allServices,
  },
];

const appointment = appointmentBuilder({
  tenantId,
  branchId,
  services,
  resources,
  staff: staffList,
});

const regulars: Customer[] = [
  {
    id: 'sen-c-linh',
    tenantId,
    name: 'Phạm Khánh Linh',
    callName: 'Chị Linh',
    phone: '+84909111222',
    email: 'linh@example.com',
    consentAt: '2026-10-12T03:00:00Z',
  },
  { id: 'sen-c-duc', tenantId, name: 'Võ Minh Đức', callName: 'Anh Đức', phone: '+84938333444' },
];

// Customers who appear on the rest of the week. [key, name, call name]
const others: Customer[] = (
  [
    ['hoa', 'Nguyễn Thị Hoa', 'Chị Hoa'],
    ['nam', 'Trần Hoài Nam', 'Anh Nam'],
    ['quynh', 'Lê Diễm Quỳnh', 'Chị Quỳnh'],
    ['tri', 'Phạm Minh Trí', 'Anh Trí'],
    ['yen', 'Võ Hải Yến', 'Chị Yến'],
    ['phat', 'Đỗ Tấn Phát', 'Anh Phát'],
    ['uyen', 'Huỳnh Tú Uyên', 'Chị Uyên'],
  ] as const
).map(([key, name, callName], i) => ({
  id: `sen-c-${key}`,
  tenantId,
  name,
  callName,
  phone: `+8490500${1000 + i}`,
  visitCount: 1 + (i % 4),
}));

// The week 02/11–08/11 books only the customers above; the rest come in earlier and later weeks.
const weekCustomers = [...regulars, ...others];
const people = generatePeople({
  seed: 20261103,
  prefix: 'sen',
  tenantId,
  count: 51,
  existing: weekCustomers,
  notes: [
    'Da nhạy cảm, dùng tinh dầu nhẹ.',
    'Đau vai gáy, massage lực vừa.',
    'Không dùng tinh dầu sả, dị ứng mùi.',
    'Hay đến sớm 10 phút, mời trà trước.',
  ],
});
const everyone = [...weekCustomers, ...people];

const at = (hhmm: string) => new Date(`2026-11-07T${hhmm}:00+07:00`).toISOString();

// Saturday 07/11/2026 at Lá Sen: now is 10:20. At 11:00 both steam rooms are taken for the part
// the guest steams (11:30–12:20), so no mud treatment starts then, whoever does it.
const saturday: Appointment[] = [
  // Two friends booked together (group booking).
  appointment(
    'sen-a-group',
    'sen-c-quynh',
    at('08:00'),
    'completed',
    [
      {
        variantId: 'sen-massage-60',
        resourceIds: ['sen-thao', 'sen-bed-1'],
      },
      {
        variantId: 'sen-massage-60',
        guestName: 'Thu Hằng',
        resourceIds: ['sen-ngan', 'sen-bed-2'],
        startAt: at('08:00'),
      },
    ],
    { settled: true },
  ),
  appointment(
    'sen-a-linh',
    'sen-c-linh',
    at('09:00'),
    'checked_in',
    [
      {
        variantId: 'sen-mud-std',
        resourceIds: ['sen-thao', 'sen-tub-1', 'sen-steam-1'],
      },
    ],
    {
      checkedInAt: at('08:56'),
      depositVnd: 100_000n,
      depositRef: 'PG-8A3K1',
      depositPaidAt: '2026-11-06T06:10:00Z',
    },
  ),
  // The steam room stays busy while Ngân is free (BR-05).
  appointment(
    'sen-a-hoa',
    'sen-c-hoa',
    at('09:30'),
    'checked_in',
    [
      {
        variantId: 'sen-mud-std',
        resourceIds: ['sen-ngan', 'sen-tub-2', 'sen-steam-2'],
      },
    ],
    { checkedInAt: at('09:25'), depositVnd: 100_000n },
  ),
  appointment(
    'sen-a-duc',
    'sen-c-duc',
    at('10:30'),
    'confirmed',
    [
      {
        variantId: 'sen-mud-std',
        resourceIds: ['sen-thao', 'sen-tub-1', 'sen-steam-1'],
      },
    ],
    { depositVnd: 100_000n },
  ),
  appointment(
    'sen-a-nam',
    'sen-c-nam',
    at('11:00'),
    'confirmed',
    [
      {
        variantId: 'sen-mud-std',
        resourceIds: ['sen-ngan', 'sen-tub-2', 'sen-steam-2'],
      },
    ],
    { depositVnd: 100_000n },
  ),
  appointment(
    'sen-a-tri',
    'sen-c-tri',
    at('13:30'),
    'confirmed',
    [
      {
        variantId: 'sen-facial-std',
        resourceIds: ['sen-thao', 'sen-bed-1'],
        staffChoice: 'chosen',
      },
    ],
    { note: 'Da nhạy cảm, dùng sản phẩm dịu nhẹ.' },
  ),
  appointment('sen-a-yen', 'sen-c-yen', at('14:30'), 'confirmed', [
    {
      variantId: 'sen-massage-90',
      resourceIds: ['sen-ngan', 'sen-bed-2'],
    },
  ]),
  appointment('sen-a-phat', 'sen-c-phat', at('15:30'), 'confirmed', [
    {
      variantId: 'sen-hairwash-std',
      resourceIds: ['sen-thao', 'sen-bed-1'],
    },
  ]),
];

/** Local `YYYY-MM-DD` and `HH:mm` as a UTC instant. */
const atDay = (date: string, hhmm: string) => new Date(`${date}T${hhmm}:00+07:00`).toISOString();

const staffTimeOff: StaffTimeOff[] = [
  // Pending: Ngân off Thursday 12/11 with two appointments.
  {
    id: 'sen-lv-1',
    resourceId: 'sen-ngan',
    date: '2026-11-12',
    reason: 'Đi khám sức khỏe',
    status: 'pending',
    sentAt: atDay('2026-11-06', '16:20'),
  },
];

// Shifts: today and the weeks 09/11 and 16/11.
const shifts: Shift[] = [
  { resourceId: 'sen-thao', date: '2026-11-07', start: '08:00', end: '18:00' },
  { resourceId: 'sen-ngan', date: '2026-11-07', start: '08:00', end: '18:00' },
  ...dateRange('2026-11-09', '2026-11-22').flatMap((date): Shift[] => {
    const sunday = new Date(`${date}T00:00:00Z`).getUTCDay() === 0;
    return sunday
      ? [{ resourceId: 'sen-thao', date, start: '08:00', end: '12:00' }]
      : [
          { resourceId: 'sen-thao', date, start: '08:00', end: '18:00' },
          { resourceId: 'sen-ngan', date, start: '09:00', end: '18:00' },
        ];
  }),
];

// Thursday 12/11, Ngân off: two appointments to deal with.
const ahead: Appointment[] = [
  appointment(
    'sen-a-lv-1',
    'sen-c-phat',
    atDay('2026-11-12', '09:30'),
    'confirmed',
    [
      {
        variantId: 'sen-mud-std',
        resourceIds: ['sen-ngan', 'sen-tub-1', 'sen-steam-1'],
      },
    ],
    { depositVnd: 100_000n },
  ),
  appointment('sen-a-lv-2', 'sen-c-yen', atDay('2026-11-12', '11:00'), 'confirmed', [
    {
      variantId: 'sen-massage-60',
      resourceIds: ['sen-ngan', 'sen-bed-1'],
      staffChoice: 'chosen',
    },
  ]),
  // Saturday 14/11: Linh has a booking to come.
  appointment('sen-a-linh-14', 'sen-c-linh', atDay('2026-11-14', '10:00'), 'confirmed', [
    {
      variantId: 'sen-massage-90',
      resourceIds: ['sen-thao', 'sen-bed-1'],
    },
  ]),
];

/** Hours only; what the generator needs to place appointments. */
const weekBranch: Branch = {
  id: branchId,
  tenantId,
  name: '',
  address: '',
  timeZone: 'Asia/Ho_Chi_Minh',
  businessHours: [
    ...mondayToSaturday('08:00', '18:00'),
    { weekday: 0, open: '08:00', close: '12:00' },
  ],
  specialDays: [],
};

const week = generateWeek({
  seed: 20261107,
  idPrefix: 'sen',
  branch: weekBranch,
  services,
  resources,
  staff: staffList,
  staffTypeId: 'sen-rt-tech',
  customers: weekCustomers,
  timeOff: staffTimeOff,
  shifts,
  build: appointment,
  dates: ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-08'],
  today: '2026-11-07',
  fixed: saturday,
});

const longRun = {
  idPrefix: 'sen',
  branch: weekBranch,
  services,
  resources,
  staff: staffList,
  staffTypeId: 'sen-rt-tech',
  customers: everyone,
  timeOff: staffTimeOff,
  shifts,
  build: appointment,
  today: '2026-11-07',
  fixed: [],
  defaultCount: 2,
};
// Six months before the week, so counts of visits and no-shows (BR-10) come from appointments.
const history = generateWeek({
  ...longRun,
  seed: 20260508,
  idPrefix: 'sen-h',
  dates: dateRange('2026-05-08', '2026-11-01'),
  pastMix: { noShow: 0.04, cancelled: 0.06 },
});
const upcoming = generateWeek({
  ...longRun,
  seed: 20261110,
  idPrefix: 'sen-f',
  dates: dateRange('2026-11-10', '2026-11-22'),
  fixed: ahead,
});
const appointments = [...history, ...saturday, ...week, ...ahead, ...upcoming];

export const spaLaSen: TenantFixture = {
  tenant: {
    id: tenantId,
    slug: 'la-sen',
    name: 'Spa Lá Sen',
    industry: 'beauty_spa',
    monogram: 'L',
  },
  template: beautySpaTemplate,
  branches: [
    {
      id: branchId,
      tenantId,
      name: 'Lá Sen Quận 7',
      address: '58 Nguyễn Thị Thập, Phường Tân Hưng, TP.HCM',
      phone: '028 7300 5678',
      timeZone: 'Asia/Ho_Chi_Minh',
      businessHours: [
        ...mondayToSaturday('08:00', '18:00'),
        { weekday: 0, open: '08:00', close: '12:00' },
      ],
      specialDays: [
        { date: '2026-12-24', note: 'Đóng sớm', hours: [{ open: '08:00', close: '15:00' }] },
      ],
    },
  ],
  resourceTypes: [
    { id: 'sen-rt-tech', tenantId, name: 'Kỹ thuật viên', isStaff: true },
    { id: 'sen-rt-bed', tenantId, name: 'Giường', isStaff: false },
    { id: 'sen-rt-tub', tenantId, name: 'Bồn ngâm', isStaff: false },
    { id: 'sen-rt-steam', tenantId, name: 'Phòng xông', isStaff: false },
  ],
  resources,
  staff: staffList,
  staffTitles: ['Kỹ thuật viên chính', 'Kỹ thuật viên', 'Học việc'],
  staffLevels: ['Kỹ thuật viên', 'Kỹ thuật viên chính', 'Chuyên gia'],
  shifts,
  staffTimeOff,
  staffSeesCustomerPhone: false,
  services,
  customers: withVisitCounts(everyone, appointments),
  appointments,
  policies: beautySpaTemplate.defaultPolicies,
  packageCatalog: [
    {
      id: 'sen-pkg-5',
      selling: true,
      name: 'Gói 5 lần massage body 60 phút',
      serviceVariantId: 'sen-massage-60',
      totalSessions: 5,
      validDays: 120,
      priceVnd: 1_600_000n,
    },
  ],
  topupBonusTiers: [{ minVnd: 1_000_000n, percent: 10 }],
  actors: { receptionist: 'Linh', manager: 'Khoa', owner: 'Chủ cơ sở' },
  money: laSenMoney(services, appointments, staffList),
  config: laSenConfig,
};
