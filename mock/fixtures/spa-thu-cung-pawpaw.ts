import { appointmentBuilder } from './bookings';
import { generateWeek } from './generate';
import type {
  Appointment,
  BusinessHours,
  Customer,
  ServedSubject,
  Service,
  Staff,
  TenantFixture,
  Weekday,
} from './types';

const tenantId = 'pawpaw';
const branchId = 'pawpaw-td';

const mondayToSaturday = (
  open: BusinessHours['open'],
  close: BusinessHours['close'],
): BusinessHours[] =>
  ([1, 2, 3, 4, 5, 6] as Weekday[]).map((weekday) => ({ weekday, open, close }));

const services: Service[] = [
  {
    // Bath then cage drying: the groomer is free while the pet is in the dryer.
    id: 'paw-bath',
    tenantId,
    name: 'Tắm sấy',
    variants: [
      {
        id: 'paw-bath-small',
        name: 'Chó dưới 10 kg',
        shortName: 'Tắm chó nhỏ',
        priceVnd: 150_000n,
        match: { species: 'dog', size: 'small' },
        segments: [
          {
            startMinute: 0,
            endMinute: 20,
            kind: 'work',
            resourceTypeIds: ['paw-rt-groomer', 'paw-rt-bath'],
          },
          {
            startMinute: 20,
            endMinute: 50,
            kind: 'wait',
            resourceTypeIds: ['paw-rt-dryer'],
            label: 'sấy lồng',
          },
          { startMinute: 50, endMinute: 60, kind: 'work', resourceTypeIds: ['paw-rt-groomer'] },
        ],
      },
      {
        id: 'paw-bath-large',
        name: 'Chó từ 10 kg',
        shortName: 'Tắm chó lớn',
        priceVnd: 250_000n,
        match: { species: 'dog', size: 'large' },
        segments: [
          {
            startMinute: 0,
            endMinute: 30,
            kind: 'work',
            resourceTypeIds: ['paw-rt-groomer', 'paw-rt-bath'],
          },
          {
            startMinute: 30,
            endMinute: 75,
            kind: 'wait',
            resourceTypeIds: ['paw-rt-dryer'],
            label: 'sấy lồng',
          },
          { startMinute: 75, endMinute: 90, kind: 'work', resourceTypeIds: ['paw-rt-groomer'] },
        ],
      },
      {
        id: 'paw-bath-cat',
        name: 'Mèo',
        shortName: 'Tắm mèo',
        priceVnd: 180_000n,
        match: { species: 'cat' },
        segments: [
          {
            startMinute: 0,
            endMinute: 25,
            kind: 'work',
            resourceTypeIds: ['paw-rt-groomer', 'paw-rt-bath'],
          },
          {
            startMinute: 25,
            endMinute: 55,
            kind: 'wait',
            resourceTypeIds: ['paw-rt-dryer'],
            label: 'sấy lồng',
          },
          { startMinute: 55, endMinute: 60, kind: 'work', resourceTypeIds: ['paw-rt-groomer'] },
        ],
      },
    ],
  },
  {
    id: 'paw-groom',
    tenantId,
    name: 'Cắt tỉa lông',
    variants: [
      {
        id: 'paw-groom-small',
        name: 'Chó dưới 10 kg',
        shortName: 'Tỉa chó nhỏ',
        priceVnd: 250_000n,
        match: { species: 'dog', size: 'small' },
        segments: [
          {
            startMinute: 0,
            endMinute: 60,
            kind: 'work',
            resourceTypeIds: ['paw-rt-groomer', 'paw-rt-table'],
          },
        ],
      },
      {
        id: 'paw-groom-large',
        name: 'Chó từ 10 kg',
        shortName: 'Tỉa chó lớn',
        priceVnd: 400_000n,
        match: { species: 'dog', size: 'large' },
        segments: [
          {
            startMinute: 0,
            endMinute: 90,
            kind: 'work',
            resourceTypeIds: ['paw-rt-groomer', 'paw-rt-table'],
          },
        ],
      },
    ],
  },
];

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

const appointment = appointmentBuilder({ tenantId, branchId, services, resources });

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
    },
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
    },
    skillServiceIds: ['paw-bath'],
  },
];

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
    attributes: { species: 'dog', size: 'small', breed: 'Poodle', weightKg: '6' },
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
    attributes: { species: 'dog', size: 'large', breed: 'Golden Retriever', weightKg: '28' },
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
      ...(species === 'dog' ? { size: kg < 10 ? 'small' : 'large' } : {}),
    },
  })),
}));

const customers = [...regulars, ...others.map((o) => o.customer)];
const servedSubjects = [...regularSubjects, ...others.flatMap((o) => o.subjects)];

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

const week = generateWeek({
  seed: 20261107,
  idPrefix: 'paw',
  branch: {
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
  },
  services,
  resources,
  staff: staffList,
  staffTypeId: 'paw-rt-groomer',
  subjects: servedSubjects,
  timeOff: [],
  build: appointment,
  dates: ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-08'],
  today: '2026-11-07',
  fixed: saturday,
});

export const spaThuCungPawpaw: TenantFixture = {
  tenant: { id: tenantId, slug: 'pawpaw', name: 'Spa thú cưng Pawpaw', industry: 'pet_spa' },
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
  staffTimeOff: [],
  services,
  customers,
  servedSubjects,
  appointments: [...saturday, ...week],
};
