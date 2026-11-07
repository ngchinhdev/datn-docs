'use client';

import { ChevronLeft, ChevronRight, Plus, Search } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button } from '@/components/sapio/button';
import { ResourceCalendar } from '@/components/sapio/resource-calendar';
import { StatusBadge } from '@/components/sapio/status-badge';
import { useMockNow } from '@/components/sapio/use-mock-now';
import { openingHours } from '@/mock/hours';
import { tenantFixtures } from '@/mock/fixtures';
import { formatVnd } from '@/mock/format';
import {
  appointmentDetail,
  dayAppointments,
  freeResourcesAt,
  isLive,
  lookups,
  resourceColumns,
  staffColumns,
} from '@/mock/reception';
import { formatDay, formatTime, localDate, MOCK_NOW } from '@/mock/time';
import { DetailPanel, PhoneNav, Toast, ViewTabs } from './parts';
import { useReception } from './use-reception';

const PHONE_QUERY = '(max-width: 767px)';

export function ReceptionScreen({
  tenantSlug,
  view,
  query,
}: {
  tenantSlug: string;
  view: 'staff' | 'resource';
  query: string;
}) {
  const fixture = tenantFixtures.find((f) => f.tenant.slug === tenantSlug) ?? tenantFixtures[0]!;
  const branch = fixture.branches[0]!;
  const L = lookups(fixture);
  const now = useMockNow();
  const date = localDate(MOCK_NOW);
  const hours = openingHours(fixture, date) ?? { open: '08:00', close: '18:00' };
  const from = `${hours.open.slice(0, 2)}:00`;
  const to = `${String(Math.ceil(Number(hours.close.slice(0, 2)) + Number(hours.close.slice(3)) / 60)).padStart(2, '0')}:00`;

  const { appointments, setStatus, toast, notify } = useReception(fixture);
  const day = dayAppointments(appointments, date);
  const [selectedId, setSelectedId] = useState<string | null>(
    () => day.find((a) => a.status === 'checked_in')?.id ?? null,
  );
  const selected = day.find((a) => a.id === selectedId && isLive(a, now)) ?? null;

  // The canvas opens Hà's detail on desktop and tablet; on a phone the calendar comes first.
  useEffect(() => {
    if (window.matchMedia(PHONE_QUERY).matches) setSelectedId(null);
  }, []);

  const columns = (view === 'staff' ? staffColumns : resourceColumns)(
    fixture,
    day,
    now,
    selectedId,
    setSelectedId,
  );
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
  const notToday = () => notify('Mock chỉ có dữ liệu ngày 07/11.');

  return (
    <div className="flex flex-col">
      {/* Admin header, tablet and up. */}
      <header className="hidden flex-wrap items-center gap-x-(--space-5) gap-y-(--space-3) rounded-(--radius-md) bg-(--surface-raised) px-(--space-4) py-(--space-3) shadow-[0_0_0_1px_var(--line)] md:flex">
        <div className="flex items-center gap-(--space-3)">
          <span className="heading font-bold">Sapio</span>
          <span aria-hidden="true" className="h-5 w-px bg-(--line)" />
          <span className="body-sm">{branch.name}</span>
        </div>
        <div className="flex items-center gap-(--space-1)">
          <Button variant="ghost" aria-label="Ngày trước" className="w-9! p-0!" onClick={notToday}>
            <ChevronLeft size={16} aria-hidden="true" />
          </Button>
          <Button size="sm">Hôm nay</Button>
          <Button variant="ghost" aria-label="Ngày sau" className="w-9! p-0!" onClick={notToday}>
            <ChevronRight size={16} aria-hidden="true" />
          </Button>
          <span className="body sp-num ms-(--space-2) font-semibold">
            {formatDay(date)}/{date.slice(0, 4)}
          </span>
        </div>
        <ViewTabs view={view} query={query} />
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
        <div className="grid grid-cols-2 gap-0.5 rounded-(--radius-sm) bg-(--fill-tonal) p-[3px]">
          <Link href={`/mock/hom-nay${query}`} className="sp-btn sp-btn--ghost h-10! no-underline">
            Danh sách
          </Link>
          <span
            aria-current="page"
            className="sp-btn h-10! bg-(--surface-raised) text-(--ink) shadow-(--shadow-xs)"
          >
            Lịch
          </span>
        </div>
        <ViewTabs view={view} query={query} />
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
            <Button
              className="h-11!"
              onClick={() => {
                setStatus(next.id, 'checked_in', { checkedInAt: now });
                notify(`Đã check-in ${L.who(next)}.`);
              }}
            >
              Check-in
            </Button>
          </div>
        )}
      </div>

      <main className="mt-(--space-4) flex flex-wrap items-start gap-(--space-5) pb-24 md:pb-0">
        <section
          aria-label="Lịch"
          className="flex min-w-0 flex-[999_1_720px] flex-col gap-(--space-3)"
        >
          {view === 'resource' && (
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
              from={from}
              to={to}
              open={hours.open}
              close={hours.close}
              now={now}
            />
          </div>
          <div className="md:hidden">
            {phoneCol && (
              <ResourceCalendar
                label={`Lịch của ${phoneCol.name}`}
                columns={[phoneCol]}
                date={date}
                from={from}
                to={to}
                open={hours.open}
                close={hours.close}
                now={now}
              />
            )}
          </div>
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

        {selected && (
          <DetailPanel
            fixture={fixture}
            appt={selected}
            actions={{
              onClose: () => setSelectedId(null),
              onCheckIn: () => {
                setStatus(selected.id, 'checked_in', { checkedInAt: now });
                notify(`Đã check-in ${L.who(selected)}.`);
              },
              onComplete: () => {
                const due = appointmentDetail(fixture, selected).due;
                setStatus(selected.id, 'completed', { settled: true });
                notify(`Đã thu ${formatVnd(due)}. Lịch hẹn hoàn thành.`);
              },
              onReschedule: () =>
                notify('Kéo khối lịch hẹn sang giờ mới để đổi giờ (chưa có trong mock).'),
              onAddService: () => notify('Thêm dịch vụ: chưa có trong mock.'),
            }}
          />
        )}
      </main>

      <PhoneNav notify={notify} />
      <Toast message={toast} />
    </div>
  );
}
