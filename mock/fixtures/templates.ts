import type { IndustryTemplate, SampleSegment, SampleService, TemplatePolicies } from './types.ts';

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
    subject: null,
    subjectQuestion: null,
    addSubject: null,
    subjectExample: null,
  },
  subjectSchema: [],
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
  bookingFor: 'chính mình',
  previewNote:
    'Nhuộm tóc có 45 phút chờ lên màu: thợ rảnh để nhận khách khác, ghế vẫn bận. Giá, thời lượng và tên đều sửa được sau khi tạo.',
};

const petBath = (wash: number, dry: number, finish: number) => [
  work('Tắm', wash, 'Nhân viên chăm sóc', 'Bồn tắm'),
  { name: 'Sấy lồng', kind: 'wait' as const, minutes: dry, types: ['Lồng sấy'] },
  work('Chải', finish, 'Nhân viên chăm sóc'),
];

const petSampleServices: SampleService[] = [
  {
    name: 'Tắm sấy',
    priceBySubject: true,
    variants: [
      {
        name: 'Chó dưới 10 kg',
        priceVnd: 150_000n,
        cleanup: { 'Bồn tắm': 10 },
        segments: petBath(20, 30, 10),
      },
      {
        name: 'Chó từ 10 kg',
        priceVnd: 250_000n,
        cleanup: { 'Bồn tắm': 10 },
        segments: petBath(30, 45, 15),
      },
      {
        name: 'Mèo',
        priceVnd: 180_000n,
        cleanup: { 'Bồn tắm': 10 },
        segments: petBath(25, 30, 5),
      },
    ],
  },
  {
    name: 'Cắt tỉa lông',
    priceBySubject: true,
    variants: [
      {
        name: 'Chó dưới 10 kg',
        priceVnd: 250_000n,
        segments: [work('Cắt tỉa', 60, 'Nhân viên chăm sóc', 'Bàn cắt tỉa')],
      },
      {
        name: 'Chó từ 10 kg',
        priceVnd: 400_000n,
        segments: [work('Cắt tỉa', 90, 'Nhân viên chăm sóc', 'Bàn cắt tỉa')],
      },
    ],
  },
];

/** The same services as the published version, before the draft added the bath cleanup. */
const petPublishedServices: SampleService[] = petSampleServices.map((service) => ({
  ...service,
  variants: service.variants.map(({ cleanup: _cleanup, ...variant }) => variant),
}));

export const petSpaTemplate: IndustryTemplate = {
  id: 'pet_spa',
  name: 'Spa thú cưng',
  status: 'open',
  cardDescription:
    'Tắm, cắt tỉa lông chó mèo. Bàn cắt tỉa, bồn tắm, lồng sấy. Giá theo loài và cân nặng.',
  publishedVersion: { number: 2, publishedAt: '2026-11-01', tenantsCreated: 4 },
  draft: {
    number: 3,
    changes: ['Tắm sấy: thêm rửa bồn 10′ sau khi dùng', 'Chính sách: đặt xa nhất 14 → 30 ngày'],
    base: {
      defaultPolicies: { ...policies, maxAdvanceDays: 14 },
      sampleServices: petPublishedServices,
    },
  },
  defaultPolicies: policies,
  updatedAt: '2026-11-07',
  vocabulary: {
    staff: 'Nhân viên chăm sóc',
    subject: 'bé',
    subjectQuestion: 'Cho bé nào?',
    addSubject: 'Thêm bé',
    subjectExample: 'Mochi',
  },
  subjectSchema: [
    {
      key: 'species',
      label: 'Loài',
      type: 'enum',
      options: [
        { value: 'dog', label: 'Chó' },
        { value: 'cat', label: 'Mèo' },
      ],
      required: true,
    },
    { key: 'breed', label: 'Giống', type: 'text', example: 'Poodle', required: false },
    {
      key: 'weightKg',
      label: 'Cân nặng',
      type: 'number',
      unit: 'kg',
      example: '6',
      required: { species: 'dog' },
    },
  ],
  resourceTypes: [
    {
      name: 'Nhân viên chăm sóc',
      isStaff: true,
      hint: 'Tạo cùng tài khoản chủ cơ sở',
      defaultCount: 1,
    },
    { name: 'Bồn tắm', isStaff: false, hint: 'Mỗi bồn tắm một bé một lúc', defaultCount: 2 },
    { name: 'Lồng sấy', isStaff: false, hint: 'Mỗi lồng sấy một bé một lúc', defaultCount: 2 },
    {
      name: 'Bàn cắt tỉa',
      isStaff: false,
      hint: 'Mỗi bàn phục vụ một bé một lúc',
      defaultCount: 2,
    },
  ],
  serviceGroups: ['Tắm', 'Cắt tỉa', 'Chăm sóc thêm'],
  sampleServices: petSampleServices,
  bookingFor: 'thú cưng',
  previewNote:
    'Giá chọn theo loài và cân nặng của bé (chó dưới 10 kg, từ 10 kg, mèo). Giá, thời lượng và tên đều sửa được sau khi tạo.',
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
    subject: null,
    subjectQuestion: null,
    addSubject: null,
    subjectExample: null,
  },
  subjectSchema: [],
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
  bookingFor: 'chính mình',
  previewNote: 'Giá, thời lượng và tên đều sửa được sau khi tạo.',
};

export const beautySpaTemplate: IndustryTemplate = {
  id: 'beauty_spa',
  name: 'Spa và thẩm mỹ',
  status: 'soon',
  cardDescription: 'Massage, chăm sóc da. Phòng, giường spa.',
  publishedVersion: null,
  draft: null,
  defaultPolicies: policies,
  updatedAt: '2026-11-02',
  vocabulary: {
    staff: 'Kỹ thuật viên',
    subject: null,
    subjectQuestion: null,
    addSubject: null,
    subjectExample: null,
  },
  subjectSchema: [],
  resourceTypes: [
    { name: 'Kỹ thuật viên', isStaff: true, hint: 'Tạo cùng tài khoản chủ cơ sở', defaultCount: 1 },
    { name: 'Phòng spa', isStaff: false, hint: 'Mỗi phòng một khách một lúc', defaultCount: 2 },
  ],
  serviceGroups: ['Massage', 'Chăm sóc da'],
  sampleServices: [],
  bookingFor: 'chính mình',
  previewNote: 'Giá, thời lượng và tên đều sửa được sau khi tạo.',
};

/** Every template, in the order the administrator lists them. */
export const industryTemplates: IndustryTemplate[] = [
  hairSalonTemplate,
  petSpaTemplate,
  nailSalonTemplate,
  beautySpaTemplate,
];
