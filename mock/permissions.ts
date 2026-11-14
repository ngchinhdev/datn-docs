/*
 * Which pages of `/app/[tenant]` a role may open (BR-79). One function for the menu and for the
 * page, so a link that shows is a page that opens. Pure.
 */
import type { StaffRoleId } from './fixtures/types.ts';

const DESK = [
  'today',
  'calendar',
  'customers',
  'invoices',
  'refunds',
  'appointments',
  'checkout',
  'sales',
];
const KNOWN = [
  ...DESK,
  '',
  'shifts',
  'time-off',
  'reports',
  'commission',
  'settings',
  'audit-log',
  'my',
];

/** The pages are named by their first segment under the tenant; `''` is Tổng quan. */
export function canOpenPage(role: StaffRoleId, path: readonly string[]): boolean {
  const [first = '', second] = path;
  // A page the mock has no screen for yet shows the placeholder to anyone.
  if (!KNOWN.includes(first)) return true;
  switch (role) {
    case 'owner':
      return true;
    case 'manager':
      if (first === 'settings') return second === 'staff' && path.length === 2;
      if (first === 'my') return second === 'commission';
      return first !== 'commission' && first !== 'audit-log';
    case 'receptionist':
      return DESK.includes(first);
    case 'technician':
      return first === 'my' || first === 'appointments';
  }
}

const TITLE: Record<string, string> = {
  '': 'Tổng quan',
  today: 'Hôm nay',
  calendar: 'Lịch',
  customers: 'Khách hàng',
  invoices: 'Hóa đơn',
  refunds: 'Hoàn tiền',
  shifts: 'Xếp ca',
  'time-off': 'Nghỉ phép',
  reports: 'Báo cáo',
  commission: 'Hoa hồng',
  settings: 'Cài đặt',
  'audit-log': 'Nhật ký thao tác',
  my: 'trang này',
};

/** What the 403 page calls the page: "Báo cáo", or "trang này" when there is no name. */
export const pageTitle = (path: readonly string[]) => TITLE[path[0] ?? ''] ?? 'trang này';

/** The first page of a role, for the way out of a 403 or a 404. */
export function homeOf(role: StaffRoleId): { path: string; label: string } {
  if (role === 'technician') return { path: 'my/schedule', label: 'Lịch của tôi' };
  if (role === 'owner') return { path: '', label: 'Tổng quan' };
  return { path: 'today', label: 'Hôm nay' };
}
