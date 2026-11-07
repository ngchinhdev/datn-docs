import {
  CalendarDays,
  CalendarX,
  ChartColumn,
  Clock,
  LayoutDashboard,
  ListChecks,
  Percent,
  Receipt,
  SlidersHorizontal,
  Undo2,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { StaffRole } from '@/mock/selection';

export interface NavEntry {
  id: string;
  label: string;
  /** Path under `/mock/app/[tenant]`. */
  path: string;
  icon: LucideIcon;
  /** Shorter label for the phone tab bar. */
  tabLabel?: string;
  group?: string;
  /** Mock count of pending work. */
  badge?: number;
}

const overview: NavEntry = { id: 'overview', label: 'Tổng quan', path: '', icon: LayoutDashboard };
const today: NavEntry = { id: 'today', label: 'Hôm nay', path: 'today', icon: ListChecks };
const calendar: NavEntry = { id: 'calendar', label: 'Lịch', path: 'calendar', icon: CalendarDays };
const customers: NavEntry = {
  id: 'customers',
  label: 'Khách hàng',
  tabLabel: 'Khách',
  path: 'customers',
  icon: Users,
};
const invoices: NavEntry = { id: 'invoices', label: 'Hóa đơn', path: 'invoices', icon: Receipt };
const refunds: NavEntry = {
  id: 'refunds',
  label: 'Hoàn tiền',
  path: 'refunds',
  icon: Undo2,
  badge: 1,
};
const shifts: NavEntry = {
  id: 'shifts',
  label: 'Xếp ca',
  path: 'shifts',
  icon: Clock,
  group: 'Nhân sự',
};
const timeOff: NavEntry = {
  id: 'time-off',
  label: 'Nghỉ phép',
  path: 'time-off',
  icon: CalendarX,
  group: 'Nhân sự',
  badge: 2,
};
const reports: NavEntry = {
  id: 'reports',
  label: 'Báo cáo',
  path: 'reports',
  icon: ChartColumn,
  group: 'Kinh doanh',
};
const commission: NavEntry = {
  id: 'commission',
  label: 'Hoa hồng',
  path: 'commission',
  icon: Percent,
  group: 'Kinh doanh',
};
const settings: NavEntry = {
  id: 'settings',
  label: 'Cài đặt',
  path: 'settings',
  icon: SlidersHorizontal,
  group: 'Cơ sở',
};

const reception = [today, calendar, customers, invoices, refunds];
const management = [...reception, shifts, timeOff, reports];

/** What each role sees in the sidebar (AppShell README). */
export const navByRole: Record<StaffRole, NavEntry[]> = {
  receptionist: reception,
  technician: [
    { id: 'my-schedule', label: 'Lịch của tôi', path: 'my/schedule', icon: CalendarDays },
    { id: 'my-time-off', label: 'Xin nghỉ', path: 'my/time-off', icon: CalendarX },
    { id: 'my-commission', label: 'Hoa hồng', path: 'my/commission', icon: Percent },
  ],
  manager: management,
  owner: [overview, ...management, commission, settings],
};

/** The first three entries on the phone tab bar; "Thêm" holds the rest. */
export function tabIds(role: StaffRole): string[] {
  if (role === 'technician') return ['my-schedule', 'my-time-off', 'my-commission'];
  return ['today', 'calendar', 'customers'];
}
