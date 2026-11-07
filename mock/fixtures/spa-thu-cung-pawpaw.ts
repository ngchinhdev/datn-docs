import { appointmentBuilder } from './bookings';
import type { BusinessHours, Service, TenantFixture, Weekday } from './types';

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
        priceVnd: 150_000n,
        match: { species: 'dog', size: 'small' },
        segments: [
          {
            startMinute: 0,
            endMinute: 20,
            kind: 'work',
            resourceTypeIds: ['paw-rt-groomer', 'paw-rt-bath'],
          },
          { startMinute: 20, endMinute: 50, kind: 'wait', resourceTypeIds: ['paw-rt-dryer'] },
          { startMinute: 50, endMinute: 60, kind: 'work', resourceTypeIds: ['paw-rt-groomer'] },
        ],
      },
      {
        id: 'paw-bath-large',
        name: 'Chó từ 10 kg',
        priceVnd: 250_000n,
        match: { species: 'dog', size: 'large' },
        segments: [
          {
            startMinute: 0,
            endMinute: 30,
            kind: 'work',
            resourceTypeIds: ['paw-rt-groomer', 'paw-rt-bath'],
          },
          { startMinute: 30, endMinute: 75, kind: 'wait', resourceTypeIds: ['paw-rt-dryer'] },
          { startMinute: 75, endMinute: 90, kind: 'work', resourceTypeIds: ['paw-rt-groomer'] },
        ],
      },
      {
        id: 'paw-bath-cat',
        name: 'Mèo',
        priceVnd: 180_000n,
        match: { species: 'cat' },
        segments: [
          {
            startMinute: 0,
            endMinute: 25,
            kind: 'work',
            resourceTypeIds: ['paw-rt-groomer', 'paw-rt-bath'],
          },
          { startMinute: 25, endMinute: 55, kind: 'wait', resourceTypeIds: ['paw-rt-dryer'] },
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
  staff: [
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
  ],
  services,
  customers: [
    { id: 'paw-c-linh', tenantId, name: 'Phạm Khánh Linh', phone: '+84909111222' },
    { id: 'paw-c-duc', tenantId, name: 'Võ Minh Đức', phone: '+84938333444' },
  ],
  servedSubjects: [
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
  ],
  appointments: [
    // One visit, two pets side by side.
    appointment('paw-a-1', 'paw-c-linh', '2026-11-10T02:00:00Z', 'confirmed', [
      {
        variantId: 'paw-bath-small',
        subjectId: 'paw-s-mochi',
        resourceIds: ['paw-khoa', 'paw-bath-1', 'paw-dryer-1'],
      },
      {
        variantId: 'paw-bath-cat',
        subjectId: 'paw-s-bong',
        resourceIds: ['paw-vy', 'paw-bath-2', 'paw-dryer-2'],
        startAt: '2026-11-10T02:00:00Z',
      },
    ]),
    appointment('paw-a-2', 'paw-c-duc', '2026-11-10T06:00:00Z', 'confirmed', [
      {
        variantId: 'paw-groom-large',
        subjectId: 'paw-s-lucky',
        resourceIds: ['paw-khoa', 'paw-table-1'],
      },
    ]),
  ],
};
