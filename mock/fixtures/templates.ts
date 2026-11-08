import type { IndustryTemplate } from './types';

export const hairSalonTemplate: IndustryTemplate = {
  id: 'hair_salon',
  name: 'Salon tóc',
  vocabulary: {
    staff: 'Thợ',
    subject: null,
    subjectQuestion: null,
    addSubject: null,
    subjectExample: null,
  },
  subjectSchema: [],
  resourceTypes: [
    { name: 'Ghế cắt', hint: 'Mỗi ghế phục vụ một khách một lúc', defaultCount: 3 },
    { name: 'Giường gội', hint: 'Dùng cho gội và gội sấy', defaultCount: 1 },
  ],
  sampleServices: [
    {
      name: 'Cắt tóc',
      variants: [
        { name: 'Tóc ngắn', minutes: 45, priceVnd: 150_000n },
        { name: 'Tóc dài', minutes: 60, priceVnd: 200_000n },
      ],
    },
    { name: 'Gội sấy', variants: [{ name: 'Tiêu chuẩn', minutes: 30, priceVnd: 80_000n }] },
    {
      name: 'Nhuộm tóc',
      variants: [
        { name: 'Tóc ngắn', minutes: 105, priceVnd: 500_000n, hasWait: true },
        { name: 'Tóc dài', minutes: 120, priceVnd: 700_000n, hasWait: true },
      ],
    },
  ],
  bookingFor: 'chính mình',
  previewNote:
    'Nhuộm tóc có 45 phút chờ lên màu: thợ rảnh để nhận khách khác, ghế vẫn bận. Giá, thời lượng và tên đều sửa được sau khi tạo.',
};

export const petSpaTemplate: IndustryTemplate = {
  id: 'pet_spa',
  name: 'Spa thú cưng',
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
    { name: 'Bồn tắm', hint: 'Mỗi bồn tắm một bé một lúc', defaultCount: 2 },
    { name: 'Lồng sấy', hint: 'Mỗi lồng sấy một bé một lúc', defaultCount: 2 },
    { name: 'Bàn cắt tỉa', hint: 'Mỗi bàn phục vụ một bé một lúc', defaultCount: 2 },
  ],
  sampleServices: [
    {
      name: 'Tắm sấy',
      priceBySubject: true,
      variants: [
        { name: 'Chó dưới 10 kg', minutes: 60, priceVnd: 150_000n },
        { name: 'Chó từ 10 kg', minutes: 90, priceVnd: 250_000n },
        { name: 'Mèo', minutes: 60, priceVnd: 180_000n },
      ],
    },
    {
      name: 'Cắt tỉa lông',
      priceBySubject: true,
      variants: [
        { name: 'Chó dưới 10 kg', minutes: 60, priceVnd: 250_000n },
        { name: 'Chó từ 10 kg', minutes: 90, priceVnd: 400_000n },
      ],
    },
  ],
  bookingFor: 'thú cưng',
  previewNote:
    'Giá chọn theo loài và cân nặng của bé (chó dưới 10 kg, từ 10 kg, mèo). Giá, thời lượng và tên đều sửa được sau khi tạo.',
};
