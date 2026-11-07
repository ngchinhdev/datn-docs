'use client';

import { ChevronLeft, ChevronRight, Plus, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAppHref } from '@/components/mock/use-app-href';
import { useQueryState } from '@/components/mock/use-query-state';
import { Button } from '@/components/sapio/button';
import { SegmentedNav } from '@/components/sapio/segmented';
import { ResourceCalendar } from '@/components/sapio/resource-calendar';
import { StatusBadge } from '@/components/sapio/status-badge';
import { useMockNow } from '@/components/sapio/use-mock-now';
import { dayHours } from '@/mock/hours';
import { tenantFixtures } from '@/mock/fixtures';
import {
  dayAppointments,
  freeResourcesAt,
  isLive,
  lookups,
  resourceColumns,
  staffColumns,
} from '@/mock/reception';
import { addDays, formatDay, formatTime, localDate, MOCK_NOW } from '@/mock/time';
import { useAppointmentActions } from '../_reception/actions';
import { DetailPanel, ViewTabs, type CalendarView } from '../_reception/parts';
import { useReception } from '../_reception/use-reception';

const WIDE_QUERY = '(min-width: 1200px)';

export function ReceptionScreen({ tenantSlug }: { tenantSlug: string }) {
  const fixture = tenantFixtures.find((f) => f.tenant.slug === tenantSlug) ?? tenantFixtures[0]!;
  const branch = fixture.branches[0]!;
  const L = lookups(fixture);
  const now = useMockNow();
  const today = localDate(MOCK_NOW);
  const appHref = useAppHref(tenantSlug);
  const [date, setDate] = useQueryState('date', today);
  const [viewParam] = useQueryState('view', 'staff');
  const view: CalendarView = viewParam === 'resources' ? 'resources' : 'staff';
  const hours = dayHours(fixture, date);

  const { appointments, replace, notify } = useReception(fixture);
  const actions = useAppointmentActions(fixture, appointments, replace, now);
  const day = dayAppointments(appointments, date);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const cancelled = appointments.filter(
    (a) => a.status === 'cancelled' && localDate(a.startAt) === date,
  );
  const selected =
    [...day, ...cancelled].find((a) => a.id === selectedId && isLive(a, now)) ?? null;

  // Only the wide layout opens a detail at load; below 1200px the drawer would cover the calendar.
  useEffect(() => {
    if (window.matchMedia(WIDE_QUERY).matches) {
      setSelectedId(
        dayAppointments(fixture.appointments, today).find((a) => a.status === 'checked_in')?.id ??
          null,
      );
    }
  }, [fixture, today]);

  const goTo = (d: string) => {
    setDate(d);
    setSelectedId(null);
  };

  // `?staff=` narrows the staff view to one person (the "Xem lịch" button of the staff list).
  const [staffOnly, setStaffOnly] = useQueryState('staff', '');
  const allColumns = (view === 'staff' ? staffColumns : resourceColumns)(
    fixture,
    day,
    now,
    selectedId,
    setSelectedId,
    date,
  );
  const only = view === 'staff' ? allColumns.find((c) => c.id === staffOnly) : undefined;
  const columns = only ? [only] : allColumns;
  const [phoneColumn, setPhoneColumn] = useState(columns[0]?.id ?? '');
  const phoneCol = columns.find((c) => c.id === phoneColumn) ?? columns[0];
  const next = phoneCol
    ? day.find(
        (a) =>
          a.status === 'confirmed' &&
          a.startAt >= now &&
          a.bookings.some((b) => b.resourceId === phoneCol.id),
      )
    : undefined;

  const calendarLabel = `Lịch ${view === 'staff' ? 'nhân viên' : 'tài nguyên'} ${branch.name}, ${formatDay(date)}`;

  return (
    <div className="sp-shell__content sp-shell__content--wide">
      {/* Top bar, tablet and up. */}
      <header className="hidden flex-wrap items-center gap-x-(--space-5) gap-y-(--space-3) rounded-(--radius-md) bg-(--surface-raised) px-(--space-4) py-(--space-3) shadow-[0_0_0_1px_var(--line)] md:flex">
        <div className="flex items-center gap-(--space-1)">
          <Button
            variant="ghost"
            aria-label="Ngày trước"
            className="w-9! p-0!"
            onClick={() => goTo(addDays(date, -1))}
          >
            <ChevronLeft size={16} aria-hidden="true" />
          </Button>
          <Button size="sm" aria-pressed={date === today} onClick={() => goTo(today)}>
            Hôm nay
          </Button>
          <Button
            variant="ghost"
            aria-label="Ngày sau"
            className="w-9! p-0!"
            onClick={() => goTo(addDays(date, 1))}
          >
            <ChevronRight size={16} aria-hidden="true" />
          </Button>
          <span className="body sp-num ms-(--space-2) font-semibold">
            {formatDay(date)}/{date.slice(0, 4)}
          </span>
        </div>
        <ViewTabs view={view} />
        <div className="ms-auto flex flex-wrap items-center gap-(--space-3)">
          <label className="hidden h-9 items-center gap-(--space-2) rounded-(--radius-sm) bg-(--fill-tonal) px-(--space-3) text-(--ink-muted) min-[1200px]:flex">
            <Search size={16} aria-hidden="true" />
            <span className="sr-only">Tìm khách</span>
            <input
              type="search"
              placeholder="Tìm khách hoặc số điện thoại"
              className="body-sm w-56 border-0 bg-transparent text-(--ink) outline-none"
            />
          </label>
          <Button variant="primary" onClick={() => notify('Tạo lịch hẹn: chưa có trong mock.')}>
            <Plus size={16} aria-hidden="true" />
            Tạo lịch hẹn
          </Button>
        </div>
      </header>

      {/* Phone header. */}
      <div className="flex flex-col gap-(--space-3) md:hidden">
        <div className="flex items-center gap-(--space-2)">
          <div className="flex grow flex-col">
            <span className="title">Hôm nay</span>
            <span className="body-sm sp-num text-(--ink-muted)">
              {formatDay(date).replace(',', '')} · {branch.name}
            </span>
          </div>
          <Button
            variant="primary"
            aria-label="Tạo lịch hẹn"
            className="size-11! rounded-(--radius-pill)! p-0!"
            onClick={() => notify('Tạo lịch hẹn: chưa có trong mock.')}
          >
            <Plus size={20} aria-hidden="true" />
          </Button>
        </div>
        <SegmentedNav
          label="Danh sách hoặc lịch"
          block
          items={[
            { href: appHref('today'), label: 'Danh sách', current: false },
            { href: appHref('calendar'), label: 'Lịch', current: true },
          ]}
        />
        <ViewTabs view={view} />
        <div className="flex gap-(--space-2) overflow-x-auto" role="group" aria-label="Chọn cột">
          {columns.map((c) => (
            <button
              key={c.id}
              type="button"
              className="sp-slot flex-none px-(--space-4)! [--accent:var(--primary)] [--on-accent:var(--on-primary)]"
              aria-pressed={c.id === phoneCol?.id}
              onClick={() => setPhoneColumn(c.id)}
            >
              {c.name} · {c.blocks.length}
            </button>
          ))}
        </div>
        {next && phoneCol && (
          <div className="flex items-center gap-(--space-3) rounded-(--radius-md) bg-(--surface-raised) px-(--space-4) py-(--space-3) shadow-[0_0_0_1px_var(--line)]">
            <div className="flex min-w-0 grow flex-col">
              <span className="label text-(--ink-muted)">Tiếp theo của {phoneCol.name}</span>
              <span className="body-sm sp-num font-semibold">
                {formatTime(next.startAt)} · {L.who(next)} · {L.services(next)}
              </span>
            </div>
            <Button className="h-11!" onClick={() => actions.checkIn(next)}>
              Check-in
            </Button>
          </div>
        )}
      </div>

      <main className="flex flex-wrap items-start gap-(--space-5)">
        <section
          aria-label="Lịch"
          className="flex min-w-0 flex-[999_1_720px] flex-col gap-(--space-3)"
        >
          {only && (
            <p className="body-sm m-0 flex flex-wrap items-center gap-(--space-2) text-(--ink-muted)">
              Chỉ xem lịch của {only.name}.
              <Button size="sm" onClick={() => setStaffOnly('')}>
                Xem tất cả
              </Button>
            </p>
          )}
          {view === 'resources' && date === today && (
            <p className="body-sm m-0 text-(--ink-muted)">
              Lúc {formatTime(now)} còn trống:{' '}
              {freeResourcesAt(fixture, day, now).join(', ') || 'không còn'}
            </p>
          )}
          <div className="hidden md:block">
            <ResourceCalendar
              label={calendarLabel}
              columns={columns}
              date={date}
              from={hours.from}
              to={hours.to}
              open={hours.open}
              close={hours.close}
              {...(hours.closedLabel ? { closedLabel: hours.closedLabel } : {})}
              now={now}
            />
          </div>
          <div className="md:hidden">
            {phoneCol && (
              <ResourceCalendar
                label={`Lịch của ${phoneCol.name}`}
                columns={[phoneCol]}
                date={date}
                from={hours.from}
                to={hours.to}
                open={hours.open}
                close={hours.close}
                {...(hours.closedLabel ? { closedLabel: hours.closedLabel } : {})}
                now={now}
              />
            )}
          </div>
          {cancelled.length > 0 && (
            <div className="flex flex-wrap items-center gap-(--space-2)">
              <span className="body-sm text-(--ink-muted)">Đã hủy trong ngày:</span>
              {cancelled.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  className="sp-badge sp-badge--cancelled cursor-pointer border-0"
                  onClick={() => setSelectedId(a.id)}
                >
                  {formatTime(a.startAt)} {L.who(a)} · {L.services(a)}
                </button>
              ))}
            </div>
          )}
          <div className="hidden flex-wrap items-center gap-x-(--space-3) gap-y-(--space-2) md:flex">
            {(['held', 'confirmed', 'checked_in', 'completed', 'no_show'] as const).map((s) => (
              <StatusBadge key={s} status={s} />
            ))}
            {view === 'staff' && (
              <span className="body-sm flex items-center gap-(--space-2) text-(--ink-muted)">
                <span
                  aria-hidden="true"
                  className="h-4 w-7 rounded-(--radius-xs) bg-[repeating-linear-gradient(135deg,var(--status-checked-in-soft)_0_4px,var(--surface-raised)_4px_10px)] shadow-[0_0_0_1px_var(--line)]"
                />
                Vạch chéo: nhân viên rảnh, tài nguyên vẫn bận. Xem ở tab Tài nguyên.
              </span>
            )}
          </div>
        </section>

        {selected ? (
          <DetailPanel
            fixture={fixture}
            appt={selected}
            actions={{
              allowed: actions.allowed(selected),
              onClose: () => setSelectedId(null),
              onCheckIn: () => actions.checkIn(selected),
              onCollect: () => actions.collect(selected),
              onNoShow: () => actions.noShow(selected),
              onCancel: () => actions.cancel(selected),
              onReschedule: () =>
                notify('Kéo khối lịch hẹn sang giờ mới để đổi giờ (chưa có trong mock).'),
              onAddService: () => notify('Thêm dịch vụ: chưa có trong mock.'),
            }}
          />
        ) : (
          <aside
            aria-label="Chi tiết lịch hẹn"
            className="hidden max-w-[400px] flex-[1_1_320px] min-[1200px]:block"
          >
            <p className="sp-empty m-0">Chọn một lịch hẹn để xem chi tiết.</p>
          </aside>
        )}
        {actions.dialog}
      </main>
    </div>
  );
}
