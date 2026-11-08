import type { Service } from './types.ts';

const tenantId = 'may';

export const salonServices: Service[] = [
  {
    id: 'may-cut',
    tenantId,
    name: 'Cắt tóc',
    group: 'Cắt',
    description: 'Gội nhanh, cắt và tạo kiểu.',
    variantSelection: 'customer',
    bookableOnline: true,
    variants: [
      {
        id: 'may-cut-short',
        name: 'Tóc ngắn',
        shortName: 'Cắt ngắn',
        priceVnd: 150_000n,
        match: {},
        segments: [
          {
            startMinute: 0,
            endMinute: 45,
            kind: 'work',
            name: 'Cắt',
            resourceTypeIds: ['may-rt-stylist', 'may-rt-chair'],
          },
        ],
        cleanupMinutes: {},
      },
      {
        id: 'may-cut-long',
        name: 'Tóc dài',
        shortName: 'Cắt dài',
        priceVnd: 200_000n,
        match: {},
        segments: [
          {
            startMinute: 0,
            endMinute: 60,
            kind: 'work',
            name: 'Cắt',
            resourceTypeIds: ['may-rt-stylist', 'may-rt-chair'],
          },
        ],
        cleanupMinutes: {},
      },
    ],
  },
  {
    id: 'may-wash',
    tenantId,
    name: 'Gội sấy',
    group: 'Gội',
    variantSelection: 'customer',
    bookableOnline: true,
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
            name: 'Gội sấy',
            resourceTypeIds: ['may-rt-stylist', 'may-rt-wash'],
          },
        ],
        cleanupMinutes: {},
      },
    ],
  },
  {
    // The color is mixed before the customer sits down, then it takes: the stylist is free, the
    // chair stays occupied, and the chair is cleaned after the last step (BR-50 to BR-52).
    id: 'may-dye',
    tenantId,
    name: 'Nhuộm tóc',
    group: 'Nhuộm và uốn',
    description: 'Nhuộm một màu, đã gồm gội và sấy. Thợ tư vấn màu trước khi làm.',
    variantSelection: 'customer',
    bookableOnline: true,
    variants: [
      {
        id: 'may-dye-short',
        name: 'Tóc ngắn',
        shortName: 'Nhuộm ngắn',
        priceVnd: 500_000n,
        pricesByLevel: [500_000n, 550_000n, 600_000n],
        depositVnd: 100_000n,
        match: {},
        segments: [
          {
            startMinute: 0,
            endMinute: 15,
            kind: 'prep',
            name: 'Pha thuốc',
            resourceTypeIds: ['may-rt-stylist'],
          },
          {
            startMinute: 15,
            endMinute: 45,
            kind: 'work',
            name: 'Bôi thuốc',
            resourceTypeIds: ['may-rt-stylist', 'may-rt-chair'],
          },
          {
            startMinute: 45,
            endMinute: 90,
            kind: 'wait',
            name: 'Chờ lên màu',
            resourceTypeIds: ['may-rt-chair'],
          },
          {
            startMinute: 90,
            endMinute: 105,
            kind: 'work',
            name: 'Xả thuốc, gội',
            resourceTypeIds: ['may-rt-stylist', 'may-rt-wash'],
          },
          {
            startMinute: 105,
            endMinute: 120,
            kind: 'work',
            name: 'Sấy, tạo kiểu',
            resourceTypeIds: ['may-rt-stylist', 'may-rt-chair'],
          },
        ],
        cleanupMinutes: { 'may-rt-chair': 10 },
      },
      {
        id: 'may-dye-long',
        name: 'Tóc dài',
        shortName: 'Nhuộm dài',
        priceVnd: 700_000n,
        pricesByLevel: [700_000n, 770_000n, 840_000n],
        depositVnd: 100_000n,
        match: {},
        segments: [
          {
            startMinute: 0,
            endMinute: 15,
            kind: 'prep',
            name: 'Pha thuốc',
            resourceTypeIds: ['may-rt-stylist'],
          },
          {
            startMinute: 15,
            endMinute: 55,
            kind: 'work',
            name: 'Bôi thuốc',
            resourceTypeIds: ['may-rt-stylist', 'may-rt-chair'],
          },
          {
            startMinute: 55,
            endMinute: 100,
            kind: 'wait',
            name: 'Chờ lên màu',
            resourceTypeIds: ['may-rt-chair'],
          },
          {
            startMinute: 100,
            endMinute: 115,
            kind: 'work',
            name: 'Xả thuốc, gội',
            resourceTypeIds: ['may-rt-stylist', 'may-rt-wash'],
          },
          {
            startMinute: 115,
            endMinute: 135,
            kind: 'work',
            name: 'Sấy, tạo kiểu',
            resourceTypeIds: ['may-rt-stylist', 'may-rt-chair'],
          },
        ],
        cleanupMinutes: { 'may-rt-chair': 10 },
      },
    ],
  },
];
