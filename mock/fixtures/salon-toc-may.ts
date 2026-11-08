import { appointmentBuilder } from './bookings.ts';
import { dateRange, generateWeek } from './generate.ts';
import { generatePeople, withVisitCounts } from './people.ts';
import { salonServices as services } from './salon-services.ts';
import { hairSalonTemplate } from './templates.ts';
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

const tenantId = 'may';
const branchId = 'may-q3';

const everyDay = (open: BusinessHours['open'], close: BusinessHours['close']): BusinessHours[] =>
  ([0, 1, 2, 3, 4, 5, 6] as Weekday[]).map((weekday) => ({ weekday, open, close }));

const resources = [
  { id: 'may-mai', tenantId, branchId, resourceTypeId: 'may-rt-stylist', name: 'Mai' },
  { id: 'may-lan', tenantId, branchId, resourceTypeId: 'may-rt-stylist', name: 'Lan' },
  { id: 'may-hung', tenantId, branchId, resourceTypeId: 'may-rt-stylist', name: 'Hùng' },
  { id: 'may-chair-1', tenantId, branchId, resourceTypeId: 'may-rt-chair', name: 'Ghế 1' },
  { id: 'may-chair-2', tenantId, branchId, resourceTypeId: 'may-rt-chair', name: 'Ghế 2' },
  { id: 'may-chair-3', tenantId, branchId, resourceTypeId: 'may-rt-chair', name: 'Ghế 3' },
  { id: 'may-wash-1', tenantId, branchId, resourceTypeId: 'may-rt-wash', name: 'Giường gội 1' },
];

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
    skillServiceIds: ['may-cut', 'may-wash', 'may-dye'],
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

const appointment = appointmentBuilder({
  tenantId,
  branchId,
  services,
  resources,
  staff: staffList,
});

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
    ['thu', 'Nguyễn Minh Thư'],
    ['an', 'Trần Bảo An'],
    ['ha', 'Lê Thu Hà'],
    ['tuan', 'Đỗ Anh Tuấn'],
    ['ngoc', 'Hoàng Bích Ngọc'],
    ['vy', 'Ngô Tường Vy'],
    ['phuc', 'Bùi Hữu Phúc'],
    ['van', 'Vũ Thanh Vân'],
  ] as const
).map(([key, name]) => ({
  id: `may-s-${key}`,
  tenantId,
  customerId: `may-c-${key}`,
  kind: 'self' as const,
  name,
  attributes: {},
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
        resourceIds: ['may-mai', 'may-chair-1', 'may-wash-1'],
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
      staffChoice: 'chosen',
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
        resourceIds: ['may-hung', 'may-chair-3', 'may-wash-1'],
        staffChoice: 'chosen',
      },
    ],
    { depositVnd: 150_000n },
  ),
  // The afternoon, so a receptionist can book Lan at 14:00 on Ghế 2 (design/screens/LichTaoMoi.dc.html).
  appointment('may-a-lam', 'may-c-lam', '2026-11-07T06:30:00Z', 'confirmed', [
    { variantId: 'may-cut-short', subjectId: 'may-s-lam', resourceIds: ['may-mai', 'may-chair-1'] },
  ]),
  appointment('may-a-khanh', 'may-c-khanh', '2026-11-07T06:00:00Z', 'confirmed', [
    {
      variantId: 'may-cut-short',
      subjectId: 'may-s-khanh',
      resourceIds: ['may-lan', 'may-chair-2'],
    },
  ]),
  appointment('may-a-quyen', 'may-c-quyen', '2026-11-07T08:00:00Z', 'confirmed', [
    {
      variantId: 'may-cut-long',
      subjectId: 'may-s-quyen',
      resourceIds: ['may-lan', 'may-chair-2'],
    },
  ]),
  appointment('may-a-dieu', 'may-c-dieu', '2026-11-07T08:00:00Z', 'confirmed', [
    { variantId: 'may-wash-std', subjectId: 'may-s-dieu', resourceIds: ['may-mai', 'may-wash-1'] },
  ]),
];
// Customers who only appear on the other days of the week. [key, name, call name, hair length]
const others = (
  [
    ['lam', 'Phan Ngọc Lam', 'Chị Lam'],
    ['khanh', 'Trịnh Quốc Khánh', 'Anh Khánh'],
    ['my', 'Đặng Thảo My', 'Chị My'],
    ['duy', 'Lý Minh Duy', 'Anh Duy'],
    ['trang', 'Cao Thùy Trang', 'Chị Trang'],
    ['hieu', 'Mạc Trung Hiếu', 'Anh Hiếu'],
    ['nhi', 'Tạ Yến Nhi', 'Chị Nhi'],
    ['son', 'Hồ Thanh Sơn', 'Anh Sơn'],
    ['quyen', 'La Bảo Quyên', 'Chị Quyên'],
    ['tam', 'Kiều Minh Tâm', 'Chị Tâm'],
    ['long', 'Dương Hải Long', 'Anh Long'],
    ['huong', 'Lương Thu Hương', 'Chị Hương'],
    // Over 30 characters, to test wrapping.
    ['phuongthao', 'Công Tôn Nữ Hoàng Thị Phương Thảo', 'Chị Phương Thảo'],
  ] as const
).map(([key, name, callName], i) => ({
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
    attributes: {},
  } satisfies ServedSubject,
}));

// Customers of the appointments written by hand for 07/11 and later. Kept apart from the lists
// the generators draw from, so adding them does not move the generated data.
const handwritten2 = (
  [
    ['dieu', 'Vương Thị Diệu', 'Chị Diệu'],
    ['hang', 'Trương Thu Hằng', 'Chị Hằng'],
    ['kha', 'Lâm Gia Kha', 'Anh Kha'],
    ['hanh', 'Đoàn Mỹ Hạnh', 'Chị Hạnh'],
  ] as const
).map(([key, name, callName], i) => ({
  customer: {
    id: `may-c-${key}`,
    tenantId,
    name,
    callName,
    phone: `+8490600${1000 + i}`,
    visitCount: 1 + (i % 3),
  } satisfies Customer,
  subject: {
    id: `may-s-${key}`,
    tenantId,
    customerId: `may-c-${key}`,
    kind: 'self',
    name,
    attributes: {},
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
      attributes: {},
    },
  ],
});
const everyone = [
  ...regulars,
  ...others.map((o) => o.customer),
  ...people.customers,
  ...handwritten2.map((o) => o.customer),
];
const servedSubjects = [...weekSubjects, ...people.subjects];
const allSubjects = [...servedSubjects, ...handwritten2.map((o) => o.subject)];

/** Local `YYYY-MM-DD` and `HH:mm` as a UTC instant. */
const at = (date: string, hhmm: string) => new Date(`${date}T${hhmm}:00+07:00`).toISOString();

const staffTimeOff: StaffTimeOff[] = [
  // Pending: Lan off Tuesday 10/11 with four appointments (design/screens/NghiPhepXuLy.dc.html).
  {
    id: 'may-lv-1',
    resourceId: 'may-lan',
    date: '2026-11-10',
    reason: 'Việc gia đình',
    status: 'pending',
    sentAt: at('2026-11-07', '08:05'),
    handling: {
      'may-a-hang': { kind: 'swap', staffResourceId: 'may-mai' },
      'may-a-quyen-dye': {
        kind: 'asked',
        staffResourceId: 'may-mai',
        sentAt: at('2026-11-07', '09:40'),
      },
    },
  },
  // Pending: Hùng off a few hours on 14/11. The email to the customer who named him was sent on
  // 05/11, so its answer is overdue (BR-33).
  {
    id: 'may-lv-2',
    resourceId: 'may-hung',
    date: '2026-11-14',
    from: '14:00',
    to: '17:00',
    reason: 'Đi khám',
    status: 'pending',
    sentAt: at('2026-11-05', '17:40'),
    handling: {
      'may-a-long-sat': {
        kind: 'asked',
        staffResourceId: 'may-mai',
        sentAt: at('2026-11-05', '18:00'),
      },
    },
  },
  {
    id: 'may-lv-3',
    resourceId: 'may-lan',
    date: '2026-11-03',
    reason: 'Phép năm',
    status: 'approved',
    sentAt: at('2026-10-30', '10:05'),
    affectedCount: 0,
  },
  {
    id: 'may-lv-4',
    resourceId: 'may-mai',
    date: '2026-10-30',
    from: '09:00',
    to: '12:00',
    reason: 'Học thêm màu',
    status: 'approved',
    sentAt: at('2026-10-26', '15:20'),
    affectedCount: 1,
  },
  {
    id: 'may-lv-5',
    resourceId: 'may-hung',
    date: '2026-10-28',
    reason: 'Ốm',
    status: 'approved',
    sentAt: at('2026-10-28', '07:02'),
    affectedCount: 3,
  },
  {
    id: 'may-lv-6',
    resourceId: 'may-lan',
    date: '2026-10-25',
    reason: 'Đám cưới bạn',
    status: 'rejected',
    sentAt: at('2026-10-12', '20:11'),
    affectedCount: 5,
    rejectReason: 'Cuối tuần đông khách, chưa có người thay.',
  },
];

// Shifts: today, and the weeks 09/11 and 16/11 (the 9th is closed for maintenance). Mai starts at
// 08:45 so the colour is mixed before 09:00 (BR-54, BR-35).
const shifts: Shift[] = [
  ...(
    [
      ['may-mai', '08:45', '17:00'],
      ['may-lan', '08:00', '20:00'],
      ['may-hung', '09:00', '20:00'],
    ] as const
  ).map(([resourceId, start, end]): Shift => ({ resourceId, date: '2026-11-07', start, end })),
  ...dateRange('2026-11-10', '2026-11-22').flatMap((date) => {
    const sunday = new Date(`${date}T00:00:00Z`).getUTCDay() === 0;
    const day = (resourceId: string, start: Shift['start'], end: Shift['end']): Shift => ({
      resourceId,
      date,
      start,
      end,
    });
    return sunday
      ? [
          day('may-lan', '09:00', '13:00'),
          day('may-lan', '15:00', '20:00'),
          day('may-hung', '08:00', '12:00'),
        ]
      : [
          day('may-mai', '08:45', '17:00'),
          day('may-lan', '12:00', '20:00'),
          day('may-hung', '10:00', '20:00'),
        ];
  }),
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
        resourceIds: ['may-mai', 'may-chair-1', 'may-wash-1'],
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
        resourceIds: ['may-hung', 'may-chair-2', 'may-wash-1'],
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
  shifts,
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
  timeOff: staffTimeOff,
  shifts,
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
// Later days written by hand, for the leave and shift screens (MH-38 to MH-40).
const ahead: Appointment[] = [
  // Tuesday 10/11, Lan off: four appointments to deal with. Hùng is busy 17:00–18:00.
  appointment('may-a-hang', 'may-c-hang', at('2026-11-10', '12:00'), 'confirmed', [
    { variantId: 'may-cut-long', subjectId: 'may-s-hang', resourceIds: ['may-lan', 'may-chair-2'] },
  ]),
  appointment('may-a-kha', 'may-c-kha', at('2026-11-10', '13:00'), 'confirmed', [
    { variantId: 'may-cut-short', subjectId: 'may-s-kha', resourceIds: ['may-lan', 'may-chair-3'] },
  ]),
  appointment(
    'may-a-quyen-dye',
    'may-c-quyen',
    at('2026-11-10', '14:00'),
    'confirmed',
    [
      {
        variantId: 'may-dye-short',
        subjectId: 'may-s-quyen',
        resourceIds: ['may-lan', 'may-chair-2', 'may-wash-1'],
        staffChoice: 'chosen',
      },
    ],
    { depositVnd: 100_000n },
  ),
  appointment('may-a-lam2', 'may-c-lam', at('2026-11-10', '17:30'), 'confirmed', [
    { variantId: 'may-wash-std', subjectId: 'may-s-lam', resourceIds: ['may-lan', 'may-wash-1'] },
  ]),
  // Mai is busier than Hùng that day, so Hùng is the one BR-57 would pick for Anh Kha.
  appointment('may-a-son-tue', 'may-c-son', at('2026-11-10', '10:00'), 'confirmed', [
    { variantId: 'may-cut-long', subjectId: 'may-s-son', resourceIds: ['may-mai', 'may-chair-1'] },
  ]),
  appointment('may-a-tam-tue', 'may-c-tam', at('2026-11-10', '16:00'), 'confirmed', [
    { variantId: 'may-cut-short', subjectId: 'may-s-tam', resourceIds: ['may-mai', 'may-chair-3'] },
  ]),
  appointment('may-a-hanh', 'may-c-hanh', at('2026-11-10', '17:00'), 'confirmed', [
    {
      variantId: 'may-cut-long',
      subjectId: 'may-s-hanh',
      resourceIds: ['may-hung', 'may-chair-1'],
    },
  ]),
  // Friday 13/11: Hùng's two appointments after 15:00, for cutting his shift short.
  appointment('may-a-nhi-fri', 'may-c-nhi', at('2026-11-13', '10:00'), 'confirmed', [
    { variantId: 'may-cut-long', subjectId: 'may-s-nhi', resourceIds: ['may-mai', 'may-chair-1'] },
  ]),
  appointment('may-a-son-fri', 'may-c-son', at('2026-11-13', '13:00'), 'confirmed', [
    { variantId: 'may-wash-std', subjectId: 'may-s-son', resourceIds: ['may-lan', 'may-wash-1'] },
  ]),
  appointment('may-a-kha-fri', 'may-c-kha', at('2026-11-13', '16:00'), 'confirmed', [
    {
      variantId: 'may-cut-short',
      subjectId: 'may-s-kha',
      resourceIds: ['may-hung', 'may-chair-1'],
    },
  ]),
  appointment(
    'may-a-hang-fri',
    'may-c-hang',
    at('2026-11-13', '17:30'),
    'confirmed',
    [
      {
        variantId: 'may-dye-short',
        subjectId: 'may-s-hang',
        resourceIds: ['may-hung', 'may-chair-2', 'may-wash-1'],
        staffChoice: 'chosen',
      },
    ],
    { depositVnd: 100_000n },
  ),
  // Saturday 14/11: Hùng off 14:00–17:00, two appointments inside.
  appointment('may-a-tam-sat', 'may-c-tam', at('2026-11-14', '14:30'), 'confirmed', [
    { variantId: 'may-cut-long', subjectId: 'may-s-tam', resourceIds: ['may-hung', 'may-chair-1'] },
  ]),
  appointment(
    'may-a-long-sat',
    'may-c-long',
    at('2026-11-14', '16:00'),
    'confirmed',
    [
      {
        variantId: 'may-dye-short',
        subjectId: 'may-s-long',
        resourceIds: ['may-hung', 'may-chair-2', 'may-wash-1'],
        staffChoice: 'chosen',
      },
    ],
    { depositVnd: 100_000n },
  ),
];
const upcoming = generateWeek({
  ...longRun,
  seed: 20261110,
  idPrefix: 'may-f',
  dates: dateRange('2026-11-10', '2026-11-22'),
  fixed: ahead,
  counts: { '2026-11-10': 5, '2026-11-13': 4 },
});
const appointments = [...history, ...saturday, ...handwritten, ...week, ...ahead, ...upcoming];

export const salonTocMay: TenantFixture = {
  tenant: {
    id: tenantId,
    slug: 'toc-may',
    name: 'Salon Tóc Mây',
    industry: 'hair_salon',
    monogram: 'M',
  },
  template: hairSalonTemplate,
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
    { id: 'may-rt-chair', tenantId, name: 'Ghế cắt', isStaff: false },
    { id: 'may-rt-wash', tenantId, name: 'Giường gội', isStaff: false },
  ],
  resources,
  staff: staffList,
  staffTitles: ['Thợ chính', 'Thợ', 'Học việc'],
  staffLevels: ['Thợ', 'Thợ chính', 'Thợ cả'],
  shifts,
  staffTimeOff,
  staffSeesCustomerPhone: false,
  services,
  customers: withVisitCounts(everyone, appointments),
  servedSubjects: allSubjects,
  appointments,
};
