/*
 * Text of the app frame (`AppShell`) in Vietnamese and English: menu, breadcrumb, switcher,
 * account card, tool buttons. Page content, the crumbs a page sends and proper names stay as
 * they are. Menu items are looked up by `id`, groups and roles by their Vietnamese name.
 */
import type { AuthLang } from '@/mock/auth-copy';

const vi = {
  navLabel: 'Điều hướng chính',
  crumbLabel: 'Vị trí',
  switcherLabel: 'Đổi cơ sở hoặc chi nhánh',
  branchesOf: (name: string) => `Chi nhánh của ${name}`,
  otherWorkspaces: 'Cơ sở khác của bạn',
  newWorkspace: 'Đăng ký cơ sở mới',
  accountMenu: 'Tài khoản',
  accountMenuSuffix: ', menu tài khoản',
  profile: 'Hồ sơ',
  signOut: 'Đăng xuất',
  langLabel: (lang: AuthLang) =>
    `Đổi ngôn ngữ, đang dùng ${lang === 'vi' ? 'tiếng Việt' : 'English'}`,
  themeToLight: 'Chuyển sang giao diện sáng',
  themeToDark: 'Chuyển sang giao diện tối',
  expandSide: 'Mở rộng thanh bên',
  collapseSide: 'Thu gọn thanh bên',
  more: 'Thêm',
  otherItems: 'Các mục khác',
  pendingWord: 'việc chờ',
  pending: (n: number) => `${n} việc chờ`,
  needsUpgrade: 'cần nâng gói',
  items: {} as Record<string, string>,
  tabItems: {} as Record<string, string>,
  terms: {} as Record<string, string>,
};

export type ShellCopy = typeof vi;

const en: ShellCopy = {
  navLabel: 'Main navigation',
  crumbLabel: 'Breadcrumb',
  switcherLabel: 'Switch business or branch',
  branchesOf: (name) => `Branches of ${name}`,
  otherWorkspaces: 'Your other businesses',
  newWorkspace: 'Register a new business',
  accountMenu: 'Account',
  accountMenuSuffix: ', account menu',
  profile: 'Profile',
  signOut: 'Sign out',
  langLabel: (lang) => `Change language, currently ${lang === 'vi' ? 'Vietnamese' : 'English'}`,
  themeToLight: 'Switch to the light theme',
  themeToDark: 'Switch to the dark theme',
  expandSide: 'Expand sidebar',
  collapseSide: 'Collapse sidebar',
  more: 'More',
  otherItems: 'Other items',
  pendingWord: 'pending',
  pending: (n) => `${n} pending`,
  needsUpgrade: 'plan upgrade needed',
  items: {
    overview: 'Overview',
    today: 'Today',
    calendar: 'Calendar',
    customers: 'Clients',
    invoices: 'Invoices',
    refunds: 'Refunds',
    shifts: 'Shifts',
    'time-off': 'Time off',
    staff: 'Team',
    reports: 'Reports',
    commission: 'Commission',
    settings: 'Settings',
    'my-schedule': 'My schedule',
    'my-time-off': 'Request leave',
    'my-commission': 'Commission',
    tenants: 'Tenants',
    plans: 'Plans and pricing',
    'audit-log': 'Audit log',
  },
  tabItems: { customers: 'Clients', 'my-commission': 'Commission' },
  terms: {
    'Vận hành': 'Operations',
    'Nhân sự': 'Staff',
    'Kinh doanh': 'Business',
    'Cơ sở': 'Workspace',
    'Chủ cơ sở': 'Owner',
    'Quản lý': 'Manager',
    'Lễ tân': 'Receptionist',
    'Kỹ thuật viên': 'Technician',
    'Quản trị nền tảng': 'Platform admin',
    'Quản trị Sapio': 'Sapio admin',
    Thêm: 'More',
    'Tài khoản': 'Account',
  },
};

// Vietnamese is the language of the data: nothing to look up.
export const SHELL_COPY: Record<AuthLang, ShellCopy> = { vi, en };

/** Label of a menu item in the language of the frame; `short` asks for the tab bar form. */
export function itemText(copy: ShellCopy, id: string, label: string, short = false): string {
  return (short ? copy.tabItems[id] : undefined) ?? copy.items[id] ?? label;
}

/** Group, role and other fixed names, looked up by their Vietnamese text. */
export function termText(copy: ShellCopy, term: string): string {
  return copy.terms[term] ?? term;
}
