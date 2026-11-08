'use client';

import { Check, Play } from 'lucide-react';
import Link from 'next/link';
import { useScheduleStore } from '@/components/mock/schedule-store';
import { useAppHref } from '@/components/mock/use-app-href';
import { useLiveFixture } from '@/components/mock/use-live-fixture';
import { useQueryState } from '@/components/mock/use-query-state';
import { useTechnician } from '@/components/mock/use-technician';
import { Button } from '@/components/sapio/button';
import { DateStrip } from '@/components/sapio/date-strip';
import { SegmentedNav } from '@/components/sapio/segmented';
import { StatusBadge } from '@/components/sapio/status-badge';
import { useToast } from '@/components/sapio/toast';
import { useMockNow } from '@/components/sapio/use-mock-now';
import type { Appointment, TenantFixture } from '@/mock/fixtures';
import { formatPhone } from '@/mock/format';
import { openingHours } from '@/mock/hours';
import { itemArrival } from '@/mock/move';
import { lookups, type Lookups } from '@/mock/reception';
import { hasRota, shiftsOf } from '@/mock/shifts';
import { advanceItem, itemPhase, nextPartText, waitOf, type ItemPhase } from '@/mock/technician';
import { addDays, formatDay, formatRange, formatTime, localDate, MOCK_NOW } from '@/mock/time';

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** The technician's own part of an appointment, with what to show and what to press. */
interface Card {
  appt: Appointment;
  /** Indexes of the items the technician does. */
  mine: number[];
  phase: ItemPhase;
  /** The item the buttons act on. */
  focus: number;
  time: string;
  title: string;
  meta: string;
}

const PRIORITY: ItemPhase[] = ['back', 'waiting', 'working', 'due', 'upcoming'];

function buildCard(
  fixture: TenantFixture,
  L: Lookups,
  me: string,
  appt: Appointment,
  now: string,
  all: Appointment[],
): Card | null {
  const mine = appt.items.flatMap((item, i) => (item.staffResourceId === me ? [i] : []));
  if (mine.length === 0) return null;
  const phases = mine.map((i) => itemPhase(appt, i, now));
  const phase =
    PRIORITY.find((p) => phases.includes(p)) ??
    (phases.every((p) => p === 'done') ? 'done' : 'closed');
  const focus = mine[phases.indexOf(phase)] ?? mine[0]!;

  const services = mine
    .map((i) => L.variant(appt.items[i]?.serviceVariantId ?? '')?.shortName ?? '')
    .join(', ');
  const mineBookings = appt.bookings.filter((b) => mine.includes(b.itemIndex));
  const seen = mineBookings.filter((b) => b.kind === 'work' || b.kind === 'wait');
  const from = seen.map((b) => b.startAt).sort()[0] ?? appt.startAt;
  const to =
    seen
      .map((b) => b.endAt)
      .sort()
      .at(-1) ?? appt.startAt;
  const staffIds = new Set(fixture.staff.map((s) => s.resourceId));
  const where = [
    ...new Set(
      mineBookings.filter((b) => !staffIds.has(b.resourceId)).map((b) => L.name(b.resourceId)),
    ),
  ].join(', ');
  const prep = mineBookings.find((b) => b.kind === 'prep');
  const chosen = mine.some((i) => appt.items[i]?.staffChoice === 'chosen');
  const wait = waitOf(appt, focus);

  let meta: string;
  let time = formatTime(itemArrival(appt, mine[0]!));
  if (phase === 'back' && wait) {
    meta = `Đến giờ quay lại: ${nextPartText(fixture, appt, focus)}`;
    time = formatTime(wait.endAt);
  } else if (phase === 'waiting' && wait) {
    meta = `${capitalize(wait.label ?? 'chờ')} đến ${formatTime(wait.endAt)}, bạn rảnh`;
  } else if (appt.status === 'no_show') {
    meta = `Không đến · ${where}`;
  } else {
    const parts = [formatRange(from, to), where];
    if (chosen) parts.push('chọn bạn');
    if (prep)
      parts.push(
        `${capitalize(prep.label ?? 'chuẩn bị')} ${formatRange(prep.startAt, prep.endAt)}`,
      );
    // Done while another customer waits for their colour: the gap was put to use (BR-05).
    const during = all.find((other) => {
      if (other.id === appt.id) return false;
      const otherMine = other.items.flatMap((it, i) => (it.staffResourceId === me ? [i] : []));
      return otherMine.some((i) => {
        const w = waitOf(other, i);
        return w && w.startAt <= from && to <= w.endAt;
      });
    });
    if (during) parts.push(`làm trong lúc ${L.who(during)} chờ`);
    meta = parts.filter(Boolean).join(' · ');
  }
  return { appt, mine, phase, focus, time, title: `${L.who(appt)} · ${services}`, meta };
}

/** Lịch của tôi (MH-35): only the signed-in technician's appointments, by day or week (BR-36). */
export function MyScheduleScreen({ tenantSlug }: { tenantSlug: string }) {
  const fixture = useLiveFixture(tenantSlug);
  const me = useTechnician();
  const { appointments, replaceAppointment, staffSeesCustomerPhone } = useScheduleStore();
  const appHref = useAppHref(tenantSlug);
  const toast = useToast();
  const now = useMockNow();
  const L = lookups(fixture);
  const today = localDate(MOCK_NOW);
  const [date, setDate] = useQueryState('date', today);
  const [viewParam] = useQueryState('view', 'day');
  const view = viewParam === 'week' ? 'week' : 'day';
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i));
  const name = me.profile.displayName;

  const cards = (day: string) => {
    const dayList = appointments.filter(
      (a) => localDate(a.startAt) === day && a.status !== 'cancelled' && a.status !== 'held',
    );
    return dayList
      .flatMap((a) => {
        const card = buildCard(fixture, L, me.resourceId, a, now, dayList);
        return card ? [card] : [];
      })
      .sort(
        (a, b) =>
          Number(b.phase === 'back') - Number(a.phase === 'back') ||
          a.appt.startAt.localeCompare(b.appt.startAt),
      );
  };

  /** "ca 08:45–17:00", or why there is none. */
  const shiftText = (day: string) => {
    const mine = shiftsOf(fixture.shifts, me.resourceId, day);
    const off = fixture.staffTimeOff.find(
      (t) => t.resourceId === me.resourceId && t.date === day && t.status === 'approved' && !t.from,
    );
    if (off) return 'nghỉ phép';
    if (mine.length > 0) return `ca ${mine.map((s) => `${s.start}–${s.end}`).join(', ')}`;
    return hasRota(fixture.shifts, day) ? 'không có ca' : 'theo giờ mở cửa';
  };

  const act = (card: Card, action: 'start' | 'resume' | 'finish') => {
    const next = advanceItem(card.appt, card.focus, action, now);
    replaceAppointment(next);
    const done = {
      start: 'Đã bắt đầu',
      resume: 'Đã bắt đầu phần tiếp của',
      finish: 'Đã xong',
    }[action];
    toast({ text: `${done} ${card.title}.`, undo: () => replaceAppointment(card.appt) });
  };

  const dayHref = (d: string) => appHref('my/schedule', { date: d });
  const weekHref = appHref('my/schedule', { view: 'week', date });

  const renderCard = (card: Card) => {
    const { appt, phase } = card;
    const customer = L.customer(appt);
    const closed = phase === 'closed' || phase === 'done';
    const badge =
      phase === 'done' ? (
        <StatusBadge status="completed" />
      ) : phase === 'closed' ? (
        <StatusBadge status={appt.status} />
      ) : phase === 'back' || phase === 'waiting' ? (
        <StatusBadge
          status="checked_in"
          label={capitalize(waitOf(appt, card.focus)?.label ?? 'Chờ')}
        />
      ) : phase === 'working' ? (
        <StatusBadge status="checked_in" label="Đang làm" />
      ) : (
        <StatusBadge status="confirmed" />
      );
    const canPress = date === today;
    return (
      <li
        key={appt.id}
        className={`sp-panel gap-1! px-3.5! py-3! ${closed ? 'opacity-70' : ''}`}
        style={phase === 'back' ? { boxShadow: 'inset 0 0 0 1.5px var(--brand)' } : undefined}
      >
        <div className="flex items-start gap-(--space-3)">
          <span className="sp-num w-11 flex-none text-[15px] leading-[22px] font-semibold">
            {card.time}
          </span>
          <div className="min-w-0 flex-1">
            <Link
              href={appHref(`appointments/${appt.id}`)}
              className="block text-[15px] leading-[22px] font-semibold text-(--ink) no-underline"
            >
              {card.title}
            </Link>
            <div className="sp-num text-[13px] leading-[18px] text-(--ink-muted)">{card.meta}</div>
            {staffSeesCustomerPhone && customer?.phone && (
              <a
                href={`tel:${customer.phone}`}
                className="sp-num text-[13px] leading-[18px] font-medium"
              >
                {formatPhone(customer.phone)}
              </a>
            )}
            {appt.note && <p className="m-0 mt-1.5 text-[13px] leading-[18px]">{appt.note}</p>}
            {canPress && (phase === 'due' || phase === 'back' || phase === 'working') && (
              <div className="mt-2.5 flex gap-(--space-2)">
                <Button
                  variant="primary"
                  className="h-11!"
                  onClick={() =>
                    act(card, phase === 'due' ? 'start' : phase === 'back' ? 'resume' : 'finish')
                  }
                >
                  {phase === 'working' ? (
                    <Check size={16} aria-hidden="true" />
                  ) : (
                    <Play size={16} aria-hidden="true" />
                  )}
                  {phase === 'due' ? 'Bắt đầu' : phase === 'back' ? 'Bắt đầu phần tiếp' : 'Xong'}
                </Button>
              </div>
            )}
          </div>
          {badge}
        </div>
      </li>
    );
  };

  const dayCards = cards(date);
  return (
    <div className="sp-shell__content">
      <div className="mx-auto flex w-full max-w-[640px] flex-col gap-(--space-4)">
        <div>
          <h1 className="sp-page-head__title">Lịch của tôi</h1>
          <p className="sp-page-head__sub sp-num">
            {name} · {shiftText(date)} · {dayCards.length} lịch
          </p>
        </div>
        <SegmentedNav
          label="Kiểu xem"
          block
          items={[
            { href: dayHref(date), label: 'Ngày', current: view === 'day' },
            { href: weekHref, label: 'Tuần', current: view === 'week' },
          ]}
        />
        {view === 'day' ? (
          <>
            <DateStrip
              dates={days.map((d) => ({ date: d, closed: !openingHours(fixture, d) }))}
              selected={date}
              onSelect={setDate}
            />
            {dayCards.length > 0 ? (
              <ol className="m-0 flex list-none flex-col gap-(--space-2) p-0">
                {dayCards.map(renderCard)}
              </ol>
            ) : (
              <p className="sp-empty m-0">
                {shiftText(date) === 'nghỉ phép'
                  ? 'Bạn nghỉ phép ngày này.'
                  : 'Không có lịch hẹn nào ngày này.'}
              </p>
            )}
          </>
        ) : (
          <div className="flex flex-col gap-(--space-4)">
            {days.map((d) => {
              const list = cards(d);
              return (
                <section
                  key={d}
                  aria-labelledby={`wk-${d}`}
                  className="flex flex-col gap-(--space-2)"
                >
                  <div className="flex items-baseline justify-between gap-(--space-2)">
                    <h2 id={`wk-${d}`} className="m-0 text-[15px] leading-[22px] font-semibold">
                      <Link href={dayHref(d)} className="text-(--ink) no-underline">
                        {formatDay(d)}
                      </Link>
                    </h2>
                    <span className="sp-num text-[13px] leading-[18px] text-(--ink-muted)">
                      {shiftText(d)} · {list.length} lịch
                    </span>
                  </div>
                  {list.length > 0 ? (
                    <ul className="m-0 flex list-none flex-col gap-1 p-0">
                      {list.map((card) => (
                        <li
                          key={card.appt.id}
                          className="sp-panel flex-row! items-center gap-(--space-3)! px-3.5! py-2!"
                        >
                          <span className="sp-num w-11 flex-none text-[14px] font-semibold">
                            {card.time}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-[14px]">{card.title}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="m-0 text-[13px] text-(--ink-muted)">Không có lịch hẹn.</p>
                  )}
                </section>
              );
            })}
          </div>
        )}
        <p className="sp-panel__note">
          {staffSeesCustomerPhone
            ? 'Số điện thoại khách hiện theo cài đặt của cơ sở.'
            : 'Số điện thoại khách ẩn theo cài đặt của cơ sở. Cần liên hệ thì nhờ lễ tân.'}
        </p>
      </div>
    </div>
  );
}
