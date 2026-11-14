/*
 * What Tổng quan (MH-41) lists: the work waiting for a person to decide, and what is happening
 * now. Pure; imports types and pure modules only, so Node can run it (scripts/check-reports.ts).
 */
import { closeReminderDue } from './commission.ts';
import type { Appointment, MoneyState, Requeue, StaffTimeOff } from './fixtures/types.ts';
import { formatVnd } from './format.ts';
import { affectedByLeave, windowText } from './leave.ts';
import { addDays, formatDay, localDate } from './time.ts';

/** The colour of the badge on a row, as the `sp-badge--*` modifiers name it. */
export type TodoBadge = 'pending' | 'no-show' | 'hold';

export interface TodoItem {
  id: string;
  title: string;
  sub: string;
  badge: { tone: TodoBadge; label: string };
  /** Path under `/mock/app/[tenant]`. */
  href: string;
}

/** `Thứ Ba 10/11`. */
const dayText = (date: string) => formatDay(date).replace(',', '');

/** `hôm nay`, `hôm qua`, or `05/11`. */
function sinceText(iso: string, today: string) {
  const day = localDate(iso);
  if (day === today) return 'hôm nay';
  if (day === addDays(today, -1)) return 'hôm qua';
  return `${day.slice(8, 10)}/${day.slice(5, 7)}`;
}

/**
 * The rows of "Việc cần xử lý": leave waiting for a decision, refunds waiting, appointments that
 * lost their person, hour or resource, and (for the owner) a commission period over for 7 days
 * and still open (BR-42).
 */
export function todoItems(args: {
  leaves: readonly StaffTimeOff[];
  requeues: readonly Requeue[];
  money: MoneyState;
  appointments: readonly Appointment[];
  nameOf: (resourceId: string) => string;
  today: string;
  /** The owner sees the commission reminder, and only on a plan that has commission (BR-87). */
  showCommission: boolean;
}): TodoItem[] {
  const { leaves, requeues, money, appointments, nameOf, today } = args;
  const out: TodoItem[] = [];

  for (const leave of leaves
    .filter((l) => l.status === 'pending')
    .sort((a, b) => a.date.localeCompare(b.date))) {
    const affected = affectedByLeave(appointments, leave).length;
    const handled = Object.keys(leave.handling ?? {}).length;
    const window = leave.from && leave.to ? `, ${windowText(leave)}` : '';
    out.push({
      id: `leave-${leave.id}`,
      title: `${nameOf(leave.resourceId)} xin nghỉ ${dayText(leave.date)}${window}`,
      sub:
        affected === 0
          ? 'Không ảnh hưởng lịch nào'
          : `${affected} lịch bị ảnh hưởng${handled > 0 ? `, ${handled} đã xử lý` : ''}`,
      badge: { tone: 'pending', label: 'Chờ duyệt' },
      href: `time-off/${leave.id}`,
    });
  }

  for (const refund of money.refunds.filter((r) => r.status === 'pending')) {
    out.push({
      id: `refund-${refund.id}`,
      title: `Hoàn ${formatVnd(refund.amountVnd)} cho ${refund.who}`,
      sub: `${refund.what.split(' · ')[0]} · ${refund.createdBy} tạo ${sinceText(refund.createdAt, today)}`,
      badge: { tone: 'pending', label: 'Chờ duyệt' },
      href: 'refunds',
    });
  }

  for (const requeue of requeues.filter((r) => r.appointmentIds.length > 0)) {
    out.push({
      id: `requeue-${requeue.id}`,
      title: `${requeue.appointmentIds.length} lịch cần xếp lại`,
      sub: `${requeue.label ?? nameOf(requeue.resourceId)} · ${requeue.reason}`,
      badge: { tone: 'no-show', label: 'Cần xử lý' },
      href: `time-off/${requeue.id}`,
    });
  }

  if (args.showCommission) {
    for (const period of money.periods.filter((p) => closeReminderDue(p, today))) {
      out.push({
        id: `period-${period.id}`,
        title: `Kỳ hoa hồng ${period.label} chưa chốt`,
        sub: 'Kỳ đã hết 7 ngày',
        badge: { tone: 'hold', label: 'Nhắc' },
        href: 'commission',
      });
    }
  }
  return out;
}

/** What today's appointments add up to, in the words of the first tile: `3 xong, 2 đang làm, 1 giữ chỗ`. */
export function todaySummary(appointments: readonly Appointment[], today: string) {
  const mine = appointments.filter(
    (a) => localDate(a.startAt) === today && a.status !== 'cancelled',
  );
  const count = (status: Appointment['status']) => mine.filter((a) => a.status === status).length;
  const parts = [
    [count('completed'), 'xong'],
    [count('checked_in'), 'đang làm'],
    [count('held'), 'giữ chỗ'],
  ] as const;
  return {
    total: mine.length,
    text: parts
      .filter(([n]) => n > 0)
      .map(([n, label]) => `${n} ${label}`)
      .join(', '),
  };
}

/** Today's appointments still to come or under way, the next ones first. */
export function happeningNow(
  appointments: readonly Appointment[],
  args: { now: string; today: string; endOf: (appt: Appointment) => string; limit: number },
): Appointment[] {
  return appointments
    .filter(
      (a) =>
        localDate(a.startAt) === args.today &&
        (a.status === 'confirmed' || a.status === 'checked_in' || a.status === 'held') &&
        args.endOf(a) > args.now,
    )
    .sort((a, b) => a.startAt.localeCompare(b.startAt))
    .slice(0, args.limit);
}
