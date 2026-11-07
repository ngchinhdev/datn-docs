'use client';

import { CalendarDays, Ellipsis, Users, Wallet, X } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Button } from '@/components/sapio/button';
import { StatusBadge, statusLabel } from '@/components/sapio/status-badge';
import { cn } from '@/lib/utils';
import type { Appointment, TenantFixture } from '@/mock/fixtures';
import { formatPhone, formatVnd } from '@/mock/format';
import { appointmentDetail, lookups } from '@/mock/reception';
import { formatTime } from '@/mock/time';

export function Toast({ message }: { message: string | null }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex justify-center px-(--space-4) md:bottom-6"
    >
      {message && (
        <span className="body-sm rounded-(--radius-md) bg-(--surface-raised) px-(--space-4) py-(--space-3) shadow-(--shadow-popover)">
          {message}
        </span>
      )}
    </div>
  );
}

/** Nhân viên / Tài nguyên tabs; two routes, query string kept. */
export function ViewTabs({ view, query }: { view: 'staff' | 'resource'; query: string }) {
  const tab = (active: boolean) =>
    cn(
      'sp-btn sp-btn--sm no-underline',
      active ? 'bg-(--surface-raised) text-(--ink) shadow-(--shadow-xs)' : 'sp-btn--ghost',
    );
  return (
    <nav
      aria-label="Kiểu xem"
      className="flex gap-0.5 rounded-(--radius-sm) bg-(--fill-tonal) p-[3px]"
    >
      <Link
        href={`/mock/le-tan${query}`}
        aria-current={view === 'staff' ? 'page' : undefined}
        className={tab(view === 'staff')}
      >
        Nhân viên
      </Link>
      <Link
        href={`/mock/le-tan/tai-nguyen${query}`}
        aria-current={view === 'resource' ? 'page' : undefined}
        className={tab(view === 'resource')}
      >
        Tài nguyên
      </Link>
    </nav>
  );
}

export function PhoneNav({ notify }: { notify: (m: string) => void }) {
  const items: [string, ReactNode][] = [
    ['Khách', <Users key="k" size={20} aria-hidden="true" />],
    ['Thu chi', <Wallet key="t" size={20} aria-hidden="true" />],
    ['Thêm', <Ellipsis key="m" size={20} aria-hidden="true" />],
  ];
  const cls =
    'label flex min-h-13 flex-col items-center justify-center gap-0.5 border-0 bg-transparent';
  return (
    <nav
      aria-label="Điều hướng chính"
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 bg-(--surface-raised) shadow-[0_-1px_0_var(--line)] md:hidden"
    >
      <span aria-current="page" className={cn(cls, 'text-(--brand)')}>
        <CalendarDays size={20} aria-hidden="true" />
        Hôm nay
      </span>
      {items.map(([label, icon]) => (
        <button
          key={label}
          type="button"
          className={cn(cls, 'text-(--ink-muted)')}
          onClick={() => notify(`${label}: chưa có trong mock.`)}
        >
          {icon}
          {label}
        </button>
      ))}
    </nav>
  );
}

export interface DetailActions {
  onCheckIn: () => void;
  onComplete: () => void;
  onReschedule: () => void;
  onAddService: () => void;
  onClose: () => void;
}

/** Right column ≥ 1200px, drawer 768–1199px, bottom sheet < 768px. */
export function DetailPanel({
  fixture,
  appt,
  actions,
}: {
  fixture: TenantFixture;
  appt: Appointment;
  actions: DetailActions;
}) {
  const L = lookups(fixture);
  const customer = L.customer(appt);
  const d = appointmentDetail(fixture, appt);
  const badge =
    appt.status === 'checked_in' && appt.checkedInAt
      ? `${statusLabel.checked_in} ${formatTime(appt.checkedInAt)}`
      : appt.status === 'completed' && !appt.settled && d.due > 0n
        ? 'Hoàn thành · chờ thanh toán'
        : undefined;

  return (
    <>
      <div
        aria-hidden="true"
        className="fixed inset-0 z-40 bg-(--surface) opacity-60 min-[1200px]:hidden"
        onClick={actions.onClose}
      />
      <aside
        aria-label="Chi tiết lịch hẹn"
        className={cn(
          'fixed inset-x-0 bottom-0 z-50 flex max-h-[85vh] flex-col gap-(--space-4) overflow-y-auto rounded-t-(--radius-lg) bg-(--surface-raised) p-(--space-5) shadow-(--shadow-popover)',
          'md:inset-x-auto md:top-(--space-4) md:right-(--space-4) md:bottom-(--space-4) md:max-h-none md:w-[340px] md:rounded-(--radius-md)',
          'min-[1200px]:static min-[1200px]:z-auto min-[1200px]:w-auto min-[1200px]:max-w-[400px] min-[1200px]:flex-[1_1_320px] min-[1200px]:shadow-[0_0_0_1px_var(--line),var(--shadow-card)]',
        )}
      >
        <div className="flex items-center justify-between gap-(--space-2)">
          <StatusBadge status={appt.status} {...(badge ? { label: badge } : {})} />
          <Button
            variant="ghost"
            aria-label="Đóng"
            className="size-9! p-0!"
            onClick={actions.onClose}
          >
            <X size={16} aria-hidden="true" />
          </Button>
        </div>
        <div className="flex flex-col gap-0.5">
          <h2 className="heading m-0">{customer?.name ?? 'Khách đang đặt online'}</h2>
          {customer && (
            <span className="body-sm sp-num text-(--ink-muted)">
              {formatPhone(customer.phone)}
              {customer.visitCount ? ` · khách lần thứ ${customer.visitCount}` : ''}
            </span>
          )}
        </div>
        {d.items.map((item) => (
          <div
            key={item.title}
            className="flex flex-col gap-(--space-3) rounded-(--radius-md) bg-(--fill-tonal) p-(--space-4)"
          >
            <div className="flex justify-between gap-(--space-2)">
              <span className="body font-semibold">{item.title}</span>
              <span className="body sp-num font-semibold">{item.price}</span>
            </div>
            <div className="body-sm sp-num flex flex-col gap-(--space-2)">
              {item.lines.map((line) => (
                <div key={line.range} className="flex items-center gap-(--space-3)">
                  <span
                    aria-hidden="true"
                    className={cn(
                      'size-3.5 flex-none rounded-(--radius-xs) shadow-[inset_0_0_0_1px_var(--status-checked-in)]',
                      line.wait
                        ? 'bg-[repeating-linear-gradient(135deg,var(--status-checked-in-soft)_0_3px,var(--surface-raised)_3px_7px)]'
                        : 'bg-(--status-checked-in-soft)',
                    )}
                  />
                  <span className="w-24 flex-none whitespace-nowrap text-(--ink-muted)">
                    {line.range}
                  </span>
                  <span>{line.text}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
        <dl className="m-0 grid grid-cols-2 gap-(--space-3)">
          {d.deposit > 0n && <Fact term="Đã cọc" value={formatVnd(d.deposit)} strong />}
          <Fact term="Còn phải thu" value={formatVnd(d.due)} strong />
          <Fact term="Đặt qua" value={d.channel} />
          <Fact term="Hoa hồng" value={d.commission} />
        </dl>
        {appt.note && (
          <div className="flex flex-col gap-(--space-1)">
            <span className="body-sm text-(--ink-muted)">Ghi chú</span>
            <span className="body-sm">{appt.note}</span>
          </div>
        )}
        {appt.status !== 'held' && appt.status !== 'no_show' && (
          <div className="mt-(--space-1) flex flex-col gap-(--space-2)">
            {appt.status === 'confirmed' && (
              <Button variant="primary" onClick={actions.onCheckIn}>
                Check-in
              </Button>
            )}
            {(appt.status === 'checked_in' || (appt.status === 'completed' && d.due > 0n)) && (
              <Button variant="primary" onClick={actions.onComplete}>
                {appt.status === 'completed' ? 'Thu tiền' : 'Hoàn thành và thu tiền'}
              </Button>
            )}
            <div className="grid grid-cols-2 gap-(--space-2)">
              <Button onClick={actions.onReschedule}>Đổi giờ</Button>
              <Button onClick={actions.onAddService}>Thêm dịch vụ</Button>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}

function Fact({ term, value, strong }: { term: string; value: string; strong?: boolean }) {
  return (
    <div>
      <dt className="body-sm text-(--ink-muted)">{term}</dt>
      <dd className={cn('body-sm m-0', strong && 'sp-num font-semibold')}>{value}</dd>
    </div>
  );
}
