'use client';

import { Plus } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useAppHref } from '@/components/mock/use-app-href';
import { Button } from '@/components/sapio/button';
import { ResourceCalendar } from '@/components/sapio/resource-calendar';
import { StatusBadge } from '@/components/sapio/status-badge';
import { useMockNow } from '@/components/sapio/use-mock-now';
import { openingHours } from '@/mock/hours';
import { tenantFixtures, type Appointment } from '@/mock/fixtures';
import { formatVnd } from '@/mock/format';
import {
  appointmentDetail,
  appointmentEnd,
  dayAppointments,
  holdSecondsLeft,
  isLive,
  lookups,
  staffColumns,
} from '@/mock/reception';
import { formatCountdown, formatDay, formatTime, localDate, MOCK_NOW } from '@/mock/time';
import { useAppointmentActions } from '../_reception/actions';
import { DetailPanel } from '../_reception/parts';
import { useReception } from '../_reception/use-reception';

function Row({
  a,
  title,
  meta,
  action,
  onSelect,
}: {
  a: Appointment;
  title: string;
  meta: string;
  action: ReactNode;
  onSelect: () => void;
}) {
  return (
    <div className="flex items-center gap-(--space-3) rounded-(--radius-md) bg-(--surface-raised) px-(--space-4) py-(--space-3) shadow-[0_0_0_1px_var(--line)]">
      <span className="body-sm sp-num w-11 flex-none font-semibold">{formatTime(a.startAt)}</span>
      <button
        type="button"
        onClick={onSelect}
        className="flex min-w-0 grow flex-col border-0 bg-transparent p-0 text-left text-(--ink)"
      >
        <span className="body-sm font-semibold">{title}</span>
        <span className="body-sm sp-num text-(--ink-muted)">{meta}</span>
      </button>
      {action}
    </div>
  );
}

function Group({ label, count, children }: { label: string; count: number; children: ReactNode }) {
  if (!count) return null;
  return (
    <section aria-label={label} className="flex flex-col gap-(--space-2)">
      <h2 className="body-sm m-0 font-medium text-(--ink-muted)">
        {label} · {count}
      </h2>
      {children}
    </section>
  );
}

export function TodayScreen({ tenantSlug }: { tenantSlug: string }) {
  const appHref = useAppHref(tenantSlug);
  const fixture = tenantFixtures.find((f) => f.tenant.slug === tenantSlug) ?? tenantFixtures[0]!;
  const branch = fixture.branches[0]!;
  const L = lookups(fixture);
  const now = useMockNow();
  const date = localDate(MOCK_NOW);
  const hours = openingHours(fixture, date) ?? { open: '08:00', close: '18:00' };
  const { appointments, replace, notify } = useReception();
  const actions = useAppointmentActions(fixture, appointments, replace, now);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const day = dayAppointments(appointments, date).filter((a) => isLive(a, now));
  const selected = day.find((a) => a.id === selectedId) ?? null;
  const staffOf = (a: Appointment) =>
    [...new Set(a.items.map((i) => L.name(i.staffResourceId)))].join(', ');
  const others = (a: Appointment) =>
    [
      ...new Set(
        a.bookings.filter((b) => !L.isStaff(b.resourceId)).map((b) => L.name(b.resourceId)),
      ),
    ].join(', ');

  const inService = day.filter((a) => a.status === 'checked_in');
  const awaitingPayment = day.filter((a) => a.status === 'completed' && !a.settled);
  const upcoming = day.filter((a) => a.status === 'held' || a.status === 'confirmed');
  const done = day.filter((a) => a.status === 'completed' && a.settled);
  const noShow = day.filter((a) => a.status === 'no_show');
  const held = day.filter((a) => a.status === 'held').length;

  const inServiceLine = (a: Appointment) => {
    const wait = a.bookings.find((b) => b.kind === 'wait' && b.startAt <= now && now < b.endAt);
    return wait
      ? `${staffOf(a)} · ${wait.label ?? 'chờ'} đến ${formatTime(wait.endAt)}`
      : `${staffOf(a)} · ${others(a)} · xong lúc ${formatTime(appointmentEnd(a))}`;
  };
  const checkIn = actions.checkIn;
  const bookingOpen = actions.bookingOpen;
  const collect = actions.collect;

  return (
    <div className="sp-shell__content sp-shell__content--wide">
      <header className="sp-page-head">
        <div>
          <h1 className="sp-page-head__title">Hôm nay</h1>
          <p className="sp-page-head__sub">{branch.name}</p>
        </div>
        <div className="sp-page-head__actions flex flex-wrap items-center gap-(--space-3)">
          <Button
            disabled={!bookingOpen}
            aria-describedby={bookingOpen ? undefined : 'trial-note'}
            onClick={() => notify('Khách vãng lai: chưa có trong mock.')}
          >
            Khách vãng lai
          </Button>
          <Button
            variant="primary"
            disabled={!bookingOpen}
            aria-describedby={bookingOpen ? undefined : 'trial-note'}
            onClick={() => notify('Tạo lịch hẹn: chưa có trong mock.')}
          >
            <Plus size={16} aria-hidden="true" />
            Tạo lịch hẹn
          </Button>
        </div>
      </header>

      {!bookingOpen && (
        <p id="trial-note" className="body-sm m-0 text-(--ink-muted)">
          Đang dùng thử: chưa tạo được lịch hẹn và chưa check-in. Mọi lịch hẹn ở đây là dữ liệu mẫu.{' '}
          <Link href={appHref('settings/plan')} className="font-medium">
            Kích hoạt gói để mở
          </Link>
          .
        </p>
      )}

      <main className="flex flex-wrap items-start gap-(--space-5)">
        <aside
          aria-label="Hàng chờ hôm nay"
          className="flex max-w-[420px] min-w-0 flex-[1_1_340px] flex-col gap-(--space-4)"
        >
          <div className="flex flex-col gap-0.5">
            <h2 className="title m-0">{formatDay(date)}</h2>
            <span className="body-sm sp-num text-(--ink-muted)">
              {day.length - held} lịch hẹn · {held} đang giữ chỗ · bây giờ {formatTime(now)}
            </span>
          </div>
          <Group label="Đang làm" count={inService.length}>
            {inService.map((a) => (
              <Row
                key={a.id}
                a={a}
                title={
                  a.status === 'held' ? 'Khách đang đặt online' : `${L.who(a)} · ${L.services(a)}`
                }
                onSelect={() => setSelectedId(a.id)}
                meta={inServiceLine(a)}
                action={<StatusBadge status="checked_in" />}
              />
            ))}
          </Group>
          <Group label="Chờ thanh toán" count={awaitingPayment.length}>
            {awaitingPayment.map((a) => (
              <Row
                key={a.id}
                a={a}
                title={
                  a.status === 'held' ? 'Khách đang đặt online' : `${L.who(a)} · ${L.services(a)}`
                }
                onSelect={() => setSelectedId(a.id)}
                meta={`${staffOf(a)} · ${formatVnd(appointmentDetail(fixture, a).due)}`}
                action={
                  <Button variant="primary" size="sm" onClick={() => collect(a)}>
                    Thu tiền
                  </Button>
                }
              />
            ))}
          </Group>
          <Group label="Sắp đến" count={upcoming.length}>
            {upcoming.map((a) =>
              a.status === 'held' ? (
                <Row
                  key={a.id}
                  a={a}
                  title={
                    a.status === 'held' ? 'Khách đang đặt online' : `${L.who(a)} · ${L.services(a)}`
                  }
                  onSelect={() => setSelectedId(a.id)}
                  meta={`${staffOf(a)} · ${others(a)} · giữ chỗ còn ${formatCountdown(holdSecondsLeft(a, now))}`}
                  action={<StatusBadge status="held" />}
                />
              ) : (
                <Row
                  key={a.id}
                  a={a}
                  title={`${L.who(a)} · ${L.services(a)}`}
                  onSelect={() => setSelectedId(a.id)}
                  meta={`${staffOf(a)} · ${others(a)}${a.depositVnd ? ` · đã cọc ${formatVnd(a.depositVnd)}` : ''}`}
                  action={
                    <Button
                      size="sm"
                      disabled={!bookingOpen}
                      aria-describedby={bookingOpen ? undefined : 'trial-note'}
                      onClick={() => checkIn(a)}
                    >
                      Check-in
                    </Button>
                  }
                />
              ),
            )}
          </Group>
          <span className="body-sm text-(--ink-muted)">
            Đã xong {done.length} · Không đến {noShow.length}
            {noShow.length > 0 &&
              ` (${noShow.map((a) => `${L.who(a)}, ${formatTime(a.startAt)}`).join('; ')})`}
          </span>
        </aside>

        <section aria-label="Lịch nhân viên" className="hidden min-w-0 flex-[999_1_640px] md:block">
          <ResourceCalendar
            label={`Lịch nhân viên, ${formatDay(date)}`}
            columns={staffColumns(fixture, day, now, selectedId, setSelectedId)}
            date={date}
            from={`${hours.open.slice(0, 2)}:00`}
            to={`${hours.close.slice(0, 2)}:00`}
            open={hours.open}
            close={hours.close}
            now={now}
          />
        </section>
        {selected && (
          <DetailPanel
            fixture={fixture}
            appt={selected}
            actions={{
              allowed: actions.allowed(selected),
              onClose: () => setSelectedId(null),
              onCheckIn: () => checkIn(selected),
              onCollect: () => collect(selected),
              onNoShow: () => actions.noShow(selected),
              onCancel: () => actions.cancel(selected),
              onReschedule: () => notify('Đổi giờ: chưa có trong mock.'),
              onAddService: () => notify('Thêm dịch vụ: chưa có trong mock.'),
            }}
          />
        )}
        {actions.dialog}
      </main>
    </div>
  );
}
