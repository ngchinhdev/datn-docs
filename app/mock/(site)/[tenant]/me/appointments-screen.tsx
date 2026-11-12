'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useBookingDraft } from '@/components/mock/booking-draft';
import { useCustomerSession } from '@/components/mock/customer-session';
import { useScheduleStore } from '@/components/mock/schedule-store';
import { Button } from '@/components/sapio/button';
import { StatusBadge } from '@/components/sapio/status-badge';
import { formatPhone, formatVnd } from '@/mock/format';
import { heldItems, modeOf, openQuestion, rebookChoice } from '@/mock/reschedule';
import { fixtureBySlug } from '@/mock/selection';
import type { Appointment } from '@/mock/fixtures';
import { formatDay, formatTime, localDate, MOCK_NOW } from '@/mock/time';

const UPCOMING: Appointment['status'][] = ['confirmed', 'checked_in'];

/** MH-17: the bookings of the logged-in customer, upcoming first. */
export function AppointmentsScreen({ tenantSlug }: { tenantSlug: string }) {
  const fixture = fixtureBySlug(tenantSlug)!;
  const store = useScheduleStore();
  const router = useRouter();
  const { setSeed } = useBookingDraft();
  const { customer, customerId } = useCustomerSession();
  const asksSubject = fixture.template.vocabulary.subject !== null;

  const mine = store.appointments.filter((a) => customerId !== null && a.customerId === customerId);
  const upcoming = mine
    .filter((a) => UPCOMING.includes(a.status) && a.startAt >= MOCK_NOW)
    .sort((a, b) => a.startAt.localeCompare(b.startAt));
  const past = mine
    .filter((a) => !upcoming.includes(a) && a.status !== 'held')
    .sort((a, b) => b.startAt.localeCompare(a.startAt));

  const nameOf = (id: string) => fixture.resources.find((r) => r.id === id)?.name ?? '';

  function row(appt: Appointment, kind: 'upcoming' | 'past') {
    const named = asksSubject || modeOf(appt) === 'group';
    const items = heldItems(fixture, appt, store.servedSubjects, named);
    const last = appt.bookings.reduce(
      (m, b) => (b.endAt > m && b.kind !== 'cleanup' ? b.endAt : m),
      appt.startAt,
    );
    const asked =
      kind === 'upcoming' && openQuestion(appt.id, store.leaves, store.requeues) !== null;
    const people = [
      ...new Set(
        items.map((it) => (it.staffChoice === 'any' ? 'Bất kỳ ai' : nameOf(it.staffChoice))),
      ),
    ];
    const money =
      kind === 'upcoming'
        ? appt.depositVnd
          ? `đã cọc ${formatVnd(appt.depositVnd)}`
          : ''
        : appt.status === 'completed'
          ? formatVnd(items.reduce((m, it) => m + it.priceVnd, 0n))
          : '';
    return (
      <li
        key={appt.id}
        className="flex flex-col gap-(--space-2) rounded-(--radius-lg) bg-(--surface-raised) p-(--space-4) shadow-[0_0_0_1px_var(--line)]"
      >
        <Link
          href={`/mock/${tenantSlug}/me/appointments/${appt.id}`}
          className="flex flex-col gap-(--space-1) text-(--ink) no-underline"
        >
          <span className="flex flex-wrap items-center justify-between gap-(--space-2)">
            <span className="body sp-num font-semibold">
              {formatDay(localDate(appt.startAt))} · {formatTime(appt.startAt)}
              {kind === 'upcoming' && `–${formatTime(last)}`}
            </span>
            {asked ? (
              <StatusBadge status="held" label="Cần bạn trả lời" />
            ) : (
              <StatusBadge status={appt.status} />
            )}
          </span>
          <span className="body">
            {items
              .map((it) => (it.label ? `${it.label} · ${it.service.name}` : it.service.name))
              .join(', ')}
          </span>
          <span className="body-sm text-(--ink-muted)">
            {[people.join(', '), money].filter(Boolean).join(' · ')}
          </span>
        </Link>
        {asked && (
          <Link
            href={`/mock/${tenantSlug}/me/appointments/${appt.id}`}
            className="sp-btn sp-btn--accent no-underline"
          >
            Xem đề nghị đổi {fixture.template.vocabulary.staff.toLowerCase()}
          </Link>
        )}
        {kind === 'past' && appt.status === 'completed' && (
          <Button
            variant="secondary"
            size="sm"
            className="self-start"
            onClick={() => {
              setSeed({
                tenantSlug,
                state: {
                  ...rebookChoice(fixture, appt, store.servedSubjects),
                  drafts: [],
                  date: localDate(MOCK_NOW),
                  name: customer?.name ?? '',
                  phone: customer?.phone ? formatPhone(customer.phone) : '',
                  email: customer?.email ?? '',
                  slot: null,
                  holdExpiresAt: null,
                },
              });
              router.push(`/mock/${tenantSlug}/book?step=datetime&lai=1`);
            }}
          >
            Đặt lại
          </Button>
        )}
      </li>
    );
  }

  if (mine.length === 0) {
    return (
      <div className="sp-empty flex flex-col gap-(--space-2)">
        <h1 className="title m-0">Chưa có lịch nào</h1>
        <p className="m-0">Lịch bạn đặt ở {fixture.tenant.name} sẽ hiện ở đây.</p>
        <Link href={`/mock/${tenantSlug}/book`} className="sp-btn sp-btn--accent no-underline">
          Đặt lịch
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-(--space-5)">
      <h1 className="title m-0">Lịch hẹn</h1>
      <section aria-labelledby="upcoming" className="flex flex-col gap-(--space-3)">
        <h2 id="upcoming" className="heading m-0">
          Sắp tới
        </h2>
        {upcoming.length > 0 ? (
          <ul className="m-0 flex list-none flex-col gap-(--space-3) p-0">
            {upcoming.map((a) => row(a, 'upcoming'))}
          </ul>
        ) : (
          <p className="body-sm m-0 text-(--ink-muted)">Chưa có lịch sắp tới.</p>
        )}
      </section>
      {past.length > 0 && (
        <section aria-labelledby="past" className="flex flex-col gap-(--space-3)">
          <h2 id="past" className="heading m-0">
            Đã qua
          </h2>
          <ul className="m-0 flex list-none flex-col gap-(--space-3) p-0">
            {past.map((a) => row(a, 'past'))}
          </ul>
        </section>
      )}
    </div>
  );
}
