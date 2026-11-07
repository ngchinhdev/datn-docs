import { appointmentBuilder } from './bookings';
import type { BusinessHours, Service, TenantFixture, Weekday } from './types';

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
          { startMinute: 30, endMinute: 75, kind: 'wait', resourceTypeIds: ['may-rt-chair'] },
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
          { startMinute: 40, endMinute: 85, kind: 'wait', resourceTypeIds: ['may-rt-chair'] },
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
      specialDays: [{ date: '2027-02-06', note: 'Nghỉ Tết', hours: null }],
    },
  ],
  resourceTypes: [
    { id: 'may-rt-stylist', tenantId, name: 'Thợ', isStaff: true },
    { id: 'may-rt-chair', tenantId, name: 'Ghế làm tóc', isStaff: false },
    { id: 'may-rt-wash', tenantId, name: 'Giường gội', isStaff: false },
  ],
  resources,
  staff: [
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
      },
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
      },
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
      },
      skillServiceIds: ['may-cut', 'may-wash', 'may-dye'],
    },
  ],
  services,
  customers: [
    { id: 'may-c-thu', tenantId, name: 'Nguyễn Minh Thư', phone: '+84912345678', visitCount: 3 },
    { id: 'may-c-an', tenantId, name: 'Trần Bảo An', phone: '+84987654321', visitCount: 2 },
    { id: 'may-c-ha', tenantId, name: 'Lê Thu Hà', phone: '+84934567890', visitCount: 6 },
    { id: 'may-c-tuan', tenantId, name: 'Đỗ Anh Tuấn', phone: '+84903111222', visitCount: 4 },
    { id: 'may-c-ngoc', tenantId, name: 'Hoàng Bích Ngọc', phone: '+84903222333', visitCount: 1 },
    { id: 'may-c-vy', tenantId, name: 'Ngô Tường Vy', phone: '+84903333444', visitCount: 5 },
    { id: 'may-c-phuc', tenantId, name: 'Bùi Hữu Phúc', phone: '+84903444555', visitCount: 2 },
    { id: 'may-c-van', tenantId, name: 'Vũ Thanh Vân', phone: '+84903555666', visitCount: 1 },
  ],
  servedSubjects: (
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
  })),
  // Saturday 07/11/2026, as drawn in design/screens/LeTanChiTiet.dc.html and LeTanTaiNguyen.dc.html.
  appointments: [
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
    appointment('may-a-tuan', 'may-c-tuan', '2026-11-07T02:30:00Z', 'completed', [
      {
        variantId: 'may-cut-short',
        subjectId: 'may-s-tuan',
        resourceIds: ['may-mai', 'may-chair-2'],
      },
    ]),
    appointment('may-a-ngoc', 'may-c-ngoc', '2026-11-07T04:00:00Z', 'confirmed', [
      {
        variantId: 'may-cut-long',
        subjectId: 'may-s-ngoc',
        resourceIds: ['may-mai', 'may-chair-1'],
      },
    ]),
    appointment('may-a-vy', 'may-c-vy', '2026-11-07T01:30:00Z', 'completed', [
      { variantId: 'may-wash-std', subjectId: 'may-s-vy', resourceIds: ['may-lan', 'may-wash-1'] },
    ]),
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
    appointment('may-a-thu', 'may-c-thu', '2026-11-07T06:00:00Z', 'confirmed', [
      {
        variantId: 'may-dye-long',
        subjectId: 'may-s-thu',
        resourceIds: ['may-hung', 'may-chair-3'],
      },
    ]),
  ],
};
