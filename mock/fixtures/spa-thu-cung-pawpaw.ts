import { appointmentBuilder } from './bookings.ts';
import { dateRange, generateWeek } from './generate.ts';
import { generatePeople, withVisitCounts } from './people.ts';
import { pawpawMoney } from './pawpaw-money.ts';
import { pawpawConfig } from './shop-config.ts';
import { petServices as services } from './pawpaw-services.ts';
import { petSpaTemplate } from './templates.ts';
import type {
  Appointment,
  Branch,
  BusinessHours,
  Customer,
  ServedSubject,
  Shift,
  Staff,
  StaffTimeOff,
  TenantFixture,
  Weekday,
} from './types.ts';

const tenantId = 'pawpaw';
const branchId = 'pawpaw-td';

const mondayToSaturday = (
  open: BusinessHours['open'],
  close: BusinessHours['close'],
): BusinessHours[] =>
  ([1, 2, 3, 4, 5, 6] as Weekday[]).map((weekday) => ({ weekday, open, close }));

const resources = [
  { id: 'paw-khoa', tenantId, branchId, resourceTypeId: 'paw-rt-groomer', name: 'Khoa' },
  { id: 'paw-vy', tenantId, branchId, resourceTypeId: 'paw-rt-groomer', name: 'Vy' },
  { id: 'paw-bath-1', tenantId, branchId, resourceTypeId: 'paw-rt-bath', name: 'Bồn 1' },
  { id: 'paw-bath-2', tenantId, branchId, resourceTypeId: 'paw-rt-bath', name: 'Bồn 2' },
  { id: 'paw-dryer-1', tenantId, branchId, resourceTypeId: 'paw-rt-dryer', name: 'Lồng sấy 1' },
  { id: 'paw-dryer-2', tenantId, branchId, resourceTypeId: 'paw-rt-dryer', name: 'Lồng sấy 2' },
  { id: 'paw-dryer-3', tenantId, branchId, resourceTypeId: 'paw-rt-dryer', name: 'Lồng sấy 3' },
  { id: 'paw-table-1', tenantId, branchId, resourceTypeId: 'paw-rt-table', name: 'Bàn 1' },
];

const staffList: Staff[] = [
  {
    resourceId: 'paw-khoa',
    profile: {
      displayName: 'Khoa',
      title: 'Chăm sóc chính',
      specialty: 'cắt tỉa chó lớn',
      bookableOnline: true,
      fullName: 'Nguyễn Đăng Khoa',
      employeeCode: 'PP-001',
      phone: '+84902000001',
      email: 'khoa@pawpaw.vn',
      joinedAt: '2024-08',
    },
    role: 'manager',
    level: 2,
    skillServiceIds: ['paw-bath', 'paw-groom'],
  },
  {
    resourceId: 'paw-vy',
    profile: {
      displayName: 'Vy',
      title: 'Chăm sóc',
      specialty: 'tắm cho mèo',
      bookableOnline: true,
      fullName: 'Trịnh Hải Vy',
      employeeCode: 'PP-002',
      phone: '+84902000002',
      email: 'vy@pawpaw.vn',
      joinedAt: '2025-04',
    },
    role: 'technician',
    level: 1,
    skillServiceIds: ['paw-bath'],
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
    id: 'paw-c-linh',
    tenantId,
    name: 'Phạm Khánh Linh',
    callName: 'Chị Linh',
    phone: '+84909111222',
    email: 'linh@example.com',
    consentAt: '2026-10-12T03:00:00Z',
  },
  { id: 'paw-c-duc', tenantId, name: 'Võ Minh Đức', callName: 'Anh Đức', phone: '+84938333444' },
];

const regularSubjects: ServedSubject[] = [
  {
    id: 'paw-s-mochi',
    tenantId,
    customerId: 'paw-c-linh',
    kind: 'other',
    name: 'Mochi',
    attributes: { species: 'dog', breed: 'Poodle', weightKg: '6' },
  },
  {
    id: 'paw-s-lucky',
    tenantId,
    customerId: 'paw-c-linh',
    kind: 'other',
    name: 'Lucky',
    attributes: { species: 'dog', breed: 'Corgi', weightKg: '12' },
    note: 'Sợ máy sấy to, cần dỗ.',
  },
  {
    id: 'paw-s-bong',
    tenantId,
    customerId: 'paw-c-duc',
    kind: 'other',
    name: 'Bông',
    attributes: { species: 'dog', breed: 'Golden Retriever', weightKg: '28' },
  },
];

// Customers and pets that appear on the rest of the week. [key, name, call name, pets]
const others = (
  [
    ['hoa', 'Nguyễn Thị Hoa', 'Chị Hoa', [['Milo', 'dog', 'Corgi', 11]]],
    ['nam', 'Trần Hoài Nam', 'Anh Nam', [['Na', 'cat', 'Mèo ta', 3]]],
    [
      'quynh',
      'Lê Diễm Quỳnh',
      'Chị Quỳnh',
      [
        ['Bơ', 'dog', 'Phốc sóc', 3],
        ['Sữa', 'dog', 'Chihuahua', 2],
      ],
    ],
    ['tri', 'Phạm Minh Trí', 'Anh Trí', [['Rex', 'dog', 'Husky', 22]]],
    ['ngan', 'Võ Kim Ngân', 'Chị Ngân', [['Mướp', 'cat', 'Mèo Ba Tư', 5]]],
    ['phat', 'Đỗ Tấn Phát', 'Anh Phát', [['Kem', 'dog', 'Poodle', 5]]],
    ['uyen', 'Huỳnh Tú Uyên', 'Chị Uyên', [['Bin', 'dog', 'Shiba', 9]]],
  ] as const
).map(([key, name, callName, pets], i) => ({
  customer: {
    id: `paw-c-${key}`,
    tenantId,
    name,
    callName,
    phone: `+8490500${1000 + i}`,
    visitCount: 1 + (i % 4),
  } satisfies Customer,
  subjects: pets.map(([pet, species, breed, kg], j): ServedSubject => ({
    id: `paw-s-${key}-${j + 1}`,
    tenantId,
    customerId: `paw-c-${key}`,
    kind: 'other',
    name: pet,
    attributes: {
      species,
      breed,
      weightKg: String(kg),
    },
  })),
}));

// The week 02/11–08/11 books only the pets above; the rest come in earlier and later weeks.
const weekSubjects = [...regularSubjects, ...others.flatMap((o) => o.subjects)];
const PET_NAMES = [
  'Bơ',
  'Sữa',
  'Bông',
  'Mực',
  'Lu',
  'Cam',
  'Nấm',
  'Xoài',
  'Gấu',
  'Bi',
  'Mun',
  'Vàng',
  'Su',
  'Tôm',
  'Kiwi',
  'Béo',
  'Đậu',
  'Cốm',
  'Xíu',
  'Bánh Bao',
  'Heo',
  'Mít',
  'Sóc',
  'Chip',
];
const DOG_BREEDS = [
  'Poodle',
  'Corgi',
  'Phốc sóc',
  'Shiba',
  'Golden Retriever',
  'Husky',
  'Chihuahua',
  'Pug',
];
const CAT_BREEDS = ['Mèo ta', 'Mèo Anh lông ngắn', 'Mèo Ba Tư', 'Mèo Munchkin'];
const people = generatePeople({
  seed: 20261103,
  prefix: 'paw',
  tenantId,
  count: 51,
  existing: [...regulars, ...others.map((o) => o.customer)],
  notes: [
    'Bé sợ máy sấy, sấy tay ở chế độ nhỏ.',
    'Bé hay cắn khi cắt móng, cần hai người giữ.',
    'Da nhạy cảm, dùng sữa tắm riêng của chủ mang theo.',
    'Đón bé đúng giờ hẹn, chủ có việc gấp.',
  ],
  subjects: (rand, customer, n) =>
    Array.from({ length: rand() < 0.2 ? 2 : 1 }, (_, j) => {
      const species = rand() < 0.7 ? 'dog' : 'cat';
      const kg = species === 'dog' ? 2 + Math.floor(rand() * 29) : 2 + Math.floor(rand() * 6);
      const breeds = species === 'dog' ? DOG_BREEDS : CAT_BREEDS;
      return {
        id: `paw-s-g${n}-${j + 1}`,
        tenantId,
        customerId: customer.id,
        kind: 'other' as const,
        name: PET_NAMES[Math.floor(rand() * PET_NAMES.length)]!,
        attributes: {
          species,
          breed: breeds[Math.floor(rand() * breeds.length)]!,
          weightKg: String(kg),
        },
      };
    }),
});
const everyone = [...regulars, ...others.map((o) => o.customer), ...people.customers];
const servedSubjects = [...weekSubjects, ...people.subjects];

const at = (hhmm: string) => new Date(`2026-11-07T${hhmm}:00+07:00`).toISOString();

// Saturday 07/11/2026 at Pawpaw: now is 10:20. Lucky (12 kg, Tắm sấy) cannot start at 11:00 with
// Vy; the nearest times are 10:00 Vy, 12:00 Khoa and 12:30 Vy (design/screens/LichTaoPawpaw.dc.html).
const saturday: Appointment[] = [
  // Two pets of one customer booked together (group booking).
  appointment(
    'paw-a-group',
    'paw-c-quynh',
    at('08:00'),
    'completed',
    [
      {
        variantId: 'paw-bath-small',
        subjectId: 'paw-s-quynh-1',
        resourceIds: ['paw-khoa', 'paw-bath-1', 'paw-dryer-1'],
      },
      {
        variantId: 'paw-bath-small',
        subjectId: 'paw-s-quynh-2',
        resourceIds: ['paw-vy', 'paw-bath-2', 'paw-dryer-2'],
        startAt: at('08:00'),
      },
    ],
    { settled: true },
  ),
  appointment(
    'paw-a-mochi',
    'paw-c-linh',
    at('09:00'),
    'checked_in',
    [
      {
        variantId: 'paw-bath-small',
        subjectId: 'paw-s-mochi',
        resourceIds: ['paw-khoa', 'paw-bath-1', 'paw-dryer-3'],
      },
    ],
    { checkedInAt: at('08:56') },
  ),
  // Over 10 kg takes the large variant; the dryer stays busy while Vy is free (BR-05).
  appointment(
    'paw-a-milo',
    'paw-c-hoa',
    at('09:30'),
    'checked_in',
    [
      {
        variantId: 'paw-bath-large',
        subjectId: 'paw-s-hoa-1',
        resourceIds: ['paw-vy', 'paw-bath-2', 'paw-dryer-1'],
      },
    ],
    { checkedInAt: at('09:25') },
  ),
  appointment('paw-a-bong', 'paw-c-duc', at('10:30'), 'confirmed', [
    {
      variantId: 'paw-groom-large',
      subjectId: 'paw-s-bong',
      resourceIds: ['paw-khoa', 'paw-table-1'],
    },
  ]),
  appointment('paw-a-na', 'paw-c-nam', at('11:30'), 'confirmed', [
    {
      variantId: 'paw-bath-cat',
      subjectId: 'paw-s-nam-1',
      resourceIds: ['paw-vy', 'paw-bath-1', 'paw-dryer-2'],
    },
  ]),
  appointment(
    'paw-a-rex',
    'paw-c-tri',
    at('13:30'),
    'confirmed',
    [
      {
        variantId: 'paw-groom-large',
        subjectId: 'paw-s-tri-1',
        resourceIds: ['paw-khoa', 'paw-table-1'],
        staffChoice: 'chosen',
      },
    ],
    { note: 'Rex sợ máy sấy, sấy tay ở chế độ nhỏ.' },
  ),
  appointment('paw-a-muop', 'paw-c-ngan', at('14:30'), 'confirmed', [
    {
      variantId: 'paw-bath-cat',
      subjectId: 'paw-s-ngan-1',
      resourceIds: ['paw-vy', 'paw-bath-1', 'paw-dryer-1'],
    },
  ]),
  appointment('paw-a-bin', 'paw-c-uyen', at('15:30'), 'confirmed', [
    {
      variantId: 'paw-groom-small',
      subjectId: 'paw-s-uyen-1',
      resourceIds: ['paw-khoa', 'paw-table-1'],
    },
  ]),
];

/** Local `YYYY-MM-DD` and `HH:mm` as a UTC instant. */
const atDay = (date: string, hhmm: string) => new Date(`${date}T${hhmm}:00+07:00`).toISOString();

const staffTimeOff: StaffTimeOff[] = [
  // Pending: Vy off Thursday 12/11 with two appointments.
  {
    id: 'paw-lv-1',
    resourceId: 'paw-vy',
    date: '2026-11-12',
    reason: 'Đi khám sức khỏe',
    status: 'pending',
    sentAt: atDay('2026-11-06', '16:20'),
  },
];

// Shifts: today and the weeks 09/11 and 16/11.
const shifts: Shift[] = [
  { resourceId: 'paw-khoa', date: '2026-11-07', start: '08:00', end: '18:00' },
  { resourceId: 'paw-vy', date: '2026-11-07', start: '08:00', end: '18:00' },
  ...dateRange('2026-11-09', '2026-11-22').flatMap((date): Shift[] => {
    const sunday = new Date(`${date}T00:00:00Z`).getUTCDay() === 0;
    return sunday
      ? [{ resourceId: 'paw-khoa', date, start: '08:00', end: '12:00' }]
      : [
          { resourceId: 'paw-khoa', date, start: '08:00', end: '18:00' },
          { resourceId: 'paw-vy', date, start: '09:00', end: '18:00' },
        ];
  }),
];

// Thursday 12/11, Vy off: two appointments to deal with.
const ahead: Appointment[] = [
  appointment('paw-a-lv-1', 'paw-c-phat', atDay('2026-11-12', '09:30'), 'confirmed', [
    {
      variantId: 'paw-bath-small',
      subjectId: 'paw-s-phat-1',
      resourceIds: ['paw-vy', 'paw-bath-1', 'paw-dryer-1'],
    },
  ]),
  appointment('paw-a-lv-2', 'paw-c-ngan', atDay('2026-11-12', '11:00'), 'confirmed', [
    {
      variantId: 'paw-bath-cat',
      subjectId: 'paw-s-ngan-1',
      resourceIds: ['paw-vy', 'paw-bath-1', 'paw-dryer-1'],
      staffChoice: 'chosen',
    },
  ]),
  // Saturday 14/11: Lucky has an appointment so it cannot be deleted in MH-19.
  appointment('paw-a-lucky-14', 'paw-c-linh', atDay('2026-11-14', '10:00'), 'confirmed', [
    {
      variantId: 'paw-bath-large',
      subjectId: 'paw-s-lucky',
      resourceIds: ['paw-khoa', 'paw-bath-1', 'paw-dryer-1'],
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
  idPrefix: 'paw',
  branch: weekBranch,
  services,
  resources,
  staff: staffList,
  staffTypeId: 'paw-rt-groomer',
  subjects: weekSubjects,
  timeOff: staffTimeOff,
  shifts,
  build: appointment,
  dates: ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-08'],
  today: '2026-11-07',
  fixed: saturday,
});

const longRun = {
  idPrefix: 'paw',
  branch: weekBranch,
  services,
  resources,
  staff: staffList,
  staffTypeId: 'paw-rt-groomer',
  subjects: servedSubjects,
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
  idPrefix: 'paw-h',
  dates: dateRange('2026-05-08', '2026-11-01'),
  pastMix: { noShow: 0.04, cancelled: 0.06 },
});
const upcoming = generateWeek({
  ...longRun,
  seed: 20261110,
  idPrefix: 'paw-f',
  dates: dateRange('2026-11-10', '2026-11-22'),
  fixed: ahead,
});
const appointments = [...history, ...saturday, ...week, ...ahead, ...upcoming];

export const spaThuCungPawpaw: TenantFixture = {
  tenant: {
    id: tenantId,
    slug: 'pawpaw',
    name: 'Spa thú cưng Pawpaw',
    industry: 'pet_spa',
    monogram: 'P',
  },
  template: petSpaTemplate,
  branches: [
    {
      id: branchId,
      tenantId,
      name: 'Pawpaw Thủ Đức',
      address: '45 Võ Văn Ngân, Phường Thủ Đức, TP.HCM',
      timeZone: 'Asia/Ho_Chi_Minh',
      businessHours: [
        ...mondayToSaturday('08:00', '18:00'),
        { weekday: 0, open: '08:00', close: '12:00' },
      ],
      specialDays: [
        { date: '2026-12-24', note: 'Đóng sớm', hours: { open: '08:00', close: '15:00' } },
      ],
    },
  ],
  resourceTypes: [
    { id: 'paw-rt-groomer', tenantId, name: 'Nhân viên chăm sóc', isStaff: true },
    { id: 'paw-rt-bath', tenantId, name: 'Bồn tắm', isStaff: false },
    { id: 'paw-rt-dryer', tenantId, name: 'Lồng sấy', isStaff: false },
    { id: 'paw-rt-table', tenantId, name: 'Bàn cắt tỉa', isStaff: false },
  ],
  resources,
  staff: staffList,
  staffTitles: ['Chăm sóc chính', 'Chăm sóc', 'Học việc'],
  staffLevels: ['Chăm sóc', 'Chăm sóc chính', 'Chăm sóc cả'],
  shifts,
  staffTimeOff,
  staffSeesCustomerPhone: false,
  services,
  customers: withVisitCounts(everyone, appointments),
  servedSubjects,
  appointments,
  policies: petSpaTemplate.defaultPolicies,
  packageCatalog: [
    {
      id: 'paw-pkg-5',
      selling: true,
      name: 'Gói 5 lần tắm sấy chó nhỏ',
      serviceVariantId: 'paw-bath-small',
      totalSessions: 5,
      validDays: 120,
      priceVnd: 650_000n,
    },
  ],
  topupBonusTiers: [{ minVnd: 1_000_000n, percent: 10 }],
  commissionPercent: 10,
  actors: { receptionist: 'Vy', manager: 'Khoa', owner: 'Chủ cơ sở' },
  money: pawpawMoney(services, appointments),
  config: pawpawConfig,
};
