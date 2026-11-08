'use client';

import { Check, CircleAlert } from 'lucide-react';
import { useId, useMemo, useState } from 'react';
import { ConfirmDialog } from '@/components/sapio/confirm-dialog';
import { Field } from '@/components/sapio/form';
import type { Appointment, TenantFixture } from '@/mock/fixtures';
import { itemArrival, moveAppointment, validStarts } from '@/mock/move';
import { parseTime } from '@/mock/placement';
import { lookups } from '@/mock/reception';
import { minutesOf, localMinutes } from '@/mock/shifts';
import { formatDay, formatTime } from '@/mock/time';
import type { DragTarget } from './use-calendar-drag';

const hhmm = (minute: number) =>
  `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;

/**
 * "Dời giờ, đổi người": the way to move an appointment without a pointer (MH-27). The same check
 * as while carrying it, with the nearest times when the one typed does not work.
 */
export function MoveDialog({
  fixture,
  appt,
  date,
  now,
  onClose,
  onApply,
}: {
  fixture: TenantFixture;
  appt: Appointment;
  date: string;
  now: string;
  onClose: () => void;
  onApply: (target: DragTarget) => void;
}) {
  const uid = useId();
  const L = lookups(fixture);
  const day = localMinutes(date, '00:00');
  const current = minutesOf(itemArrival(appt, 0)) - day;
  const currentStaff = appt.items[0]?.staffResourceId ?? '';
  const [staffId, setStaffId] = useState(currentStaff);
  const [timeText, setTimeText] = useState(hhmm(current));
  const minute = parseTime(timeText);

  // People who can do every item.
  const serviceOf = (variantId: string) =>
    fixture.services.find((s) => s.variants.some((v) => v.id === variantId))?.id ?? '';
  const capable = fixture.staff.filter((s) =>
    appt.items.every((i) => s.skillServiceIds.includes(serviceOf(i.serviceVariantId))),
  );

  const result = useMemo(
    () =>
      minute === null
        ? null
        : moveAppointment({ fixture, appt, date, minute, staffResourceId: staffId, now }),
    [fixture, appt, date, minute, staffId, now],
  );
  const nearest = useMemo(() => {
    if (!result || result.ok || minute === null) return [];
    return validStarts({ fixture, appt, date, staffResourceId: staffId, now })
      .filter((m) => m !== minute)
      .sort((a, b) => Math.abs(a - minute) - Math.abs(b - minute) || a - b)
      .slice(0, 3)
      .sort((a, b) => a - b);
  }, [fixture, appt, date, staffId, now, result, minute]);

  const who = L.who(appt);
  const unchanged = staffId === currentStaff && minute === current;

  return (
    <ConfirmDialog
      open
      title={`Dời giờ, đổi người cho ${who.charAt(0).toLowerCase()}${who.slice(1)}`}
      body={`Lịch hiện ở ${formatTime(appt.startAt)}, ${L.name(currentStaff)}. ${formatDay(date)}.`}
      confirmLabel="Dời lịch"
      backLabel="Hủy"
      confirmDisabled={!result?.ok || unchanged}
      onClose={onClose}
      onConfirm={() => {
        if (!result?.ok || minute === null) return;
        onApply({
          columnId: staffId,
          minute,
          ok: true,
          moved: result.appt,
          resourcesBefore: result.resourcesBefore,
          resourcesAfter: result.resourcesAfter,
        });
      }}
    >
      <div className="grid grid-cols-2 gap-(--space-3)">
        <Field
          id={`${uid}-staff`}
          label={fixture.template.vocabulary.staff.replace(/^./, (c) => c.toUpperCase())}
        >
          <select id={`${uid}-staff`} value={staffId} onChange={(e) => setStaffId(e.target.value)}>
            {capable.map((s) => (
              <option key={s.resourceId} value={s.resourceId}>
                {s.profile.displayName}
              </option>
            ))}
          </select>
        </Field>
        <Field
          id={`${uid}-time`}
          label="Giờ bắt đầu"
          error={minute === null ? 'Giờ chưa đúng. Ví dụ: 14:05.' : undefined}
        >
          <input
            id={`${uid}-time`}
            inputMode="numeric"
            value={timeText}
            aria-invalid={minute === null ? true : undefined}
            onChange={(e) => setTimeText(e.target.value)}
          />
        </Field>
      </div>
      {result?.ok ? (
        <p className="sp-fit sp-fit--ok" role="status">
          <Check aria-hidden="true" />
          <span>
            {unchanged
              ? 'Giữ nguyên giờ và người.'
              : `Trống: ${L.name(staffId)}, ${result.resourcesAfter.join(', ')}.`}
          </span>
        </p>
      ) : result ? (
        <p className="sp-fit sp-fit--bad" role="status">
          <CircleAlert aria-hidden="true" />
          <span>{result.reason}</span>
        </p>
      ) : null}
      {nearest.length > 0 && (
        <div className="flex flex-col gap-(--space-2)">
          <span className="sp-field__label">Giờ gần nhất còn trống</span>
          <div className="sp-chips">
            {nearest.map((m) => (
              <button
                key={m}
                type="button"
                className="sp-chip"
                onClick={() => setTimeText(hhmm(m))}
              >
                {hhmm(m)} · {L.name(staffId)}
              </button>
            ))}
          </div>
        </div>
      )}
    </ConfirmDialog>
  );
}
