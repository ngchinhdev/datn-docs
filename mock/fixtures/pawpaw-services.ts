import type { Service, ServiceSegment } from './types.ts';

const tenantId = 'pawpaw';
const groomer = 'paw-rt-groomer';
const bath = 'paw-rt-bath';
const dryer = 'paw-rt-dryer';
const table = 'paw-rt-table';

/** Bath, then the cage dryer where the groomer is free, then a brush-out. */
const bathSegments = (washMinutes: number, dryMinutes: number, finishMinutes: number) => {
  const dryEnd = washMinutes + dryMinutes;
  return [
    {
      startMinute: 0,
      endMinute: washMinutes,
      kind: 'work',
      name: 'Tắm',
      resourceTypeIds: [groomer, bath],
    },
    {
      startMinute: washMinutes,
      endMinute: dryEnd,
      kind: 'wait',
      name: 'Sấy lồng',
      resourceTypeIds: [dryer],
    },
    {
      startMinute: dryEnd,
      endMinute: dryEnd + finishMinutes,
      kind: 'work',
      name: 'Chải, xịt thơm',
      resourceTypeIds: [groomer],
    },
  ] satisfies ServiceSegment[];
};

const groomSegments = (minutes: number) =>
  [
    {
      startMinute: 0,
      endMinute: minutes,
      kind: 'work',
      name: 'Cắt tỉa',
      resourceTypeIds: [groomer, table],
    },
  ] satisfies ServiceSegment[];

export const petServices: Service[] = [
  {
    id: 'paw-bath',
    tenantId,
    name: 'Tắm sấy',
    group: 'Tắm',
    variantSelection: 'subject',
    bookableOnline: true,
    variants: [
      {
        id: 'paw-bath-small',
        name: 'Chó dưới 10 kg',
        shortName: 'Tắm chó nhỏ',
        priceVnd: 150_000n,
        match: { species: 'dog', weightKg: { max: 10 } },
        segments: bathSegments(20, 30, 10),
        cleanupMinutes: { [bath]: 10, [dryer]: 5 },
      },
      {
        id: 'paw-bath-large',
        name: 'Chó từ 10 kg',
        shortName: 'Tắm chó lớn',
        priceVnd: 250_000n,
        match: { species: 'dog', weightKg: { min: 10 } },
        segments: bathSegments(30, 45, 15),
        cleanupMinutes: { [bath]: 10, [dryer]: 5 },
      },
      {
        id: 'paw-bath-cat',
        name: 'Mèo',
        shortName: 'Tắm mèo',
        priceVnd: 180_000n,
        match: { species: 'cat' },
        segments: bathSegments(25, 30, 5),
        cleanupMinutes: { [bath]: 10, [dryer]: 5 },
      },
    ],
  },
  {
    id: 'paw-groom',
    tenantId,
    name: 'Cắt tỉa lông',
    group: 'Cắt tỉa',
    variantSelection: 'subject',
    bookableOnline: true,
    variants: [
      {
        id: 'paw-groom-small',
        name: 'Chó dưới 10 kg',
        shortName: 'Tỉa chó nhỏ',
        priceVnd: 250_000n,
        match: { species: 'dog', weightKg: { max: 10 } },
        segments: groomSegments(60),
        cleanupMinutes: {},
      },
      {
        id: 'paw-groom-large',
        name: 'Chó từ 10 kg',
        shortName: 'Tỉa chó lớn',
        priceVnd: 400_000n,
        match: { species: 'dog', weightKg: { min: 10 } },
        segments: groomSegments(90),
        cleanupMinutes: {},
      },
    ],
  },
];
