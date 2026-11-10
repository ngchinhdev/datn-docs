'use client';

import { useId, useState, type FormEvent } from 'react';
import { useScheduleStore } from '@/components/mock/schedule-store';
import { useLiveFixture } from '@/components/mock/use-live-fixture';
import { useTechnician } from '@/components/mock/use-technician';
import { Button } from '@/components/sapio/button';
import { DateStrip } from '@/components/sapio/date-strip';
import { Field } from '@/components/sapio/form';
import { useToast } from '@/components/sapio/toast';
import { useMockNow } from '@/components/sapio/use-mock-now';
import type { LocalTime, StaffTimeOff } from '@/mock/fixtures';
import { openingHours } from '@/mock/hours';
import { affectedByLeave, windowText } from '@/mock/leave';
import { parseTime } from '@/mock/placement';
import { lookups } from '@/mock/reception';
import { addDays, formatDay, formatTime, localDate, MOCK_NOW, weekdayShort } from '@/mock/time';

/** Ids of what the session creates; the mock has no server to number them. */
let sequence = 0;

const hhmm = (minute: number) =>
  `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;

const STATUS = {
  pending: ['sp-badge--pending', 'Chờ duyệt'],
  approved: ['sp-badge--confirmed', 'Đã duyệt'],
  rejected: ['sp-badge--cancelled', 'Từ chối'],
} as const;

/** Xin nghỉ (MH-36): days, whole day or a few hours, a reason, and the appointments it touches. */
export function MyTimeOffScreen({ tenantSlug }: { tenantSlug: string }) {
  const uid = useId();
  const fixture = useLiveFixture(tenantSlug);
  const me = useTechnician();
  const { appointments, addLeaves, leaves } = useScheduleStore();
  const toast = useToast();
  const now = useMockNow();
  const L = lookups(fixture);
  const today = localDate(MOCK_NOW);
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i));
  const name = me.profile.displayName;

  // First press is the first day, the second the last; a third starts again.
  const [first, setFirst] = useState<string | null>(null);
  const [last, setLast] = useState<string | null>(null);
  const [fewHours, setFewHours] = useState(false);
  const [fromText, setFromText] = useState('14:00');
  const [toText, setToText] = useState('17:00');
  const [reason, setReason] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const pressDate = (date: string) => {
    if (first && !last) {
      if (date === first) setFirst(null);
      else {
        setFirst(date < first ? date : first);
        setLast(date < first ? first : date);
      }
    } else {
      setFirst(date);
      setLast(null);
    }
  };
  const chosen = first ? days.filter((d) => d >= first && d <= (last ?? first)) : [];

  const fromMinute = parseTime(fromText);
  const toMinute = parseTime(toText);
  const hoursError =
    fewHours && (fromMinute === null || toMinute === null || fromMinute >= toMinute)
      ? 'Nhập giờ bắt đầu trước giờ kết thúc. Ví dụ: 14:00 đến 17:00.'
      : undefined;
  const reasonError = reason.trim() ? undefined : 'Nhập lý do nghỉ.';
  const mine = leaves.filter((l) => l.resourceId === me.resourceId);
  const clash = chosen.find((d) => mine.some((l) => l.date === d && l.status !== 'rejected'));
  const dateError =
    chosen.length === 0
      ? 'Chọn ngày nghỉ.'
      : clash
        ? `Bạn đã có đơn nghỉ ${formatDay(clash)}.`
        : undefined;

  const hours =
    fewHours && fromMinute !== null && toMinute !== null
      ? { from: hhmm(fromMinute) as LocalTime, to: hhmm(toMinute) as LocalTime }
      : {};
  const affected = chosen.flatMap((date) =>
    affectedByLeave(appointments, { resourceId: me.resourceId, date, ...hours }).map((appt) => ({
      date,
      appt,
    })),
  );

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (dateError || reasonError || hoursError) return;
    sequence += 1;
    const sent: StaffTimeOff[] = chosen.map((date, i) => ({
      id: `${fixture.tenant.id}-lv-new${sequence}-${i}`,
      resourceId: me.resourceId,
      date,
      ...hours,
      reason: reason.trim(),
      status: 'pending',
      sentAt: now,
    }));
    addLeaves(sent);
    toast({
      text: `Đã gửi đơn nghỉ ${chosen.length === 1 ? formatDay(chosen[0]!) : `${chosen.length} ngày`}. Quản lý sẽ xử lý các lịch bị ảnh hưởng.`,
    });
    setFirst(null);
    setLast(null);
    setReason('');
    setSubmitted(false);
  }

  return (
    <div className="sp-shell__content">
      <form
        noValidate
        onSubmit={onSubmit}
        className="mx-auto flex w-full max-w-[640px] flex-col gap-(--space-4)"
      >
        <div>
          <h1 className="sp-page-head__title">Xin nghỉ</h1>
          <p className="sp-page-head__sub">
            {name} · quản lý duyệt sau khi xử lý xong lịch của bạn
          </p>
        </div>

        <fieldset className="m-0 flex flex-col gap-(--space-2) border-0 p-0">
          <legend className="sp-field__label pb-1.5">Ngày nghỉ</legend>
          <DateStrip
            dates={days.map((d) => ({ date: d, closed: !openingHours(fixture, d) }))}
            selected={chosen}
            onSelect={pressDate}
          />
          <span
            className="sp-field__help"
            style={submitted && dateError ? { color: 'var(--danger)' } : undefined}
          >
            {submitted && dateError ? dateError : 'Nghỉ nhiều ngày: chọn ngày đầu rồi ngày cuối.'}
          </span>
        </fieldset>

        <div className="sp-segmented sp-segmented--block" role="group" aria-label="Thời gian nghỉ">
          {(
            [
              [false, 'Cả ngày'],
              [true, 'Vài giờ'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={label}
              type="button"
              className="sp-segmented__item"
              aria-pressed={fewHours === value}
              onClick={() => setFewHours(value)}
            >
              {label}
            </button>
          ))}
        </div>
        {fewHours && (
          <div className="grid grid-cols-2 gap-(--space-3)">
            <Field id={`${uid}-from`} label="Từ" error={submitted ? hoursError : undefined}>
              <input
                id={`${uid}-from`}
                inputMode="numeric"
                value={fromText}
                aria-invalid={submitted && hoursError ? true : undefined}
                onChange={(e) => setFromText(e.target.value)}
              />
            </Field>
            <Field id={`${uid}-to`} label="Đến">
              <input
                id={`${uid}-to`}
                inputMode="numeric"
                value={toText}
                onChange={(e) => setToText(e.target.value)}
              />
            </Field>
          </div>
        )}

        <Field
          id={`${uid}-reason`}
          label="Lý do"
          size="md"
          area
          help="Quản lý và chủ cơ sở thấy lý do; khách không thấy."
          error={submitted ? reasonError : undefined}
        >
          <textarea
            id={`${uid}-reason`}
            rows={2}
            value={reason}
            aria-invalid={submitted && reasonError ? true : undefined}
            onChange={(e) => setReason(e.target.value)}
          />
        </Field>

        {chosen.length > 0 && (
          <section className="sp-panel" aria-labelledby={`${uid}-aff`}>
            <h2 className="sp-panel__title" id={`${uid}-aff`}>
              {affected.length > 0
                ? `${affected.length} lịch của bạn trong ${chosen.length === 1 ? 'ngày' : 'những ngày'} này`
                : 'Không có lịch nào bị ảnh hưởng'}
            </h2>
            <p className="sp-panel__note">
              Quản lý sẽ đổi người hoặc hỏi ý khách trước khi duyệt (BR-11). Bạn không cần tự báo
              khách.
            </p>
            {affected.length > 0 && (
              <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-sm leading-5">
                {affected.map(({ date, appt }) => (
                  <li key={appt.id} className="sp-num">
                    {chosen.length > 1
                      ? `${weekdayShort(date)} ${date.slice(8)}/${date.slice(5, 7)} · `
                      : ''}
                    {formatTime(appt.startAt)} · {L.who(appt)} ·{' '}
                    {appt.items
                      .map((i) => L.variant(i.serviceVariantId)?.shortName ?? '')
                      .join(', ')}{' '}
                    {appt.items.some(
                      (i) => i.staffResourceId === me.resourceId && i.staffChoice === 'chosen',
                    ) && <span className="sp-badge sp-badge--pending">Chọn bạn</span>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        <Button type="submit" variant="primary" block className="h-12!">
          Gửi đơn
        </Button>

        {mine.length > 0 && (
          <section className="flex flex-col gap-(--space-2)" aria-labelledby={`${uid}-mine`}>
            <h2 id={`${uid}-mine`} className="m-0 text-[15px] leading-[22px] font-semibold">
              Đơn của bạn
            </h2>
            <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
              {[...mine]
                .sort((a, b) => b.date.localeCompare(a.date))
                .slice(0, 5)
                .map((l) => (
                  <li
                    key={l.id}
                    className="sp-panel flex-row! items-center justify-between gap-(--space-3)! px-3.5! py-2.5!"
                  >
                    <span className="sp-num text-sm leading-5">
                      {formatDay(l.date)}, {windowText(l)}
                      <span className="block text-[13px] text-(--ink-muted)">{l.reason}</span>
                    </span>
                    <span className={`sp-badge ${STATUS[l.status][0]}`}>{STATUS[l.status][1]}</span>
                  </li>
                ))}
            </ul>
          </section>
        )}
      </form>
    </div>
  );
}
