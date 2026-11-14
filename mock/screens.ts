import { fixtureBySlug, type Role } from './selection';

export type ScreenStatus = 'todo' | 'in_progress' | 'approved';

export const screenStatusLabel: Record<ScreenStatus, string> = {
  todo: 'Chưa làm',
  in_progress: 'Đang làm',
  approved: 'Đã chốt',
};

/** Who uses a screen: a role, the platform admin, anyone, or any signed-in staff. */
export type ScreenRole = Role | 'admin' | 'public' | 'staff';

export const screenRoleLabel: Record<ScreenRole, string> = {
  customer: 'Khách hàng',
  receptionist: 'Lễ tân',
  technician: 'Kỹ thuật viên',
  manager: 'Quản lý chi nhánh',
  owner: 'Chủ cơ sở',
  admin: 'Quản trị nền tảng',
  public: 'Ai cũng xem',
  staff: 'Nhân sự',
};

export type Zone = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H';

export const zoneTitle: Record<Zone, string> = {
  A: 'Tài khoản và đăng ký cơ sở',
  B: 'Khung chung',
  C: 'Khách hàng',
  D: 'Lễ tân và thu ngân',
  E: 'Kỹ thuật viên',
  F: 'Quản lý chi nhánh',
  G: 'Chủ cơ sở',
  H: 'Quản trị nền tảng',
};

/** How a screen is designed: drawn on the canvas, from the list or form template, or plain. */
export type ScreenLevel = 'Vẽ' | 'DS' | 'Form' | 'Nhẹ';

export type Wave = 1 | 2 | 3;

export interface MockScreen {
  code: string;
  title: string;
  zone: Zone;
  roles: ScreenRole[];
  wave: Wave;
  level: ScreenLevel;
  /** Real route patterns from the screen list, `[tenant]` and `[id]` as placeholders. */
  routes: string[];
  note: string;
}

export interface ScreenLink {
  label: string;
  href: (tenantSlug: string) => string;
  /** One link for the whole platform instead of one per tenant (the sign-up flow). */
  platform?: boolean;
}

const app = (path: string) => (slug: string) => `/mock/app/${slug}/${path}`;
const site = (path: string) => (slug: string) => `/mock/${slug}${path}`;
const firstStaffId = (slug: string) => fixtureBySlug(slug)?.staff[0]?.resourceId ?? '';

/** An appointment already checked in, so its detail has a payment to take. */
const checkedInId = (slug: string) =>
  fixtureBySlug(slug)?.appointments.find((a) => a.status === 'checked_in')?.id ?? '';

/** An invoice that is collected, so its detail has payments and a history. */
const firstInvoiceId = (slug: string) =>
  fixtureBySlug(slug)?.money.invoices.find((i) => i.paidAt)?.id ?? '';

/** A leave request still waiting for a decision, with appointments to deal with. */
const pendingLeaveId = (slug: string) =>
  fixtureBySlug(slug)?.staffTimeOff.find((l) => l.status === 'pending')?.id ?? '';

/** The service with a waiting segment: Nhuộm tóc at Tóc Mây, Tắm sấy at Pawpaw. */
const waitingServiceId = (slug: string) =>
  fixtureBySlug(slug)?.services.find((s) =>
    s.variants.some((v) => v.segments.some((segment) => segment.kind === 'wait')),
  )?.id ?? '';

/** A booking of the customer logged in by default, the one with a question of the shop open if any. */
const customerAppointmentId = (slug: string) => {
  const fixture = fixtureBySlug(slug);
  const asked = fixture?.appointments.find((a) =>
    fixture.staffTimeOff.some((l) => l.handling?.[a.id]?.kind === 'asked'),
  );
  const customerId = slug === 'pawpaw' ? 'paw-c-linh' : 'may-c-quyen';
  return (
    asked?.id ??
    fixture?.appointments.find((a) => a.customerId === customerId && a.status === 'confirmed')
      ?.id ??
    ''
  );
};

/** Screens that have a mock page, with the links that open them. Everything else is not built. */
const built: Record<string, ScreenLink[]> = {
  'MH-02': [{ label: 'Đăng ký cơ sở', href: () => '/mock/signup', platform: true }],
  'MH-07': [{ label: 'Khung ứng dụng', href: app('customers') }],
  'MH-08': [{ label: 'Khách hàng', href: app('customers') }],
  'MH-09': [
    { label: 'Hồ sơ nhân viên', href: (slug) => app(`settings/staff/${firstStaffId(slug)}`)(slug) },
  ],
  'MH-11': [{ label: 'Trang cơ sở', href: site('') }],
  'MH-12': [{ label: 'Đặt lịch', href: site('/book') }],
  'MH-13': [{ label: 'Chọn nhiều dịch vụ', href: site('/book') }],
  'MH-14': [{ label: 'Đặt nhóm', href: site('/book') }],
  'MH-15': [{ label: 'Trả cọc (đặt lịch có cọc, tới Xác nhận)', href: site('/book') }],
  'MH-16': [{ label: 'Đăng nhập', href: site('/login') }],
  'MH-17': [{ label: 'Lịch hẹn của tôi', href: site('/me') }],
  'MH-18': [
    {
      label: 'Chi tiết lịch hẹn',
      href: (slug) => site('/me/appointments/' + customerAppointmentId(slug))(slug),
    },
  ],
  'MH-19': [{ label: 'Bé của tôi', href: site('/me/subjects') }],
  'MH-20': [{ label: 'Gói và ví', href: site('/me/wallet') }],
  'MH-21': [{ label: 'Thông tin', href: site('/me/profile') }],
  'MH-23': [{ label: 'Các mẫu email', href: site('/emails') }],
  'MH-24': [
    { label: 'Theo nhân viên', href: app('calendar') },
    { label: 'Theo tài nguyên', href: app('calendar?view=resources') },
  ],
  'MH-25': [{ label: 'Hôm nay', href: app('today') }],
  'MH-26': [{ label: 'Tạo lịch hẹn', href: app('calendar?create=1') }],
  'MH-27': [{ label: 'Lịch, kéo thả', href: app('calendar') }],
  'MH-28': [
    { label: 'Chi tiết lịch hẹn', href: (slug) => app(`appointments/${checkedInId(slug)}`)(slug) },
  ],
  'MH-29': [{ label: 'Thu tiền', href: (slug) => app(`checkout/${checkedInId(slug)}`)(slug) }],
  'MH-30': [
    { label: 'Bán gói', href: app('sales/new?type=package') },
    { label: 'Nạp ví', href: app('sales/new?type=wallet') },
  ],
  'MH-31': [
    { label: 'Danh sách hóa đơn', href: app('invoices') },
    {
      label: 'Chi tiết hóa đơn',
      href: (slug) => app(`invoices/${firstInvoiceId(slug)}`)(slug),
    },
  ],
  'MH-32': [{ label: 'Khách hàng', href: app('customers') }],
  'MH-33': [
    {
      label: 'Hồ sơ khách',
      href: (slug) => app(`customers/${slug === 'pawpaw' ? 'paw-c-linh' : 'may-c-ha'}`)(slug),
    },
  ],
  'MH-34': [{ label: 'Hoàn tiền', href: app('refunds?role=manager') }],
  'MH-35': [{ label: 'Lịch của tôi', href: app('my/schedule?role=technician') }],
  'MH-36': [{ label: 'Xin nghỉ', href: app('my/time-off?role=technician') }],
  'MH-37': [{ label: 'Hoa hồng của tôi', href: app('my/commission?role=technician') }],
  'MH-38': [{ label: 'Xếp ca', href: app('shifts?role=manager') }],
  'MH-39': [{ label: 'Nghỉ phép', href: app('time-off?role=manager') }],
  'MH-40': [
    {
      label: 'Xử lý đơn nghỉ',
      href: (slug) => app(`time-off/${pendingLeaveId(slug)}?role=manager`)(slug),
    },
  ],
  'MH-44': [{ label: 'Dịch vụ', href: app('settings/services') }],
  'MH-45': [
    {
      label: 'Chi tiết dịch vụ',
      href: (slug) => app(`settings/services/${waitingServiceId(slug)}`)(slug),
    },
  ],
  'MH-47': [{ label: 'Nhân sự', href: app('settings/staff') }],
  'MH-41': [{ label: 'Tổng quan', href: app('?role=owner') }],
  'MH-42': [{ label: 'Chi nhánh', href: app('settings/branches') }],
  'MH-43': [
    {
      label: 'Chi tiết chi nhánh',
      href: (slug) => app(`settings/branches/${fixtureBySlug(slug)?.branches[0]?.id ?? ''}`)(slug),
    },
  ],
  'MH-46': [{ label: 'Tài nguyên', href: app('settings/resources') }],
  'MH-49': [{ label: 'Chính sách', href: app('settings/policies') }],
  'MH-50': [{ label: 'Thương hiệu', href: app('settings/branding') }],
  'MH-51': [{ label: 'Gói liệu trình', href: app('settings/packages') }],
  'MH-52': [{ label: 'Thanh toán', href: app('settings/payments') }],
  'MH-53': [{ label: 'Thông báo', href: app('settings/notifications') }],
  'MH-54': [{ label: 'Chatbot', href: app('settings/chatbot') }],
  'MH-55': [{ label: 'Báo cáo', href: app('reports?role=owner') }],
  'MH-56': [
    { label: 'Hoa hồng', href: app('commission?role=owner') },
    {
      label: 'Kỳ của một người',
      href: app('commission/periods/2026-11?role=owner&staff=' + 'may-mai'),
    },
  ],
  'MH-57': [{ label: 'Nhật ký thao tác', href: app('audit-log') }],
  'MH-59': [
    { label: 'Gói cấu hình ngành', href: () => '/mock/admin/templates', platform: true },
    {
      label: 'Spa thú cưng (bản nháp)',
      href: () => '/mock/admin/templates/pet_spa',
      platform: true,
    },
  ],
  'MH-61': [
    { label: 'Gói Sapio', href: app('settings/plan') },
    { label: 'Dùng thử', href: app('calendar?plan=trial') },
    { label: 'Tính năng bị khóa (gói Cơ bản)', href: app('settings/chatbot?plan=basic') },
    { label: 'Hết hạn', href: app('calendar?plan=expired') },
  ],
  'MH-48': [
    { label: 'Hồ sơ nhân viên', href: (slug) => app(`settings/staff/${firstStaffId(slug)}`)(slug) },
  ],
};

type Row = Omit<MockScreen, 'level' | 'zone'> & { level: string; zone: string };

/** Mirror of the table in content/docs/thiet-ke/man-hinh.md; status is set by `built`. */
const rows: Row[] = [
  {
    code: 'MH-01',
    title: 'Trang giới thiệu Sapio',
    zone: 'A',
    roles: ['public'],
    wave: 1,
    level: 'Nhẹ',
    routes: ['/'],
    note: 'Sapio là gì, ảnh lịch nhiều cột, nút "Đăng ký cơ sở"',
  },
  {
    code: 'MH-02',
    title: 'Đăng ký cơ sở',
    zone: 'A',
    roles: ['owner'],
    wave: 1,
    level: 'Vẽ',
    routes: ['/signup'],
    note: 'Tài khoản → mã xác thực email → chọn ngành → tên, slug, chi nhánh đầu tiên, giờ mở cửa → xem trước dịch vụ mẫu từ gói ngành rồi tạo. BR-70',
  },
  {
    code: 'MH-03',
    title: 'Đăng nhập',
    zone: 'A',
    roles: ['staff'],
    wave: 1,
    level: 'Nhẹ',
    routes: ['/login'],
    note: 'Email + mật khẩu; khóa tạm sau nhiều lần sai',
  },
  {
    code: 'MH-04',
    title: 'Quên và đặt lại mật khẩu',
    zone: 'A',
    roles: ['staff'],
    wave: 1,
    level: 'Nhẹ',
    routes: ['/forgot-password', '/reset-password'],
    note: '',
  },
  {
    code: 'MH-05',
    title: 'Nhận lời mời',
    zone: 'A',
    roles: ['receptionist', 'technician', 'manager'],
    wave: 1,
    level: 'Nhẹ',
    routes: ['/invite/[token]'],
    note: 'Thấy tên cơ sở, vai trò được mời; đặt mật khẩu hoặc nhận bằng tài khoản có sẵn',
  },
  {
    code: 'MH-06',
    title: 'Chọn cơ sở',
    zone: 'A',
    roles: ['staff'],
    wave: 1,
    level: 'Nhẹ',
    routes: ['/select-workspace'],
    note: 'Khi tài khoản thuộc nhiều cơ sở',
  },
  {
    code: 'MH-07',
    title: 'Khung ứng dụng',
    zone: 'B',
    roles: ['staff'],
    wave: 1,
    level: 'Vẽ',
    routes: [],
    note: 'Thanh bên theo vai trò, đổi chi nhánh, tìm nhanh khách, menu tài khoản, nút sáng/tối. Máy tính: thanh bên; iPad: thu gọn thành icon; điện thoại: thanh điều hướng dưới (như LeTanDienThoai)',
  },
  {
    code: 'MH-08',
    title: 'Mẫu trang danh sách',
    zone: 'B',
    roles: [],
    wave: 1,
    level: 'Vẽ',
    routes: [],
    note: 'Dùng cho mọi màn mức DS',
  },
  {
    code: 'MH-09',
    title: 'Mẫu trang form',
    zone: 'B',
    roles: [],
    wave: 1,
    level: 'Vẽ',
    routes: [],
    note: 'Dùng cho mọi màn mức Form; có thanh "Còn thay đổi chưa lưu"',
  },
  {
    code: 'MH-10',
    title: 'Trang lỗi và trạng thái',
    zone: 'B',
    roles: ['public'],
    wave: 1,
    level: 'Nhẹ',
    routes: [],
    note: '404, 403 "Không có quyền", lỗi máy chủ, cơ sở bị khóa (trang khách và nội bộ nói khác nhau), mất kết nối realtime',
  },
  {
    code: 'MH-11',
    title: 'Trang cơ sở',
    zone: 'C',
    roles: ['customer'],
    wave: 1,
    level: 'Vẽ',
    routes: ['/[tenant]'],
    note: 'Tên, ảnh, địa chỉ chi nhánh, giờ mở cửa, nhóm dịch vụ và giá, nhân viên (hồ sơ công khai, BR-15), chính sách hủy; nút "Đặt lịch"',
  },
  {
    code: 'MH-12',
    title: 'Luồng đặt lịch',
    zone: 'C',
    roles: ['customer'],
    wave: 1,
    level: 'Vẽ',
    routes: ['/[tenant]/book'],
    note: 'Đang làm (D-12, D-13, D-14). BR-03, BR-06, BR-07, BR-13, BR-14, BR-16, BR-17',
  },
  {
    code: 'MH-13',
    title: 'Đặt nhiều dịch vụ',
    zone: 'C',
    roles: ['customer'],
    wave: 1,
    level: 'Vẽ',
    routes: ['/[tenant]/book'],
    note: 'Thêm dịch vụ vào giỏ, thứ tự làm, cùng hay khác thợ; giờ trống tính cho cả chuỗi (BT1)',
  },
  {
    code: 'MH-14',
    title: 'Đặt nhóm',
    zone: 'C',
    roles: ['customer'],
    wave: 1,
    level: 'Vẽ',
    routes: ['/[tenant]/book'],
    note: 'Nhiều người hoặc nhiều bé cùng giờ, mỗi đối tượng một dịch vụ; không đủ chỗ thì gợi ý giờ lệch nhau',
  },
  {
    code: 'MH-15',
    title: 'Trả tiền cọc',
    zone: 'C',
    roles: ['customer'],
    wave: 2,
    level: 'Vẽ',
    routes: ['/[tenant]/book/pay'],
    note: 'QR của provider giả lập (D-09), đếm ngược giữ chỗ, kết quả thanh toán; trả xong mà giữ chỗ đã hết hạn (BR-07, BR-21)',
  },
  {
    code: 'MH-16',
    title: 'Đăng nhập khách',
    zone: 'C',
    roles: ['customer'],
    wave: 1,
    level: 'Nhẹ',
    routes: ['/[tenant]/login'],
    note: 'Email → mã 6 số (BR-16); phiên gắn với cơ sở',
  },
  {
    code: 'MH-17',
    title: 'Lịch của tôi',
    zone: 'C',
    roles: ['customer'],
    wave: 1,
    level: 'Nhẹ',
    routes: ['/[tenant]/me'],
    note: 'Sắp tới, đã qua; đặt lại lịch cũ',
  },
  {
    code: 'MH-18',
    title: 'Chi tiết lịch hẹn của khách',
    zone: 'C',
    roles: ['customer'],
    wave: 1,
    level: 'Vẽ',
    routes: ['/[tenant]/me/appointments/[id]'],
    note: 'Đổi giờ (BR-08: trước X giờ, tối đa N lần), hủy kèm mức hoàn cọc (BR-23); hết hạn tự đổi thì hiện số điện thoại cơ sở',
  },
  {
    code: 'MH-19',
    title: 'Đối tượng được phục vụ',
    zone: 'C',
    roles: ['customer'],
    wave: 1,
    level: 'Form',
    routes: ['/[tenant]/me/subjects'],
    note: 'Thuộc tính theo schema của ngành (BR-71). Ngành không có đối tượng khác thì không hiện mục này',
  },
  {
    code: 'MH-20',
    title: 'Gói và ví',
    zone: 'C',
    roles: ['customer'],
    wave: 2,
    level: 'Nhẹ',
    routes: ['/[tenant]/me/wallet'],
    note: 'Số buổi còn và hạn của gói; số dư tiền thật, tiền tặng; lịch sử',
  },
  {
    code: 'MH-21',
    title: 'Thông tin cá nhân',
    zone: 'C',
    roles: ['customer'],
    wave: 1,
    level: 'Form',
    routes: ['/[tenant]/me/profile'],
    note: 'Họ tên, số điện thoại, email; đồng ý nhận quảng cáo (BR-64)',
  },
  {
    code: 'MH-22',
    title: 'Khung chat đặt lịch',
    zone: 'C',
    roles: ['customer'],
    wave: 3,
    level: 'Vẽ',
    routes: [],
    note: 'BT7: hỏi giá, giờ; giữ chỗ rồi chuyển sang bước OTP; "Gặp lễ tân"',
  },
  {
    code: 'MH-23',
    title: 'Email gửi khách',
    zone: 'C',
    roles: ['customer'],
    wave: 1,
    level: 'Nhẹ',
    routes: ['/[tenant]/emails'],
    note: 'Mã OTP, xác nhận lịch, nhắc 24h và 2h, đã đổi, đã hủy, đã hoàn tiền',
  },
  {
    code: 'MH-24',
    title: 'Lịch',
    zone: 'D',
    roles: ['receptionist', 'manager', 'owner'],
    wave: 1,
    level: 'Vẽ',
    routes: ['/app/[tenant]/calendar'],
    note: 'Đang làm. Hai kiểu xem, bảng chi tiết (D-12)',
  },
  {
    code: 'MH-25',
    title: 'Hôm nay',
    zone: 'D',
    roles: ['receptionist'],
    wave: 1,
    level: 'Vẽ',
    routes: ['/app/[tenant]/today'],
    note: 'Đang làm. Đang làm, chờ thanh toán, sắp đến',
  },
  {
    code: 'MH-26',
    title: 'Tạo lịch hẹn',
    zone: 'D',
    roles: ['receptionist'],
    wave: 1,
    level: 'Vẽ',
    routes: ['/app/[tenant]/appointments/new'],
    note: 'Tìm hoặc tạo khách theo số điện thoại (BR-61), khách vãng lai, dịch vụ, thợ, giờ trống; bấm ô trống trên lịch thì điền sẵn giờ và cột',
  },
  {
    code: 'MH-27',
    title: 'Kéo thả đổi giờ, đổi người',
    zone: 'D',
    roles: ['receptionist'],
    wave: 1,
    level: 'Vẽ',
    routes: [],
    note: 'Kiểm ràng buộc khi đang kéo (ô không hợp lệ tô danger-soft), thả xong có Hoàn tác (D-14); lịch "bất kỳ ai" và lịch chọn đích danh xử lý khác nhau',
  },
  {
    code: 'MH-28',
    title: 'Chi tiết lịch hẹn',
    zone: 'D',
    roles: ['receptionist', 'technician'],
    wave: 1,
    level: 'Nhẹ',
    routes: ['/app/[tenant]/appointments/[id]'],
    note: 'Trang riêng cho điện thoại; nội dung như bảng chi tiết của MH-24',
  },
  {
    code: 'MH-29',
    title: 'Thu tiền',
    zone: 'D',
    roles: ['receptionist'],
    wave: 2,
    level: 'Vẽ',
    routes: ['/app/[tenant]/checkout/[appointmentId]'],
    note: 'Hóa đơn từ lịch hẹn, thêm bán lẻ, trừ cọc, trừ buổi gói, dùng ví, giảm giá (BR-22), nhiều phương thức, QR; bấm hai lần chỉ ghi một lần (BR-21)',
  },
  {
    code: 'MH-30',
    title: 'Bán gói, nạp ví',
    zone: 'D',
    roles: ['receptionist'],
    wave: 2,
    level: 'Form',
    routes: ['/app/[tenant]/sales/new'],
    note: 'Chọn khách, gói hoặc số tiền nạp, tiền tặng kèm; qua MH-29 để thu',
  },
  {
    code: 'MH-31',
    title: 'Hóa đơn',
    zone: 'D',
    roles: ['receptionist', 'owner'],
    wave: 2,
    level: 'DS',
    routes: ['/app/[tenant]/invoices', '/invoices/[id]'],
    note: 'Cột: số, giờ, khách, tổng, phương thức, trạng thái; chi tiết có in và "Yêu cầu hoàn tiền"',
  },
  {
    code: 'MH-32',
    title: 'Khách hàng',
    zone: 'D',
    roles: ['receptionist', 'owner'],
    wave: 1,
    level: 'DS',
    routes: ['/app/[tenant]/customers'],
    note: 'Tìm theo tên, số điện thoại chuẩn hóa; cột: lần đến gần nhất, số lần, số lần không đến',
  },
  {
    code: 'MH-33',
    title: 'Hồ sơ khách',
    zone: 'D',
    roles: ['receptionist', 'owner'],
    wave: 1,
    level: 'Vẽ',
    routes: ['/app/[tenant]/customers/[id]'],
    note: 'Lịch sử, ghi chú nội bộ (BR-62), đối tượng được phục vụ, gói, ví, bắt buộc cọc (BR-10)',
  },
  {
    code: 'MH-34',
    title: 'Hoàn tiền',
    zone: 'D',
    roles: ['receptionist', 'manager', 'owner'],
    wave: 2,
    level: 'DS',
    routes: ['/app/[tenant]/refunds'],
    note: 'Lý do bắt buộc, chờ duyệt (BR-28); duyệt thì thu hồi hoa hồng và hoàn buổi gói',
  },
  {
    code: 'MH-35',
    title: 'Lịch của tôi',
    zone: 'E',
    roles: ['technician'],
    wave: 1,
    level: 'Vẽ',
    routes: ['/app/[tenant]/my/schedule'],
    note: 'Chỉ lịch của mình, theo ngày và tuần; cập nhật trạng thái dịch vụ; ghi chú về khách (không thấy số điện thoại nếu cơ sở tắt)',
  },
  {
    code: 'MH-36',
    title: 'Xin nghỉ',
    zone: 'E',
    roles: ['technician'],
    wave: 1,
    level: 'Form',
    routes: ['/app/[tenant]/my/time-off'],
    note: 'Chọn ngày, cả ngày hay vài giờ, lý do; thấy trước số lịch bị ảnh hưởng',
  },
  {
    code: 'MH-37',
    title: 'Hoa hồng tạm tính',
    zone: 'E',
    roles: ['technician'],
    wave: 3,
    level: 'Nhẹ',
    routes: ['/app/[tenant]/my/commission'],
    note: 'Kỳ đang mở, từng dịch vụ, khoản bị thu hồi',
  },
  {
    code: 'MH-38',
    title: 'Xếp ca',
    zone: 'F',
    roles: ['manager', 'owner'],
    wave: 1,
    level: 'Vẽ',
    routes: ['/app/[tenant]/shifts'],
    note: 'Lưới tuần × nhân viên, nhiều khung mỗi ngày, chép tuần trước; bớt ca mà còn lịch thì cảnh báo',
  },
  {
    code: 'MH-39',
    title: 'Đơn nghỉ phép',
    zone: 'F',
    roles: ['manager', 'owner'],
    wave: 1,
    level: 'DS',
    routes: ['/app/[tenant]/time-off'],
    note: 'Cột: nhân viên, thời gian, số lịch bị ảnh hưởng, trạng thái',
  },
  {
    code: 'MH-40',
    title: 'Xử lý lịch bị ảnh hưởng',
    zone: 'F',
    roles: ['manager', 'owner'],
    wave: 1,
    level: 'Vẽ',
    routes: ['/app/[tenant]/time-off/[id]'],
    note: 'BR-11: từng lịch bị ảnh hưởng, gợi ý người thay còn trống, khách chọn đích danh thì gửi hỏi ý; chỉ duyệt được khi mọi lịch đã xử lý',
  },
  {
    code: 'MH-41',
    title: 'Tổng quan',
    zone: 'G',
    roles: ['owner', 'manager'],
    wave: 3,
    level: 'Vẽ',
    routes: ['/app/[tenant]'],
    note: 'Hôm nay: số lịch, đang làm, doanh thu; tuần: lấp đầy, không đến; việc cần xử lý (nghỉ phép, hoàn tiền chờ duyệt)',
  },
  {
    code: 'MH-42',
    title: 'Chi nhánh',
    zone: 'G',
    roles: ['owner'],
    wave: 1,
    level: 'DS',
    routes: ['/app/[tenant]/settings/branches'],
    note: '',
  },
  {
    code: 'MH-43',
    title: 'Chi tiết chi nhánh',
    zone: 'G',
    roles: ['owner'],
    wave: 1,
    level: 'Vẽ',
    routes: ['/app/[tenant]/settings/branches/[id]'],
    note: 'Giờ mở cửa nhiều khung mỗi ngày, ngày đặc biệt (BR-02), giá riêng của chi nhánh',
  },
  {
    code: 'MH-44',
    title: 'Dịch vụ',
    zone: 'G',
    roles: ['owner'],
    wave: 1,
    level: 'DS',
    routes: ['/app/[tenant]/settings/services'],
    note: 'Nhóm dịch vụ, kéo đổi thứ tự, bật/tắt đặt online',
  },
  {
    code: 'MH-45',
    title: 'Chi tiết dịch vụ',
    zone: 'G',
    roles: ['owner'],
    wave: 1,
    level: 'Vẽ',
    routes: ['/app/[tenant]/settings/services/[id]'],
    note: 'Màn đặc trưng thứ hai. Biến thể theo thuộc tính đối tượng (BR-13); các đoạn chiếm dụng vẽ trên trục thời gian, mỗi đoạn chọn loại tài nguyên (BR-04, BR-05); kỹ năng (BR-03); giá theo cấp nhân viên; xem trước khối lịch hẹn như trên lịch lễ tân',
  },
  {
    code: 'MH-46',
    title: 'Tài nguyên',
    zone: 'G',
    roles: ['owner'],
    wave: 1,
    level: 'DS',
    routes: ['/app/[tenant]/settings/resources'],
    note: 'Nhóm theo loại (từ gói ngành), chi nhánh, tạm ngưng bảo trì kèm số lịch bị ảnh hưởng',
  },
  {
    code: 'MH-47',
    title: 'Nhân sự',
    zone: 'G',
    roles: ['owner'],
    wave: 1,
    level: 'DS',
    routes: ['/app/[tenant]/settings/staff'],
    note: 'Mời, vai trò, chi nhánh, nhận đặt online',
  },
  {
    code: 'MH-48',
    title: 'Hồ sơ nhân viên',
    zone: 'G',
    roles: ['owner'],
    wave: 1,
    level: 'Form',
    routes: ['/app/[tenant]/settings/staff/[id]'],
    note: 'Hai lớp hồ sơ (BR-15), kỹ năng, cấp, chi nhánh, vai trò',
  },
  {
    code: 'MH-49',
    title: 'Chính sách',
    zone: 'G',
    roles: ['owner'],
    wave: 1,
    level: 'Form',
    routes: ['/app/[tenant]/settings/policies'],
    note: 'Tham số X, Y, N, M, K của BR-06 đến BR-10; mức hoàn cọc (BR-23); mỗi trường có câu giải thích bằng ví dụ',
  },
  {
    code: 'MH-50',
    title: 'Thương hiệu và trang đặt lịch',
    zone: 'G',
    roles: ['owner'],
    wave: 1,
    level: 'Form',
    routes: ['/app/[tenant]/settings/branding'],
    note: 'Logo, ảnh bìa, màu nhấn (kiểm tương phản 4.5:1 như token tenant-*), slug, xem trước MH-11',
  },
  {
    code: 'MH-51',
    title: 'Gói liệu trình',
    zone: 'G',
    roles: ['owner'],
    wave: 2,
    level: 'Form',
    routes: ['/app/[tenant]/settings/packages'],
    note: 'Số buổi, dịch vụ áp dụng, giá, hạn dùng',
  },
  {
    code: 'MH-52',
    title: 'Thanh toán',
    zone: 'G',
    roles: ['owner'],
    wave: 2,
    level: 'Nhẹ',
    routes: ['/app/[tenant]/settings/payments'],
    note: 'Provider giả lập (D-09), phương thức nhận tại quầy',
  },
  {
    code: 'MH-53',
    title: 'Thông báo',
    zone: 'G',
    roles: ['owner'],
    wave: 3,
    level: 'Form',
    routes: ['/app/[tenant]/settings/notifications'],
    note: 'Bật/tắt nhắc 24h, 2h; xem trước email',
  },
  {
    code: 'MH-54',
    title: 'Chatbot',
    zone: 'G',
    roles: ['owner'],
    wave: 3,
    level: 'Form',
    routes: ['/app/[tenant]/settings/chatbot'],
    note: 'Bật/tắt, lời chào, giới hạn lượt',
  },
  {
    code: 'MH-55',
    title: 'Báo cáo',
    zone: 'G',
    roles: ['owner', 'manager'],
    wave: 3,
    level: 'Vẽ',
    routes: ['/app/[tenant]/reports'],
    note: 'Doanh thu, tiền trả trước và doanh thu thực hiện, lấp đầy, không đến; lọc chi nhánh và khoảng ngày',
  },
  {
    code: 'MH-56',
    title: 'Hoa hồng',
    zone: 'G',
    roles: ['owner'],
    wave: 3,
    level: 'Vẽ',
    routes: ['/app/[tenant]/commission', '/commission/periods/[id]'],
    note: 'Quy tắc có ngày hiệu lực (BR-41), chốt kỳ, khoản thu hồi vào kỳ của ngày duyệt hoàn (BR-42)',
  },
  {
    code: 'MH-57',
    title: 'Nhật ký thao tác',
    zone: 'G',
    roles: ['owner'],
    wave: 3,
    level: 'DS',
    routes: ['/app/[tenant]/audit-log'],
    note: 'BR-63; cột: giờ, người, thao tác, đối tượng',
  },
  {
    code: 'MH-58',
    title: 'Khách thuê',
    zone: 'H',
    roles: ['admin'],
    wave: 1,
    level: 'DS',
    routes: ['/admin/tenants', '/admin/tenants/[id]'],
    note: 'Duyệt, khóa, mở khóa; chi tiết chỉ có số liệu tổng (số chi nhánh, số lịch tháng), không xem dữ liệu khách của cơ sở',
  },
  {
    code: 'MH-59',
    title: 'Gói cấu hình ngành',
    zone: 'H',
    roles: ['admin'],
    wave: 1,
    level: 'Vẽ',
    routes: ['/admin/templates', '/admin/templates/[id]'],
    note: 'Màn chứng minh BT8. Loại tài nguyên, dịch vụ mẫu có đoạn chiếm dụng, từ ngữ hiển thị (thợ/groomer, khách/bé), schema đối tượng được phục vụ, chính sách mặc định; sửa gói không ảnh hưởng cơ sở đã tạo (BR-70)',
  },
  {
    code: 'MH-60',
    title: 'Tổng quan nền tảng',
    zone: 'H',
    roles: ['admin'],
    wave: 3,
    level: 'Nhẹ',
    routes: ['/admin'],
    note: 'Số cơ sở theo ngành, số lịch đặt, cơ sở mới',
  },
  {
    code: 'MH-61',
    title: 'Gói Sapio',
    zone: 'G',
    roles: ['owner'],
    wave: 2,
    level: 'Vẽ',
    routes: ['/app/[tenant]/settings/plan'],
    note: 'Trạng thái gói, hai thẻ gói, chọn kỳ 1/3/12 tháng, thanh toán QR, lịch sử thanh toán (BR-83, BR-84). Hết hạn: mọi route khu nội bộ chuyển về đây, kèm bảng lịch đã đặt sau hạn chỉ để đọc (BR-82). Trang của tính năng bị khóa có bảng tiền nâng gói (BR-85, BR-87)',
  },
  {
    code: 'MH-62',
    title: 'Gói và giá',
    zone: 'H',
    roles: ['admin'],
    wave: 2,
    level: 'Form',
    routes: ['/admin/plans'],
    note: 'Giá tháng, tính năng và giới hạn của từng gói (BR-83); mức giảm theo kỳ; đổi giá không ảnh hưởng kỳ đã trả',
  },
];

/** Screens to agree on with the supervisor. Set `approved` here once one is signed off. */
export const mockScreens: (MockScreen & { status: ScreenStatus; links: ScreenLink[] })[] = (
  rows as MockScreen[]
).map((row) => ({
  ...row,
  status: built[row.code] ? 'in_progress' : 'todo',
  links: built[row.code] ?? [],
}));

const segments = (path: string) => path.split('/').filter(Boolean);

/** The screen a path inside `/app/[tenant]` belongs to, matching `[id]` against any segment. */
export function screenForAppPath(rest: string[]): (typeof mockScreens)[number] | undefined {
  return mockScreens.find((screen) =>
    screen.routes.some((route) => {
      const want = segments(route).slice(2);
      return (
        segments(route)[0] === 'app' &&
        want.length === rest.length &&
        want.every((part, i) => part.startsWith('[') || part === rest[i])
      );
    }),
  );
}

/** The screen a path inside `/admin` belongs to, matching `[id]` against any segment. */
export function screenForAdminPath(rest: string[]): (typeof mockScreens)[number] | undefined {
  return mockScreens.find((screen) =>
    screen.routes.some((route) => {
      const want = segments(route).slice(1);
      return (
        segments(route)[0] === 'admin' &&
        want.length === rest.length &&
        want.every((part, i) => part.startsWith('[') || part === rest[i])
      );
    }),
  );
}
