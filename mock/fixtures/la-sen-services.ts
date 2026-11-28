import type { Service, ServiceSegment } from './types.ts';

const tenantId = 'la-sen';
const tech = 'sen-rt-tech';
const bed = 'sen-rt-bed';
const tub = 'sen-rt-tub';
const steam = 'sen-rt-steam';

/** One treatment on a bed: the technician and the bed are busy the whole time. */
const bedSegments = (name: string, minutes: number) =>
  [
    { startMinute: 0, endMinute: minutes, kind: 'work', name, resourceTypeIds: [tech, bed] },
  ] satisfies ServiceSegment[];

export const spaServices: Service[] = [
  {
    // The mud is washed off, then the guest steams alone: the technician is free, the steam room
    // stays busy, and the tub is rinsed while the guest is still steaming (BR-50 to BR-52).
    id: 'sen-mud',
    tenantId,
    name: 'Ngâm bùn, xông hơi',
    group: 'Trị liệu',
    description: 'Ngâm bùn khoáng, xông hơi thảo mộc, thoa dưỡng thể.',
    bookableOnline: true,
    variants: [
      {
        id: 'sen-mud-std',
        name: 'Tiêu chuẩn',
        shortName: 'Ngâm bùn',
        priceVnd: 450_000n,
        depositVnd: 100_000n,
        segments: [
          {
            startMinute: 0,
            endMinute: 30,
            kind: 'work',
            name: 'Ngâm bùn',
            resourceTypeIds: [tech, tub],
          },
          {
            startMinute: 30,
            endMinute: 75,
            kind: 'wait',
            name: 'Xông hơi',
            resourceTypeIds: [steam],
          },
          {
            startMinute: 75,
            endMinute: 90,
            kind: 'work',
            name: 'Thoa dưỡng thể',
            resourceTypeIds: [tech],
          },
        ],
        cleanupMinutes: { [tub]: 10, [steam]: 5 },
      },
    ],
  },
  {
    id: 'sen-massage',
    tenantId,
    name: 'Massage body',
    group: 'Massage',
    description: 'Massage toàn thân với tinh dầu.',
    bookableOnline: true,
    variants: [
      {
        id: 'sen-massage-60',
        name: '60 phút',
        shortName: 'Massage 60′',
        priceVnd: 350_000n,
        segments: bedSegments('Massage', 60),
        cleanupMinutes: { [bed]: 5 },
      },
      {
        id: 'sen-massage-90',
        name: '90 phút',
        shortName: 'Massage 90′',
        priceVnd: 500_000n,
        segments: bedSegments('Massage', 90),
        cleanupMinutes: { [bed]: 5 },
      },
    ],
  },
  {
    // The mask sets on the bed: the technician is free for 15 minutes.
    id: 'sen-facial',
    tenantId,
    name: 'Chăm sóc da mặt',
    group: 'Chăm sóc da',
    description: 'Làm sạch, đắp mặt nạ, massage mặt và dưỡng.',
    bookableOnline: true,
    variants: [
      {
        id: 'sen-facial-std',
        name: 'Tiêu chuẩn',
        shortName: 'Chăm sóc da',
        priceVnd: 400_000n,
        segments: [
          {
            startMinute: 0,
            endMinute: 25,
            kind: 'work',
            name: 'Làm sạch, tẩy da',
            resourceTypeIds: [tech, bed],
          },
          {
            startMinute: 25,
            endMinute: 40,
            kind: 'wait',
            name: 'Đắp mặt nạ',
            resourceTypeIds: [bed],
          },
          {
            startMinute: 40,
            endMinute: 60,
            kind: 'work',
            name: 'Massage mặt, dưỡng',
            resourceTypeIds: [tech, bed],
          },
        ],
        cleanupMinutes: { [bed]: 5 },
      },
    ],
  },
  {
    id: 'sen-hairwash',
    tenantId,
    name: 'Gội dưỡng sinh',
    group: 'Gội',
    description: 'Gội thảo dược, bấm huyệt đầu và vai gáy.',
    bookableOnline: true,
    variants: [
      {
        id: 'sen-hairwash-std',
        name: 'Tiêu chuẩn',
        shortName: 'Gội dưỡng sinh',
        priceVnd: 200_000n,
        segments: bedSegments('Gội, bấm huyệt', 45),
        cleanupMinutes: {},
      },
    ],
  },
];
