import type { BusinessHours, TenantFixture, Weekday } from './types';

const tenantId = 'may';
const branchId = 'may-q3';

const everyDay = (open: BusinessHours['open'], close: BusinessHours['close']): BusinessHours[] =>
  ([0, 1, 2, 3, 4, 5, 6] as Weekday[]).map((weekday) => ({ weekday, open, close }));

export const salonTocMay: TenantFixture = {
  tenant: { id: tenantId, slug: 'toc-may', name: 'Salon Tóc Mây', industry: 'hair_salon' },
  branches: [
    {
      id: branchId,
      tenantId,
      name: 'Tóc Mây Quận 3',
      address: '120 Võ Văn Tần, Phường Bàn Cờ, TP.HCM',
      timeZone: 'Asia/Ho_Chi_Minh',
      businessHours: everyDay('09:00', '20:00'),
      specialDays: [{ date: '2027-02-06', note: 'Nghỉ Tết', hours: null }],
    },
  ],
  resourceTypes: [
    { id: 'may-rt-stylist', tenantId, name: 'Thợ', isStaff: true },
    { id: 'may-rt-chair', tenantId, name: 'Ghế làm tóc', isStaff: false },
    { id: 'may-rt-wash', tenantId, name: 'Giường gội', isStaff: false },
  ],
  resources: [
    { id: 'may-mai', tenantId, branchId, resourceTypeId: 'may-rt-stylist', name: 'Mai' },
    { id: 'may-lan', tenantId, branchId, resourceTypeId: 'may-rt-stylist', name: 'Lan' },
    { id: 'may-hung', tenantId, branchId, resourceTypeId: 'may-rt-stylist', name: 'Hùng' },
    { id: 'may-chair-1', tenantId, branchId, resourceTypeId: 'may-rt-chair', name: 'Ghế 1' },
    { id: 'may-chair-2', tenantId, branchId, resourceTypeId: 'may-rt-chair', name: 'Ghế 2' },
    { id: 'may-chair-3', tenantId, branchId, resourceTypeId: 'may-rt-chair', name: 'Ghế 3' },
    { id: 'may-wash-1', tenantId, branchId, resourceTypeId: 'may-rt-wash', name: 'Giường gội 1' },
  ],
  staff: [
    {
      resourceId: 'may-mai',
      phone: '+84901000001',
      skillServiceIds: ['may-cut', 'may-wash', 'may-dye'],
    },
    { resourceId: 'may-lan', phone: '+84901000002', skillServiceIds: ['may-cut', 'may-wash'] },
    { resourceId: 'may-hung', phone: '+84901000003', skillServiceIds: ['may-cut', 'may-dye'] },
  ],
  services: [
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
  ],
  customers: [
    { id: 'may-c-thu', tenantId, name: 'Nguyễn Minh Thư', phone: '+84912345678' },
    { id: 'may-c-an', tenantId, name: 'Trần Bảo An', phone: '+84987654321' },
    { id: 'may-c-ha', tenantId, name: 'Lê Thu Hà', phone: '+84934567890' },
  ],
  servedSubjects: [
    {
      id: 'may-s-thu',
      tenantId,
      customerId: 'may-c-thu',
      kind: 'self',
      name: 'Nguyễn Minh Thư',
      attributes: { hairLength: 'long' },
    },
    {
      id: 'may-s-an',
      tenantId,
      customerId: 'may-c-an',
      kind: 'self',
      name: 'Trần Bảo An',
      attributes: { hairLength: 'short' },
    },
    {
      id: 'may-s-ha',
      tenantId,
      customerId: 'may-c-ha',
      kind: 'self',
      name: 'Lê Thu Hà',
      attributes: { hairLength: 'short' },
    },
  ],
  appointments: [
    {
      id: 'may-a-1',
      tenantId,
      branchId,
      customerId: 'may-c-thu',
      startAt: '2026-11-10T02:00:00Z',
      status: 'confirmed',
      items: [
        {
          serviceVariantId: 'may-dye-long',
          servedSubjectId: 'may-s-thu',
          staffResourceId: 'may-mai',
          priceVnd: 700_000n,
        },
      ],
    },
    {
      id: 'may-a-2',
      tenantId,
      branchId,
      customerId: 'may-c-an',
      startAt: '2026-11-10T02:30:00Z',
      status: 'confirmed',
      items: [
        {
          serviceVariantId: 'may-wash-std',
          servedSubjectId: 'may-s-an',
          staffResourceId: 'may-lan',
          priceVnd: 80_000n,
        },
        {
          serviceVariantId: 'may-cut-short',
          servedSubjectId: 'may-s-an',
          staffResourceId: 'may-lan',
          priceVnd: 150_000n,
        },
      ],
    },
    {
      id: 'may-a-3',
      tenantId,
      branchId,
      customerId: 'may-c-ha',
      startAt: '2026-11-10T07:00:00Z',
      status: 'checked_in',
      items: [
        {
          serviceVariantId: 'may-cut-short',
          servedSubjectId: 'may-s-ha',
          staffResourceId: 'may-hung',
          priceVnd: 150_000n,
        },
      ],
    },
  ],
};
