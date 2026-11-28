import type { IndustryTemplate, SampleSegment, TemplatePolicies } from './types.ts';

const policies: TemplatePolicies = {
  minNoticeHours: 2,
  maxAdvanceDays: 30,
  cancelBeforeHours: 4,
  maxReschedules: 2,
  noShowAfterMinutes: 15,
  depositAfterNoShows: 2,
};

const work = (name: string, minutes: number, ...types: string[]): SampleSegment => ({
  name,
  kind: 'work',
  minutes,
  types,
});

export const hairSalonTemplate: IndustryTemplate = {
  id: 'hair_salon',
  name: 'Salon tóc',
  status: 'open',
  cardDescription: 'Cắt, gội, nhuộm, uốn. Ghế cắt, giường gội.',
  publishedVersion: { number: 3, publishedAt: '2026-11-05', tenantsCreated: 12 },
  draft: null,
  defaultPolicies: policies,
  updatedAt: '2026-11-05',
  vocabulary: {
    staff: 'Thợ',
  },
  resourceTypes: [
    { name: 'Thợ', isStaff: true, hint: 'Tạo cùng tài khoản chủ cơ sở', defaultCount: 1 },
    {
      name: 'Ghế cắt',
      isStaff: false,
      hint: 'Mỗi ghế phục vụ một khách một lúc',
      defaultCount: 3,
    },
    { name: 'Giường gội', isStaff: false, hint: 'Dùng cho gội và gội sấy', defaultCount: 1 },
  ],
  serviceGroups: ['Cắt', 'Gội', 'Nhuộm và uốn', 'Phục hồi'],
  sampleServices: [
    {
      name: 'Cắt tóc',
      variants: [
        {
          name: 'Tóc ngắn',
          priceVnd: 150_000n,
          segments: [work('Cắt', 45, 'Thợ', 'Ghế cắt')],
        },
        {
          name: 'Tóc dài',
          priceVnd: 200_000n,
          segments: [work('Cắt', 60, 'Thợ', 'Ghế cắt')],
        },
      ],
    },
    {
      name: 'Gội sấy',
      variants: [
        {
          name: 'Tiêu chuẩn',
          priceVnd: 80_000n,
          segments: [work('Gội sấy', 30, 'Thợ', 'Giường gội')],
        },
      ],
    },
    {
      name: 'Nhuộm tóc',
      variants: [
        {
          name: 'Tóc ngắn',
          priceVnd: 500_000n,
          cleanup: { 'Ghế cắt': 10 },
          segments: [
            { name: 'Pha thuốc', kind: 'prep', minutes: 15, types: ['Thợ'] },
            work('Bôi thuốc', 30, 'Thợ', 'Ghế cắt'),
            { name: 'Chờ lên màu', kind: 'wait', minutes: 45, types: ['Ghế cắt'] },
            work('Xả thuốc, gội', 15, 'Thợ', 'Giường gội'),
            work('Sấy, tạo kiểu', 15, 'Thợ', 'Ghế cắt'),
          ],
        },
        {
          name: 'Tóc dài',
          priceVnd: 700_000n,
          cleanup: { 'Ghế cắt': 10 },
          segments: [
            { name: 'Pha thuốc', kind: 'prep', minutes: 15, types: ['Thợ'] },
            work('Bôi thuốc', 40, 'Thợ', 'Ghế cắt'),
            { name: 'Chờ lên màu', kind: 'wait', minutes: 45, types: ['Ghế cắt'] },
            work('Xả thuốc, gội', 15, 'Thợ', 'Giường gội'),
            work('Sấy, tạo kiểu', 20, 'Thợ', 'Ghế cắt'),
          ],
        },
      ],
    },
  ],
  previewNote:
    'Nhuộm tóc có 45 phút chờ lên màu: thợ rảnh để nhận khách khác, ghế vẫn bận. Giá, thời lượng và tên đều sửa được sau khi tạo.',
};

export const nailSalonTemplate: IndustryTemplate = {
  id: 'nail_salon',
  name: 'Tiệm nail',
  status: 'soon',
  cardDescription: 'Sơn gel, đắp bột, chăm sóc móng. Bàn nail, ghế pedicure.',
  publishedVersion: null,
  draft: null,
  defaultPolicies: policies,
  updatedAt: '2026-11-02',
  vocabulary: {
    staff: 'Thợ nail',
  },
  resourceTypes: [
    { name: 'Thợ nail', isStaff: true, hint: 'Tạo cùng tài khoản chủ cơ sở', defaultCount: 1 },
    { name: 'Bàn nail', isStaff: false, hint: 'Mỗi bàn một khách một lúc', defaultCount: 2 },
    { name: 'Ghế pedicure', isStaff: false, hint: 'Mỗi ghế một khách một lúc', defaultCount: 1 },
  ],
  serviceGroups: ['Sơn', 'Đắp móng', 'Chăm sóc'],
  sampleServices: [
    {
      name: 'Sơn gel',
      variants: [
        {
          name: 'Tiêu chuẩn',
          priceVnd: 200_000n,
          segments: [work('Sơn gel', 60, 'Thợ nail', 'Bàn nail')],
        },
      ],
    },
  ],
  previewNote: 'Giá, thời lượng và tên đều sửa được sau khi tạo.',
};

export const beautySpaTemplate: IndustryTemplate = {
  id: 'beauty_spa',
  name: 'Spa',
  status: 'open',
  cardDescription: 'Massage, ngâm bùn, chăm sóc da. Giường, bồn ngâm, phòng xông.',
  publishedVersion: { number: 2, publishedAt: '2026-11-01', tenantsCreated: 7 },
  draft: null,
  defaultPolicies: policies,
  updatedAt: '2026-11-01',
  vocabulary: {
    staff: 'Kỹ thuật viên',
  },
  resourceTypes: [
    { name: 'Kỹ thuật viên', isStaff: true, hint: 'Tạo cùng tài khoản chủ cơ sở', defaultCount: 1 },
    { name: 'Giường', isStaff: false, hint: 'Mỗi giường một khách một lúc', defaultCount: 2 },
    { name: 'Bồn ngâm', isStaff: false, hint: 'Dùng cho ngâm bùn', defaultCount: 1 },
    { name: 'Phòng xông', isStaff: false, hint: 'Mỗi phòng một khách một lúc', defaultCount: 1 },
  ],
  serviceGroups: ['Trị liệu', 'Massage', 'Chăm sóc da', 'Gội'],
  sampleServices: [
    {
      name: 'Ngâm bùn, xông hơi',
      variants: [
        {
          name: 'Tiêu chuẩn',
          priceVnd: 450_000n,
          cleanup: { 'Bồn ngâm': 10, 'Phòng xông': 5 },
          segments: [
            work('Ngâm bùn', 30, 'Kỹ thuật viên', 'Bồn ngâm'),
            { name: 'Xông hơi', kind: 'wait', minutes: 45, types: ['Phòng xông'] },
            work('Thoa dưỡng thể', 15, 'Kỹ thuật viên'),
          ],
        },
      ],
    },
    {
      name: 'Massage body',
      variants: [
        {
          name: '60 phút',
          priceVnd: 350_000n,
          segments: [work('Massage', 60, 'Kỹ thuật viên', 'Giường')],
        },
        {
          name: '90 phút',
          priceVnd: 500_000n,
          segments: [work('Massage', 90, 'Kỹ thuật viên', 'Giường')],
        },
      ],
    },
  ],
  previewNote:
    'Ngâm bùn có 45 phút xông hơi: kỹ thuật viên rảnh để nhận khách khác, phòng xông vẫn bận. Giá, thời lượng và tên đều sửa được sau khi tạo.',
};

/** Every template, in the order the administrator lists them. */
export const industryTemplates: IndustryTemplate[] = [
  hairSalonTemplate,
  beautySpaTemplate,
  nailSalonTemplate,
];
