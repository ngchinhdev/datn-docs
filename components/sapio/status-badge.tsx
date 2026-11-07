import type { AppointmentStatus } from '@/mock/fixtures';

export const statusLabel: Record<AppointmentStatus, string> = {
  held: 'Đang giữ chỗ',
  confirmed: 'Đã xác nhận',
  checked_in: 'Đã check-in',
  completed: 'Hoàn thành',
  no_show: 'Không đến',
  cancelled: 'Đã hủy',
};

/** CSS modifier shared by `.sp-badge--*` and `.sp-appt--*`. */
export const statusModifier: Record<AppointmentStatus, string> = {
  held: 'hold',
  confirmed: 'confirmed',
  checked_in: 'checked-in',
  completed: 'completed',
  no_show: 'no-show',
  cancelled: 'cancelled',
};

export function StatusBadge({ status, label }: { status: AppointmentStatus; label?: string }) {
  return (
    <span className={`sp-badge sp-badge--${statusModifier[status]}`}>
      {label ?? statusLabel[status]}
    </span>
  );
}
