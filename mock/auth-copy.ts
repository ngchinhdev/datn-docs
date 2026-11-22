/*
 * Text of the account pages, Vietnamese and English. The block on the left of those pages is
 * `aside`; the rest is added per page.
 */
export type AuthLang = 'vi' | 'en';

export type AsideVariant = 'login' | 'signup' | 'forgot' | 'workspace' | 'admin';

interface AsideText {
  kicker: string;
  title: string;
  lead: string;
}

interface AsideCopy {
  variants: Record<AsideVariant, AsideText>;
  card: {
    today: string;
    date: string;
    col1: string;
    col2: string;
    appt1: string;
    confirmed: string;
    wait: string;
    appt1b: string;
    appt2: string;
    checkedIn: string;
    holding: string;
    newBooking: string;
    newBookingMeta: string;
  };
  chips: string[];
}

export interface AuthCopy {
  aside: AsideCopy;
}

export const AUTH_COPY: Record<AuthLang, AuthCopy> = {
  vi: {
    aside: {
      variants: {
        login: {
          kicker: 'Dành cho salon tóc và spa',
          title: 'Lịch hẹn của tiệm, gọn trong một màn hình',
          lead: 'Xếp thợ, ghế, giường và phòng cùng lúc. Khách tự đặt trên trang của tiệm, bạn chỉ việc đón.',
        },
        signup: {
          kicker: 'Dùng thử 7 ngày',
          title: 'Mở trang đặt lịch cho tiệm ngay hôm nay',
          lead: 'Tạo tài khoản, xác minh email, nhập thông tin cơ sở. Hết 7 ngày dùng thử mới cần chọn gói.',
        },
        forgot: {
          kicker: 'Bảo vệ tài khoản',
          title: 'Lấy lại quyền vào tiệm',
          lead: 'Link đặt lại gửi về email đăng nhập và chỉ dùng được một lần.',
        },
        workspace: {
          kicker: 'Một tài khoản, nhiều cơ sở',
          title: 'Hôm nay bạn làm ở tiệm nào?',
          lead: 'Mỗi cơ sở có lịch, nhân viên và quyền riêng. Mở mỗi cơ sở ở một tab cũng được.',
        },
        admin: {
          kicker: 'Quản trị nền tảng',
          title: 'Vận hành Sapio',
          lead: 'Theo dõi cơ sở, gói và nhật ký trên toàn nền tảng. Chỉ dành cho tài khoản quản trị.',
        },
      },
      card: {
        today: 'Hôm nay',
        date: 'Thứ Bảy, 21/11',
        col1: 'Ghế 2 · Thợ Lan',
        col2: 'Giường 1 · KTV Vy',
        appt1: 'Chị Hạnh · Nhuộm',
        confirmed: 'Đã xác nhận',
        wait: 'Chờ lên màu',
        appt1b: 'Xả, sấy',
        appt2: 'Anh Minh · Đá nóng',
        checkedIn: 'Đã check-in',
        holding: 'Đang giữ chỗ',
        newBooking: 'Lịch mới',
        newBookingMeta: 'Chị Ngọc · Cắt + gội, 14:00 hôm nay',
      },
      chips: ['Lịch hẹn', 'Liệu trình', 'Nhân viên', 'Hoa hồng', 'Thanh toán'],
    },
  },
  en: {
    aside: {
      variants: {
        login: {
          kicker: 'For hair salons and spas',
          title: 'Your salon’s day, on one screen',
          lead: 'Schedule staff, chairs, beds and rooms together. Clients book on your page, you just welcome them.',
        },
        signup: {
          kicker: '7-day free trial',
          title: 'Open your booking page today',
          lead: 'Create an account, verify your email, add your business. Pick a plan only after the 7-day trial.',
        },
        forgot: {
          kicker: 'Account security',
          title: 'Get back into your salon',
          lead: 'The reset link goes to your sign-in email and works only once.',
        },
        workspace: {
          kicker: 'One account, many businesses',
          title: 'Where are you working today?',
          lead: 'Each business has its own calendar, staff and permissions. Open each one in its own tab if you like.',
        },
        admin: {
          kicker: 'Platform administration',
          title: 'Run Sapio',
          lead: 'Monitor businesses, plans and logs across the platform. For administrator accounts only.',
        },
      },
      card: {
        today: 'Today',
        date: 'Sat, 21 Nov',
        col1: 'Chair 2 · Lan',
        col2: 'Bed 1 · Vy',
        appt1: 'Ms. Hanh · Colour',
        confirmed: 'Confirmed',
        wait: 'Processing',
        appt1b: 'Rinse, dry',
        appt2: 'Mr. Minh · Hot stone',
        checkedIn: 'Checked in',
        holding: 'Holding',
        newBooking: 'New booking',
        newBookingMeta: 'Ms. Ngoc · Cut + wash, 14:00 today',
      },
      chips: ['Appointments', 'Packages', 'Staff', 'Commission', 'Payments'],
    },
  },
};
