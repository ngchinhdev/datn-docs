'use client';

import { Plus, Trash2 } from 'lucide-react';
import { useId, useMemo, useState } from 'react';
import { Button } from '@/components/sapio/button';
import { Field } from '@/components/sapio/form';
import { SidePanel } from '@/components/sapio/side-panel';
import { Tip } from '@/components/sapio/tooltip';
import type { Appointment, LocalTime, Shift, TenantFixture } from '@/mock/fixtures';
import { openingHours } from '@/mock/hours';
import { affectedByShifts } from '@/mock/leave';
import { parseTime } from '@/mock/placement';
import { lookups } from '@/mock/reception';
import { localMinutes, minutesOfDay } from '@/mock/shifts';
import { addDays, formatDay, formatTime, weekdayOf } from '@/mock/time';

const MAX_BLOCKS = 3;
let blockKey = 0;

const hhmm = (minute: number) =>
  `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;

interface Draft {
  key: number;
  from: string;
  to: string;
}

/** One person on one date whose shift changes, with the appointments left outside it. */
export interface CellChange {
  resourceId: string;
  date: string;
  appointments: Appointment[];
  /** "Còn làm 10:00–15:00", or "Nghỉ cả ngày". */
  reason: string;
}

/**
 * The shifts of one person on one day, in the panel beside the grid (MH-38): several blocks,
 * "Áp cho mọi Thứ … từ nay", and a warning for the appointments a shorter shift leaves without
 * anyone (BR-35).
 */
export function ShiftPanel({
  fixture,
  current,
  appointments,
  resourceId,
  date,
  lastDate,
  onClose,
  onSave,
}: {
  fixture: TenantFixture;
  /** The shifts as they stand, with any copy not yet saved. */
  current: Shift[];
  appointments: Appointment[];
  resourceId: string;
  date: string;
  /** The last date that has a rota; "mọi Thứ từ nay" runs up to it. */
  lastDate: string;
  onClose: () => void;
  onSave: (next: Shift[], changes: CellChange[]) => void;
}) {
  const uid = useId();
  const L = lookups(fixture);
  const person = fixture.staff.find((s) => s.resourceId === resourceId);
  const name = person?.profile.displayName ?? '';
  const weekday = formatDay(date).split(',')[0] ?? '';

  const own = useMemo(
    () =>
      current
        .filter((s) => s.resourceId === resourceId && s.date === date)
        .sort((a, b) => a.start.localeCompare(b.start))
        .map((s): Draft => ({ key: ++blockKey, from: s.start, to: s.end })),
    // The panel starts from the saved blocks of the cell it opened on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [resourceId, date],
  );
  const [blocks, setBlocks] = useState<Draft[]>(own);
  const [everyWeek, setEveryWeek] = useState(false);
  const patch = (key: number, change: Partial<Draft>) =>
    setBlocks((list) => list.map((b) => (b.key === key ? { ...b, ...change } : b)));

  // ---- Validation ----
  const parsed = blocks.map((b) => ({ b, from: parseTime(b.from), to: parseTime(b.to) }));
  const sorted = [...parsed].sort((a, b) => (a.from ?? 0) - (b.from ?? 0));
  let error: string | undefined;
  if (parsed.some((p) => p.from === null || p.to === null || p.from >= p.to)) {
    error = 'Nhập giờ bắt đầu trước giờ kết thúc. Ví dụ: 10:00 đến 15:00.';
  } else if (sorted.some((p, i) => i > 0 && (p.from ?? 0) < (sorted[i - 1]!.to ?? 0))) {
    error = 'Các khung giờ trong ngày không được chồng nhau.';
  }
  const valid = !error;
  const newBlocks = sorted.map((p) => ({ from: hhmm(p.from ?? 0), to: hhmm(p.to ?? 0) }));

  // ---- Dates the change covers ----
  const dates = useMemo(() => {
    const out = [date];
    if (everyWeek) {
      for (let d = addDays(date, 7); d <= lastDate; d = addDays(d, 7)) {
        if (weekdayOf(d) === weekdayOf(date)) out.push(d);
      }
    }
    return out;
  }, [date, everyWeek, lastDate]);

  // ---- The shifts after the change, and what it leaves outside ----
  const next = useMemo(() => {
    const kept = current.filter((s) => !(s.resourceId === resourceId && dates.includes(s.date)));
    return [
      ...kept,
      ...dates.flatMap((d) =>
        newBlocks.map((b): Shift => ({
          resourceId,
          date: d,
          start: b.from as LocalTime,
          end: b.to as LocalTime,
        })),
      ),
    ];
    // `newBlocks` follows `blocks`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, resourceId, dates, JSON.stringify(newBlocks)]);

  const changes: CellChange[] = useMemo(
    () =>
      valid
        ? dates.map((d) => {
            const open = openingHours(fixture, d);
            return {
              resourceId,
              date: d,
              appointments: open
                ? affectedByShifts({
                    appointments,
                    shiftsAfter: next,
                    resourceId,
                    date: d,
                    open: [[localMinutes(d, open.open), localMinutes(d, open.close)]],
                  })
                : [],
              reason:
                newBlocks.length > 0
                  ? `Còn làm ${newBlocks.map((b) => `${b.from}–${b.to}`).join(', ')}`
                  : 'Nghỉ cả ngày',
            };
          })
        : [],
    [valid, dates, fixture, resourceId, appointments, next, newBlocks],
  );
  const affected = changes.flatMap((c) => c.appointments.map((appt) => ({ date: c.date, appt })));
  const lastEnd = newBlocks.at(-1)?.to;
  const allAfterEnd =
    lastEnd !== undefined &&
    affected.every(({ appt }) => minutesOfDay(formatTime(appt.startAt)) >= minutesOfDay(lastEnd));

  return (
    <SidePanel
      title={`${name} · ${formatDay(date).replace(',', '')}`}
      onClose={onClose}
      className="min-[1200px]:basis-80! min-[1200px]:max-w-80!"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Hủy
          </Button>
          <Button variant="primary" disabled={!valid} onClick={() => onSave(next, changes)}>
            {affected.length > 0 ? `Lưu và xếp lại ${affected.length} lịch` : 'Lưu'}
          </Button>
        </>
      }
    >
      {blocks.map((block, i) => (
        <div key={block.key} className="flex items-end gap-(--space-2)">
          <div className="w-[110px]">
            <Field id={`${uid}-a${i}`} label="Từ">
              <input
                id={`${uid}-a${i}`}
                inputMode="numeric"
                value={block.from}
                aria-invalid={error ? true : undefined}
                onChange={(e) => patch(block.key, { from: e.target.value })}
              />
            </Field>
          </div>
          <div className="w-[110px]">
            <Field id={`${uid}-b${i}`} label="Đến">
              <input
                id={`${uid}-b${i}`}
                inputMode="numeric"
                value={block.to}
                aria-invalid={error ? true : undefined}
                onChange={(e) => patch(block.key, { to: e.target.value })}
              />
            </Field>
          </div>
          <Tip label="Xóa khung này">
            <button
              type="button"
              className="sp-icon-btn mb-0.5"
              aria-label="Xóa khung này"
              onClick={() => setBlocks((list) => list.filter((b) => b.key !== block.key))}
            >
              <Trash2 size={16} aria-hidden="true" />
            </button>
          </Tip>
        </div>
      ))}
      {blocks.length === 0 && <p className="sp-panel__note">Nghỉ cả ngày. Thêm khung để xếp ca.</p>}
      {error && (
        <p className="sp-field__help m-0" role="alert" style={{ color: 'var(--danger)' }}>
          {error}
        </p>
      )}
      {blocks.length < MAX_BLOCKS && (
        <Button
          variant="ghost"
          size="sm"
          className="self-start"
          onClick={() =>
            setBlocks((list) => [...list, { key: ++blockKey, from: '09:00', to: '12:00' }])
          }
        >
          <Plus size={16} aria-hidden="true" />
          Thêm khung trong ngày
        </Button>
      )}
      {affected.length > 0 && (
        <>
          <div className="sp-banner sp-banner--warning rounded-(--radius-md)!" role="alert">
            <span className="sp-banner__text">
              <strong>
                {affected.length} lịch của {name} {allAfterEnd ? `sau ${lastEnd}` : 'ngoài ca mới'}{' '}
                sẽ không còn người làm:
              </strong>
              {affected.map(({ date: d, appt }) => (
                <span key={appt.id} className="sp-num block">
                  {dates.length > 1 ? `${formatDay(d).slice(-5)} ` : ''}
                  {formatTime(appt.startAt)} {L.who(appt)} ·{' '}
                  {appt.items.map((i) => L.variant(i.serviceVariantId)?.shortName ?? '').join(', ')}{' '}
                  ·{' '}
                  {appt.items.some((i) => i.staffChoice === 'chosen')
                    ? `chọn ${name}`
                    : 'Bất kỳ ai'}
                </span>
              ))}
            </span>
          </div>
          <p className="sp-panel__note">
            Lưu ca này thì {affected.length === 1 ? 'lịch' : `${affected.length} lịch`} trên chuyển
            sang danh sách &quot;Cần xếp lại&quot;, xử lý như nghỉ phép (BR-35).
          </p>
        </>
      )}
      <label className="sp-check">
        <input
          type="checkbox"
          checked={everyWeek}
          onChange={(e) => setEveryWeek(e.target.checked)}
        />
        <span>Áp cho mọi {weekday} từ nay</span>
      </label>
    </SidePanel>
  );
}
