'use client';

import { X } from 'lucide-react';
import { usePathname, useSearchParams } from 'next/navigation';
import { SegmentedNav } from '@/components/sapio/segmented';
import type { ReactNode } from 'react';
import { Button } from '@/components/sapio/button';
import { StatusBadge, statusLabel } from '@/components/sapio/status-badge';
import { cn } from '@/lib/utils';
import type { Appointment, TenantFixture } from '@/mock/fixtures';
import { formatPhone, formatVnd } from '@/mock/format';
import { appointmentDetail, lookups } from '@/mock/reception';
import type { AllowedActions } from './actions';
import { formatTime } from '@/mock/time';

export type CalendarView = 'staff' | 'resources';

/** Nhân viên / Tài nguyên: the same page with `?view=`, other query kept. */
export function ViewTabs({ view }: { view: CalendarView }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hrefFor = (next: CalendarView) => {
    const params = new URLSearchParams(searchParams);
    if (next === 'staff') params.delete('view');
    else params.set('view', next);
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  };
  return (
    <SegmentedNav
      label="Kiểu xem"
      items={[
        { href: hrefFor('staff'), label: 'Nhân viên', current: view === 'staff' },
        { href: hrefFor('resources'), label: 'Tài nguyên', current: view === 'resources' },
      ]}
    />
  );
}

export interface DetailActions {
  allowed: AllowedActions;
  onCheckIn: () => void;
  onCollect: () => void;
  onNoShow: () => void;
  onCancel: () => void;
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
        className="sp-scrim z-40 min-[1200px]:hidden"
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
                      'size-3.5 flex-none rounded-(--radius-xs)',
                      line.buffer
                        ? 'bg-(--surface-raised) shadow-[inset_0_0_0_1px_var(--line-strong)]'
                        : 'shadow-[inset_0_0_0_1px_var(--status-checked-in)]',
                      line.wait
                        ? 'bg-[repeating-linear-gradient(135deg,var(--status-checked-in-soft)_0_3px,var(--surface-raised)_3px_7px)]'
                        : !line.buffer && 'bg-(--status-checked-in-soft)',
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
        {Object.values(actions.allowed).some(Boolean) && (
          <div className="mt-(--space-1) flex flex-col gap-(--space-2)">
            {actions.allowed.checkIn && (
              <Button variant="primary" onClick={actions.onCheckIn}>
                Check-in
              </Button>
            )}
            {actions.allowed.collect && (
              <Button variant="primary" onClick={actions.onCollect}>
                {appt.status === 'completed' ? 'Thu tiền' : 'Hoàn thành và thu tiền'}
              </Button>
            )}
            {actions.allowed.edit && (
              <div className="grid grid-cols-2 gap-(--space-2)">
                <Button onClick={actions.onReschedule}>Đổi giờ</Button>
                <Button onClick={actions.onAddService}>Thêm dịch vụ</Button>
              </div>
            )}
            {(actions.allowed.noShow || actions.allowed.cancel) && (
              <div className="grid grid-cols-2 gap-(--space-2)">
                {actions.allowed.noShow && (
                  <Button variant="danger" onClick={actions.onNoShow}>
                    Đánh dấu không đến
                  </Button>
                )}
                {actions.allowed.cancel && (
                  <Button variant="danger" onClick={actions.onCancel}>
                    Hủy lịch
                  </Button>
                )}
              </div>
            )}
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
