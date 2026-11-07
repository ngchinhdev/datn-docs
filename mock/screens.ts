import type { Role } from './selection';

export type ScreenStatus = 'todo' | 'in_progress' | 'approved';

export const screenStatusLabel: Record<ScreenStatus, string> = {
  todo: 'Chưa làm',
  in_progress: 'Đang làm',
  approved: 'Đã chốt',
};

export interface MockScreen {
  slug: string;
  title: string;
  description: string;
  roles: Role[];
  status: ScreenStatus;
  /** Mock routes that implement the screen. */
  routes?: { href: string; label: string }[];
}

/** Screens to agree on with the supervisor (roadmap, giai đoạn 1). Set `approved` once signed off. */
export const mockScreens: MockScreen[] = [
  {
    slug: 'trang-co-so',
    title: 'Trang cơ sở',
    description: 'Giới thiệu cơ sở, danh sách dịch vụ và nhân viên, nút vào luồng đặt lịch.',
    roles: ['customer'],
    status: 'todo',
  },
  {
    slug: 'dat-lich',
    title: 'Luồng đặt lịch',
    description: 'Chọn dịch vụ và đối tượng được phục vụ, xem giờ trống, giữ chỗ, xác nhận.',
    roles: ['customer'],
    status: 'in_progress',
    routes: [{ href: '/mock/dat-lich', label: 'Đặt lịch' }],
  },
  {
    slug: 'lich-le-tan',
    title: 'Lịch lễ tân',
    description:
      'Lưới tài nguyên theo thời gian trong ngày, thấy đoạn chờ; tạo, đổi, check-in lịch hẹn.',
    roles: ['receptionist', 'owner'],
    status: 'in_progress',
    routes: [
      { href: '/mock/le-tan', label: 'Theo nhân viên' },
      { href: '/mock/le-tan/tai-nguyen', label: 'Theo tài nguyên' },
      { href: '/mock/hom-nay', label: 'Hôm nay' },
    ],
  },
  {
    slug: 'cau-hinh-dich-vu',
    title: 'Cấu hình dịch vụ',
    description: 'Dịch vụ, biến thể, giá và các đoạn chiếm dụng theo loại tài nguyên.',
    roles: ['owner'],
    status: 'todo',
  },
  {
    slug: 'thu-tien',
    title: 'Thu tiền',
    description: 'Hóa đơn khi lịch hoàn thành, thanh toán và đặt cọc.',
    roles: ['receptionist', 'owner'],
    status: 'todo',
  },
];
