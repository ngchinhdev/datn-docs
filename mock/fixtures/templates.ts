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
};
