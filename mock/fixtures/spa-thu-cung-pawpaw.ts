import { appointmentBuilder } from './bookings.ts';
import { dateRange, generateWeek } from './generate.ts';
import { generatePeople, withVisitCounts } from './people.ts';
import { petServices as services } from './pawpaw-services.ts';
import { petSpaTemplate } from './templates.ts';
import type {
  Appointment,
  Branch,
  BusinessHours,
  Customer,
  ServedSubject,
  Staff,
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
    id: 'paw-s-bong',
    tenantId,
    customerId: 'paw-c-linh',
    kind: 'other',
    name: 'Bông',
    attributes: { species: 'cat', breed: 'Mèo Anh lông ngắn', weightKg: '4' },
  },
  {
    id: 'paw-s-lucky',
    tenantId,
    customerId: 'paw-c-duc',
    kind: 'other',
    name: 'Lucky',
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

// Saturday 07/11/2026 at Pawpaw: now is 10:20.
const saturday: Appointment[] = [
  // Two pets of one customer booked together (group booking).
  appointment(
    'paw-a-group',
    'paw-c-linh',
    at('08:30'),
    'completed',
    [
      {
        variantId: 'paw-bath-small',
        subjectId: 'paw-s-mochi',
        resourceIds: ['paw-khoa', 'paw-bath-1', 'paw-dryer-1'],
      },
      {
        variantId: 'paw-bath-cat',
        subjectId: 'paw-s-bong',
        resourceIds: ['paw-vy', 'paw-bath-2', 'paw-dryer-2'],
        startAt: at('08:30'),
      },
    ],
    { settled: true },
  ),
  // Over 10 kg takes the large variant; the dryer stays busy while Khoa is free (BR-05).
  appointment(
    'paw-a-lucky',
    'paw-c-duc',
    at('10:00'),
    'checked_in',
    [
      {
        variantId: 'paw-bath-large',
        subjectId: 'paw-s-lucky',
        resourceIds: ['paw-khoa', 'paw-bath-1', 'paw-dryer-1'],
      },
    ],
    { checkedInAt: at('09:55') },
  ),
  appointment('paw-a-kem', 'paw-c-phat', at('09:30'), 'no_show', [
    {
      variantId: 'paw-bath-small',
      subjectId: 'paw-s-phat-1',
      resourceIds: ['paw-vy', 'paw-bath-2', 'paw-dryer-2'],
    },
  ]),
  appointment('paw-a-na', 'paw-c-nam', at('10:45'), 'confirmed', [
    {
      variantId: 'paw-bath-cat',
      subjectId: 'paw-s-nam-1',
      resourceIds: ['paw-vy', 'paw-bath-2', 'paw-dryer-2'],
    },
  ]),
  appointment(
    'paw-a-rex',
    'paw-c-tri',
    at('13:00'),
    'confirmed',
    [
      {
        variantId: 'paw-groom-large',
        subjectId: 'paw-s-tri-1',
        resourceIds: ['paw-khoa', 'paw-table-1'],
      },
    ],
    { note: 'Rex sợ máy sấy, sấy tay ở chế độ nhỏ.' },
  ),
  appointment('paw-a-milo', 'paw-c-hoa', at('14:00'), 'confirmed', [
    {
      variantId: 'paw-bath-large',
      subjectId: 'paw-s-hoa-1',
      resourceIds: ['paw-vy', 'paw-bath-1', 'paw-dryer-3'],
    },
  ]),
  appointment('paw-a-bo', 'paw-c-quynh', at('15:30'), 'confirmed', [
    {
      variantId: 'paw-groom-small',
      subjectId: 'paw-s-quynh-1',
      resourceIds: ['paw-khoa', 'paw-table-1'],
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
  timeOff: [],
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
  timeOff: [],
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
});
const appointments = [...history, ...saturday, ...week, ...upcoming];

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
  staffTimeOff: [],
  services,
  customers: withVisitCounts(everyone, appointments),
  servedSubjects,
  appointments,
};
