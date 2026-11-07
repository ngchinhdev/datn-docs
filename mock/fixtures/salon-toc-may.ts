import { appointmentBuilder } from './bookings';
import { dateRange, generateWeek } from './generate';
import { generatePeople, withVisitCounts } from './people';
import type {
  Appointment,
  Branch,
  BusinessHours,
  Customer,
  ServedSubject,
  Service,
  Staff,
  StaffTimeOff,
  TenantFixture,
  Weekday,
} from './types';

const tenantId = 'may';
const branchId = 'may-q3';

const everyDay = (open: BusinessHours['open'], close: BusinessHours['close']): BusinessHours[] =>
  ([0, 1, 2, 3, 4, 5, 6] as Weekday[]).map((weekday) => ({ weekday, open, close }));

const services: Service[] = [
  {
    id: 'may-cut',
    tenantId,
    name: 'Cắt tóc',
    variants: [
      {
        id: 'may-cut-short',
        name: 'Tóc ngắn',
        shortName: 'Cắt ngắn',
        priceVnd: 150_000n,
        match: { hairLength: 'short' },
        segments: [
          {
            startMinute: 0,
            endMinute: 45,
            kind: 'work',
            resourceTypeIds: ['may-rt-stylist', 'may-rt-chair'],
          },
        ],
      },
      {
        id: 'may-cut-long',
        name: 'Tóc dài',
        shortName: 'Cắt dài',
        priceVnd: 200_000n,
        match: { hairLength: 'long' },
        segments: [
          {
            startMinute: 0,
            endMinute: 60,
            kind: 'work',
            resourceTypeIds: ['may-rt-stylist', 'may-rt-chair'],
          },
        ],
      },
    ],
  },
  {
    id: 'may-wash',
    tenantId,
    name: 'Gội sấy',
    variants: [
      {
        id: 'may-wash-std',
        name: 'Tiêu chuẩn',
        shortName: 'Gội sấy',
        priceVnd: 80_000n,
        match: {},
        segments: [
          {
            startMinute: 0,
            endMinute: 30,
            kind: 'work',
            resourceTypeIds: ['may-rt-stylist', 'may-rt-wash'],
          },
        ],
      },
    ],
  },
  {
    // Color has a processing wait: the stylist is free, the chair stays occupied.
    id: 'may-dye',
    tenantId,
    name: 'Nhuộm tóc',
    variants: [
      {
        id: 'may-dye-short',
        name: 'Tóc ngắn',
        shortName: 'Nhuộm ngắn',
        priceVnd: 500_000n,
        depositVnd: 100_000n,
        match: { hairLength: 'short' },
        segments: [
          {
            startMinute: 0,
            endMinute: 30,
            kind: 'work',
            resourceTypeIds: ['may-rt-stylist', 'may-rt-chair'],
          },
          {
            startMinute: 30,
            endMinute: 75,
            kind: 'wait',
            resourceTypeIds: ['may-rt-chair'],
            label: 'chờ lên màu',
          },
          {
            startMinute: 75,
            endMinute: 105,
            kind: 'work',
            resourceTypeIds: ['may-rt-stylist', 'may-rt-chair'],
          },
        ],
      },
      {
        id: 'may-dye-long',
        name: 'Tóc dài',
        shortName: 'Nhuộm dài',
        priceVnd: 700_000n,
        depositVnd: 100_000n,
        match: { hairLength: 'long' },
        segments: [
          {
            startMinute: 0,
            endMinute: 40,
            kind: 'work',
            resourceTypeIds: ['may-rt-stylist', 'may-rt-chair'],
          },
          {
            startMinute: 40,
            endMinute: 85,
            kind: 'wait',
            resourceTypeIds: ['may-rt-chair'],
            label: 'chờ lên màu',
          },
          {
            startMinute: 85,
            endMinute: 120,
            kind: 'work',
            resourceTypeIds: ['may-rt-stylist', 'may-rt-chair'],
          },
        ],
      },
    ],
  },
];

const resources = [
  { id: 'may-mai', tenantId, branchId, resourceTypeId: 'may-rt-stylist', name: 'Mai' },
  { id: 'may-lan', tenantId, branchId, resourceTypeId: 'may-rt-stylist', name: 'Lan' },
  { id: 'may-hung', tenantId, branchId, resourceTypeId: 'may-rt-stylist', name: 'Hùng' },
  { id: 'may-chair-1', tenantId, branchId, resourceTypeId: 'may-rt-chair', name: 'Ghế 1' },
  { id: 'may-chair-2', tenantId, branchId, resourceTypeId: 'may-rt-chair', name: 'Ghế 2' },
  { id: 'may-chair-3', tenantId, branchId, resourceTypeId: 'may-rt-chair', name: 'Ghế 3' },
  { id: 'may-wash-1', tenantId, branchId, resourceTypeId: 'may-rt-wash', name: 'Giường gội 1' },
];

const appointment = appointmentBuilder({ tenantId, branchId, services, resources });

const staffList: Staff[] = [
  {
    resourceId: 'may-mai',
    profile: {
      displayName: 'Mai',
      title: 'Thợ chính',
      specialty: 'chuyên nhuộm',
      bookableOnline: true,
      fullName: 'Trần Thị Mai',
      employeeCode: 'TM-001',
      phone: '+84901000001',
      email: 'mai@tocmay.vn',
      joinedAt: '2024-03',
    },
    role: 'technician',
    level: 2,
    skillServiceIds: ['may-cut', 'may-wash', 'may-dye'],
  },
  {
    resourceId: 'may-lan',
    profile: {
      displayName: 'Lan',
      title: 'Thợ',
      specialty: 'cắt, uốn',
      bookableOnline: true,
      fullName: 'Phạm Ngọc Lan',
      employeeCode: 'TM-002',
      phone: '+84901000002',
      email: 'lan@tocmay.vn',
      joinedAt: '2025-01',
    },
    role: 'technician',
    level: 1,
    skillServiceIds: ['may-cut', 'may-wash'],
  },
  {
    resourceId: 'may-hung',
    profile: {
      displayName: 'Hùng',
      title: 'Thợ',
      specialty: 'nhuộm, tạo kiểu',
      bookableOnline: true,
      fullName: 'Lê Văn Hùng',
      employeeCode: 'TM-003',
      phone: '+84901000003',
      email: 'hung@tocmay.vn',
      joinedAt: '2023-06',
    },
    role: 'manager',
    level: 2,
    skillServiceIds: ['may-cut', 'may-wash', 'may-dye'],
  },
];

const regulars: Customer[] = [
  {
    id: 'may-c-thu',
    tenantId,
    name: 'Nguyễn Minh Thư',
    callName: 'Chị Thư',
    phone: '+84912345678',
    visitCount: 3,
  },
  {
    id: 'may-c-an',
    tenantId,
    name: 'Trần Bảo An',
    callName: 'Anh Bảo An',
    phone: '+84987654321',
    visitCount: 2,
  },
  {
    id: 'may-c-ha',
    tenantId,
    name: 'Lê Thu Hà',
    callName: 'Chị Hà',
    phone: '+84934567890',
    visitCount: 6,
  },
  {
    id: 'may-c-tuan',
    tenantId,
    name: 'Đỗ Anh Tuấn',
    callName: 'Anh Tuấn',
    phone: '+84903111222',
    visitCount: 4,
  },
  {
    id: 'may-c-ngoc',
    tenantId,
    name: 'Hoàng Bích Ngọc',
    callName: 'Chị Ngọc',
    phone: '+84903222333',
    visitCount: 1,
  },
  {
    id: 'may-c-vy',
    tenantId,
    name: 'Ngô Tường Vy',
    callName: 'Chị Vy',
    phone: '+84903333444',
    visitCount: 5,
  },
  {
    id: 'may-c-phuc',
    tenantId,
    name: 'Bùi Hữu Phúc',
    callName: 'Anh Phúc',
    phone: '+84903444555',
    visitCount: 2,
  },
  {
    id: 'may-c-van',
    tenantId,
    name: 'Vũ Thanh Vân',
    callName: 'Chị Vân',
    phone: '+84903555666',
    visitCount: 1,
  },
];

const regularSubjects: ServedSubject[] = (
  [
    ['thu', 'Nguyễn Minh Thư', 'long'],
    ['an', 'Trần Bảo An', 'short'],
    ['ha', 'Lê Thu Hà', 'short'],
    ['tuan', 'Đỗ Anh Tuấn', 'short'],
    ['ngoc', 'Hoàng Bích Ngọc', 'long'],
    ['vy', 'Ngô Tường Vy', 'long'],
    ['phuc', 'Bùi Hữu Phúc', 'short'],
    ['van', 'Vũ Thanh Vân', 'short'],
  ] as const
).map(([key, name, hairLength]) => ({
  id: `may-s-${key}`,
  tenantId,
  customerId: `may-c-${key}`,
  kind: 'self' as const,
  name,
  attributes: { hairLength },
}));

// Saturday 07/11/2026, as drawn in design/screens/LeTanChiTiet.dc.html and LeTanTaiNguyen.dc.html.
const saturday: Appointment[] = [
  appointment(
    'may-a-ha',
    'may-c-ha',
    '2026-11-07T02:00:00Z',
    'checked_in',
    [
      {
        variantId: 'may-dye-short',
        subjectId: 'may-s-ha',
        resourceIds: ['may-mai', 'may-chair-1'],
      },
    ],
    {
      checkedInAt: '2026-11-07T01:56:00Z',
      depositVnd: 100_000n,
      note: 'Da đầu nhạy cảm, dùng thuốc không amoniac.',
    },
  ),
  // Fills Mai's wait while Hà's color processes (BR-05).
  appointment(
    'may-a-tuan',
    'may-c-tuan',
    '2026-11-07T02:30:00Z',
    'completed',
    [
      {
        variantId: 'may-cut-short',
        subjectId: 'may-s-tuan',
        resourceIds: ['may-mai', 'may-chair-2'],
      },
    ],
    { settled: false },
  ),
  appointment('may-a-ngoc', 'may-c-ngoc', '2026-11-07T04:00:00Z', 'confirmed', [
    {
      variantId: 'may-cut-long',
      subjectId: 'may-s-ngoc',
      resourceIds: ['may-mai', 'may-chair-1'],
    },
  ]),
  appointment(
    'may-a-vy',
    'may-c-vy',
    '2026-11-07T01:30:00Z',
    'completed',
    [
      {
        variantId: 'may-wash-std',
        subjectId: 'may-s-vy',
        resourceIds: ['may-lan', 'may-wash-1'],
      },
    ],
    { settled: true },
  ),
  appointment('may-a-phuc', 'may-c-phuc', '2026-11-07T02:15:00Z', 'no_show', [
    {
      variantId: 'may-cut-short',
      subjectId: 'may-s-phuc',
      resourceIds: ['may-lan', 'may-chair-3'],
    },
  ]),
  appointment(
    'may-a-hold',
    null,
    '2026-11-07T03:30:00Z',
    'held',
    [{ variantId: 'may-cut-short', subjectId: null, resourceIds: ['may-lan', 'may-chair-2'] }],
    { holdExpiresAt: '2026-11-07T03:27:42Z' },
  ),
  appointment(
    'may-a-an',
    'may-c-an',
    '2026-11-07T02:30:00Z',
    'checked_in',
    [
      {
        variantId: 'may-wash-std',
        subjectId: 'may-s-an',
        resourceIds: ['may-hung', 'may-wash-1'],
      },
      {
        variantId: 'may-cut-short',
        subjectId: 'may-s-an',
        resourceIds: ['may-hung', 'may-chair-3'],
      },
    ],
    { checkedInAt: '2026-11-07T02:25:00Z' },
  ),
  appointment('may-a-van', 'may-c-van', '2026-11-07T04:30:00Z', 'confirmed', [
    {
      variantId: 'may-cut-short',
      subjectId: 'may-s-van',
      resourceIds: ['may-hung', 'may-chair-2'],
    },
  ]),
  appointment(
    'may-a-thu',
    'may-c-thu',
    '2026-11-07T06:00:00Z',
    'confirmed',
    [
      {
        variantId: 'may-dye-long',
        subjectId: 'may-s-thu',
        resourceIds: ['may-hung', 'may-chair-3'],
      },
    ],
    { depositVnd: 150_000n },
  ),
];
// Customers who only appear on the other days of the week. [key, name, call name, hair length]
const others = (
  [
    ['lam', 'Phan Ngọc Lam', 'Chị Lam', 'long'],
    ['khanh', 'Trịnh Quốc Khánh', 'Anh Khánh', 'short'],
    ['my', 'Đặng Thảo My', 'Chị My', 'long'],
    ['duy', 'Lý Minh Duy', 'Anh Duy', 'short'],
    ['trang', 'Cao Thùy Trang', 'Chị Trang', 'long'],
    ['hieu', 'Mạc Trung Hiếu', 'Anh Hiếu', 'short'],
    ['nhi', 'Tạ Yến Nhi', 'Chị Nhi', 'long'],
    ['son', 'Hồ Thanh Sơn', 'Anh Sơn', 'short'],
    ['quyen', 'La Bảo Quyên', 'Chị Quyên', 'long'],
    ['tam', 'Kiều Minh Tâm', 'Chị Tâm', 'short'],
    ['long', 'Dương Hải Long', 'Anh Long', 'short'],
    ['huong', 'Lương Thu Hương', 'Chị Hương', 'long'],
    // Over 30 characters, to test wrapping.
    ['phuongthao', 'Công Tôn Nữ Hoàng Thị Phương Thảo', 'Chị Phương Thảo', 'long'],
  ] as const
).map(([key, name, callName, hairLength], i) => ({
  customer: {
    id: `may-c-${key}`,
    tenantId,
    name,
    callName,
    phone: `+8490400${1000 + i}`,
    visitCount: 1 + (i % 5),
  } satisfies Customer,
  subject: {
    id: `may-s-${key}`,
    tenantId,
    customerId: `may-c-${key}`,
    kind: 'self',
    name,
    attributes: { hairLength },
  } satisfies ServedSubject,
}));

// The week 02/11–08/11 books only the customers above; the rest come in earlier and later weeks.
const weekSubjects = [...regularSubjects, ...others.map((o) => o.subject)];
const people = generatePeople({
  seed: 20261101,
  prefix: 'may',
  tenantId,
  count: 109,
  existing: [...regulars, ...others.map((o) => o.customer)],
  notes: [
    'Da đầu nhạy cảm, dùng thuốc không amoniac.',
    'Thích ngồi ghế gần cửa sổ.',
    'Hay đến sớm 10 phút, mời nước trước.',
    'Chỉ nhận cắt, không nhận nhuộm tại chỗ.',
    'Dị ứng mùi thuốc uốn.',
  ],
  subjects: (rand, customer, n) => [
    {
      id: `may-s-g${n}`,
      tenantId,
      customerId: customer.id,
      kind: 'self',
      name: customer.name,
      attributes: { hairLength: rand() < 0.5 ? 'short' : 'long' },
    },
  ],
});
const everyone = [...regulars, ...others.map((o) => o.customer), ...people.customers];
const servedSubjects = [...weekSubjects, ...people.subjects];

const staffTimeOff: StaffTimeOff[] = [
  { resourceId: 'may-lan', date: '2026-11-03', note: 'Phép năm' },
];

/** Local `HH:mm` on 08/11 as UTC ISO. */
const sunday = (hhmm: string) => new Date(`2026-11-08T${hhmm}:00+07:00`).toISOString();

// Mai has no gap of 30 minutes on Sunday 08/11 (BR-14 case): wash then long cut, back to back, 09:00–20:00.
const sundayMai: Appointment[] = (
  [
    ['lam', '09:00'],
    ['my', '10:30'],
    ['trang', '12:00'],
    ['nhi', '13:30'],
    ['quyen', '15:00'],
    ['huong', '16:30'],
    ['thu', '18:00'],
  ] as const
).map(([key, time], i) =>
  appointment(`may-a-sun-${i + 1}`, `may-c-${key}`, sunday(time), 'confirmed', [
    {
      variantId: 'may-wash-std',
      subjectId: `may-s-${key}`,
      resourceIds: ['may-mai', 'may-wash-1'],
    },
    {
      variantId: 'may-cut-long',
      subjectId: `may-s-${key}`,
      resourceIds: ['may-mai', 'may-chair-1'],
    },
  ]),
);
sundayMai.push(
  appointment('may-a-sun-8', 'may-c-ngoc', sunday('19:30'), 'confirmed', [
    { variantId: 'may-wash-std', subjectId: 'may-s-ngoc', resourceIds: ['may-mai', 'may-wash-1'] },
  ]),
);

const handwritten: Appointment[] = [
  ...sundayMai,
  // Thursday: gội, cắt, nhuộm back to back for one customer; the color has a wait.
  appointment(
    'may-a-chain',
    'may-c-trang',
    '2026-11-05T02:00:00Z',
    'completed',
    [
      {
        variantId: 'may-wash-std',
        subjectId: 'may-s-trang',
        resourceIds: ['may-mai', 'may-wash-1'],
      },
      {
        variantId: 'may-cut-short',
        subjectId: 'may-s-trang',
        resourceIds: ['may-mai', 'may-chair-1'],
      },
      {
        variantId: 'may-dye-short',
        subjectId: 'may-s-trang',
        resourceIds: ['may-mai', 'may-chair-1'],
      },
    ],
    { settled: true, depositVnd: 100_000n },
  ),
  // Friday: a cancelled booking with a long name and a long note.
  appointment(
    'may-a-long',
    'may-c-phuongthao',
    '2026-11-06T07:00:00Z',
    'cancelled',
    [
      {
        variantId: 'may-dye-long',
        subjectId: 'may-s-phuongthao',
        resourceIds: ['may-hung', 'may-chair-2'],
      },
    ],
    {
      depositVnd: 100_000n,
      note: 'Khách muốn nhuộm nâu lạnh như ảnh đã gửi qua Zalo. Tóc từng tẩy hai lần nên thử thuốc ở phần đuôi trước, dặn kỹ thời gian ủ và gọi lại xác nhận trước một ngày.',
    },
  ),
];

/** Hours only; what the generator needs to place appointments. */
const weekBranch: Branch = {
  id: branchId,
  tenantId,
  name: '',
  address: '',
  timeZone: 'Asia/Ho_Chi_Minh',
  businessHours: everyDay('09:00', '20:00'),
  specialDays: [],
};

const week = generateWeek({
  seed: 20261102,
  idPrefix: 'may',
  branch: weekBranch,
  services,
  resources,
  staff: staffList,
  staffTypeId: 'may-rt-stylist',
  subjects: weekSubjects,
  timeOff: staffTimeOff,
  build: appointment,
  dates: ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-08'],
  today: '2026-11-07',
  fixed: [...saturday, ...handwritten],
  counts: { '2026-11-04': 2, '2026-11-08': 11 },
  avoidStaff: { '2026-11-08': ['may-mai'] },
});

const longRun = {
  idPrefix: 'may',
  branch: weekBranch,
  services,
  resources,
  staff: staffList,
  staffTypeId: 'may-rt-stylist',
  subjects: servedSubjects,
  timeOff: [],
  build: appointment,
  today: '2026-11-07',
  fixed: [],
  defaultCount: 3,
};
// Six months before the week, so counts of visits and no-shows (BR-10) come from appointments.
const history = generateWeek({
  ...longRun,
  seed: 20260508,
  idPrefix: 'may-h',
  dates: dateRange('2026-05-08', '2026-11-01'),
  pastMix: { noShow: 0.04, cancelled: 0.06 },
});
const upcoming = generateWeek({
  ...longRun,
  seed: 20261110,
  idPrefix: 'may-f',
  dates: dateRange('2026-11-10', '2026-11-22'),
});
const appointments = [...history, ...saturday, ...handwritten, ...week, ...upcoming];

export const salonTocMay: TenantFixture = {
  tenant: { id: tenantId, slug: 'toc-may', name: 'Salon Tóc Mây', industry: 'hair_salon' },
  branches: [
    {
      id: branchId,
      tenantId,
      name: 'Tóc Mây Quận 3',
      address: '120 Võ Văn Tần, Phường Bàn Cờ, TP.HCM',
      timeZone: 'Asia/Ho_Chi_Minh',
      businessHours: everyDay('09:00', '20:00').map((h) =>
        h.weekday === 6 ? { ...h, open: '08:00' } : h,
      ),
      specialDays: [
        { date: '2026-11-09', note: 'Bảo trì', hours: null },
        { date: '2027-02-06', note: 'Nghỉ Tết', hours: null },
      ],
    },
  ],
  resourceTypes: [
    { id: 'may-rt-stylist', tenantId, name: 'Thợ', isStaff: true },
    { id: 'may-rt-chair', tenantId, name: 'Ghế làm tóc', isStaff: false },
    { id: 'may-rt-wash', tenantId, name: 'Giường gội', isStaff: false },
  ],
  resources,
  staff: staffList,
  staffTitles: ['Thợ chính', 'Thợ', 'Học việc'],
  staffLevels: ['Thợ', 'Thợ chính', 'Thợ cả'],
  staffTimeOff,
  services,
  customers: withVisitCounts(everyone, appointments),
  servedSubjects,
  appointments,
};
