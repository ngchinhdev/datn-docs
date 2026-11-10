'use client';

import { ChevronLeft, ChevronRight, Copy } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { useScheduleStore } from '@/components/mock/schedule-store';
import { useAppHref } from '@/components/mock/use-app-href';
import { useLiveFixture } from '@/components/mock/use-live-fixture';
import { useQueryState } from '@/components/mock/use-query-state';
import { Button } from '@/components/sapio/button';
import {
  ShiftGrid,
  type ShiftCellData,
  type ShiftColumnData,
  type ShiftFooterCell,
  type ShiftRowData,
} from '@/components/sapio/shift-grid';
import { Tip } from '@/components/sapio/tooltip';
import { useToast } from '@/components/sapio/toast';
import { useMockNow } from '@/components/sapio/use-mock-now';
import type { Requeue, Shift } from '@/mock/fixtures';
import { openingHours } from '@/mock/hours';
import { affectedByShifts } from '@/mock/leave';
import { normalize, subtract, union, type Interval } from '@/mock/intervals';
import {
  hasRota,
  localMinutes,
  localTimeOf,
  shiftsOf,
  staffWindows,
  weekHours,
} from '@/mock/shifts';
import { addDays, dayOfMonth, formatDay, weekdayShort } from '@/mock/time';
import { ShiftPanel, type CellChange } from './shift-panel';

/** The first week that has a rota; the 9th is the Monday of the sample week. */
const FIRST_WEEK = '2026-11-09';
const WEEKS = 4;

let requeueSequence = 0;

const hoursText = (hours: number) => `${String(hours).replace('.', ',')} giờ/tuần`;

/** Xếp ca (MH-38): the week's shifts, one panel to edit a day, copy of last week, uncovered hours. */
export function ShiftsScreen({ tenantSlug }: { tenantSlug: string }) {
  const fixture = useLiveFixture(tenantSlug);
  const { appointments, shifts, setShifts, requeues, addRequeues, removeRequeue } =
    useScheduleStore();
  const appHref = useAppHref(tenantSlug);
  const toast = useToast();
  const now = useMockNow();
  const branch = fixture.branches[0]!;
  const [weekStart, setWeekStart] = useQueryState('week', FIRST_WEEK);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const lastWeek = addDays(FIRST_WEEK, 7 * (WEEKS - 1));
  const range = `${formatDay(days[0]!).slice(-5)}–${formatDay(days[6]!).slice(-5)}`;

  /** A copy of last week that is not saved yet. */
  const [draft, setDraft] = useState<{ week: string; shifts: Shift[] } | null>(null);
  const current = draft && draft.week === weekStart ? draft.shifts : shifts;
  const [selected, setSelected] = useState<{ rowId: string; date: string } | null>(null);

  const goTo = (week: string) => {
    setSelected(null);
    setWeekStart(week);
  };

  // ---- The grid ----
  const columns: ShiftColumnData[] = days.map((date) => ({
    date,
    short: weekdayShort(date),
    label: `${dayOfMonth(date)}/${date.slice(5, 7)}`,
    long: formatDay(date),
  }));

  const leaveOn = (id: string, date: string) =>
    fixture.staffTimeOff.find(
      (t) => t.resourceId === id && t.date === date && t.status !== 'rejected',
    );

  const rows: ShiftRowData[] = fixture.staff.map((member) => {
    const id = member.resourceId;
    return {
      id,
      name: member.profile.displayName,
      title: member.profile.title,
      hours: hoursText(weekHours(current, id, days)),
      cells: days.map((date): ShiftCellData => {
        const open = openingHours(fixture, date);
        if (!open) return { date, blocks: [], fixed: 'Đóng cửa' };
        if (!hasRota(current, date)) return { date, blocks: [], fixed: 'Giờ mở cửa' };
        const leave = leaveOn(id, date);
        const waiting = requeues.some((r) => r.resourceId === id && r.date === date);
        const blocks = shiftsOf(current, id, date).map((s) => ({
          text: `${s.start}–${s.end}`,
          ...(waiting ? { warn: true, count: '!' } : {}),
        }));
        if (leave && !leave.from)
          return { date, blocks, leave: { status: leave.status as 'pending' | 'approved' } };
        return {
          date,
          blocks,
          ...(leave?.from && leave.to ? { partialLeave: `Nghỉ ${leave.from}–${leave.to}` } : {}),
        };
      }),
    };
  });

  // Hours that are open and have nobody on shift.
  const footer: ShiftFooterCell[] = days.map((date) => {
    const open = openingHours(fixture, date);
    if (!open) return { text: 'Đóng cửa' };
    const window: Interval = [localMinutes(date, open.open), localMinutes(date, open.close)];
    if (!hasRota(current, date)) return { text: `${open.open}–${open.close}` };
    const covered = fixture.staff.reduce<Interval[]>(
      (all, member) =>
        union(
          all,
          staffWindows({
            shifts: current,
            timeOff: fixture.staffTimeOff.filter((t) => t.status === 'approved'),
            resourceId: member.resourceId,
            date,
            open: [window],
          }),
        ),
      [],
    );
    const gaps = subtract(normalize([window]), covered);
    return {
      text: `${open.open}–${open.close}`,
      warnings: gaps.map(([a, b]) => `${localTimeOf(a)}–${localTimeOf(b)} không ai trực`),
    };
  });

  // ---- Saving ----
  function makeRequeues(changes: CellChange[]) {
    const made: Requeue[] = [];
    for (const change of changes) {
      // A new decision about the same day replaces the old entry.
      for (const old of requeues) {
        if (old.resourceId === change.resourceId && old.date === change.date) removeRequeue(old.id);
      }
      if (change.appointments.length === 0) continue;
      requeueSequence += 1;
      made.push({
        id: `${fixture.tenant.id}-rq-${requeueSequence}`,
        resourceId: change.resourceId,
        date: change.date,
        reason: change.reason,
        createdAt: now,
        appointmentIds: change.appointments.map((a) => a.id),
        handling: {},
      });
    }
    addRequeues(made);
    return made.reduce((sum, r) => sum + r.appointmentIds.length, 0);
  }

  function savePanel(next: Shift[], changes: CellChange[]) {
    setShifts(next);
    setDraft(null);
    setSelected(null);
    const waiting = makeRequeues(changes);
    toast({
      text: `Đã lưu ca.${waiting > 0 ? ` ${waiting} lịch vào danh sách "Cần xếp lại".` : ''}`,
    });
  }

  function saveWeek() {
    if (!draft) return;
    const changes: CellChange[] = [];
    for (const member of fixture.staff) {
      for (const date of days) {
        const open = openingHours(fixture, date);
        if (!open) continue;
        const affected = affectedByShifts({
          appointments,
          shiftsAfter: draft.shifts,
          resourceId: member.resourceId,
          date,
          open: [[localMinutes(date, open.open), localMinutes(date, open.close)]],
        });
        if (affected.length > 0) {
          changes.push({
            resourceId: member.resourceId,
            date,
            appointments: affected,
            reason: 'Ca tuần mới',
          });
        }
      }
    }
    setShifts(draft.shifts);
    setDraft(null);
    const waiting = makeRequeues(changes);
    toast({
      text: `Đã lưu ca tuần ${range}.${waiting > 0 ? ` ${waiting} lịch vào danh sách "Cần xếp lại".` : ''}`,
    });
  }

  function copyLastWeek() {
    const previous = days.map((d) => addDays(d, -7));
    const source = shifts.filter((s) => previous.includes(s.date));
    if (source.length === 0) {
      toast({
        text: `Tuần ${formatDay(previous[0]!).slice(-5)}–${formatDay(previous[6]!).slice(-5)} chưa xếp ca nên chưa có gì để chép.`,
      });
      return;
    }
    const copied = source
      .map((s) => ({ ...s, date: addDays(s.date, 7) }))
      .filter((s) => openingHours(fixture, s.date));
    setDraft({
      week: weekStart,
      shifts: [...shifts.filter((s) => !days.includes(s.date)), ...copied],
    });
    toast({ text: 'Đã chép ca tuần trước. Bấm "Lưu ca tuần" để áp dụng.' });
  }

  const lastRotaDate = shifts.reduce((last, s) => (s.date > last ? s.date : last), FIRST_WEEK);
  const waitingCount = requeues.reduce((sum, r) => sum + r.appointmentIds.length, 0);

  return (
    <div className="sp-shell__content sp-shell__content--wide">
      <div className="sp-page-head items-center">
        <div className="flex flex-wrap items-center gap-(--space-2)">
          <h1 className="sp-page-head__title me-(--space-2)">Xếp ca</h1>
          <Tip label="Tuần trước" enabled={weekStart > FIRST_WEEK}>
            <button
              type="button"
              className="sp-icon-btn"
              aria-label="Tuần trước"
              disabled={weekStart <= FIRST_WEEK}
              onClick={() => goTo(addDays(weekStart, -7))}
            >
              <ChevronLeft size={18} aria-hidden="true" />
            </button>
          </Tip>
          <span className="sp-num text-[15px] leading-[22px] font-semibold">Tuần {range}</span>
          <Tip label="Tuần sau" enabled={weekStart < lastWeek}>
            <button
              type="button"
              className="sp-icon-btn"
              aria-label="Tuần sau"
              disabled={weekStart >= lastWeek}
              onClick={() => goTo(addDays(weekStart, 7))}
            >
              <ChevronRight size={18} aria-hidden="true" />
            </button>
          </Tip>
        </div>
        <div className="sp-page-head__actions">
          <Button onClick={copyLastWeek}>
            <Copy size={16} aria-hidden="true" />
            Chép tuần trước
          </Button>
          <Button
            variant="primary"
            disabled={!draft || draft.week !== weekStart}
            onClick={saveWeek}
          >
            Lưu ca tuần
          </Button>
        </div>
      </div>
      <p className="sp-page-head__sub m-0">
        {branch.name}. Bấm một ô để sửa; một ngày có thể có nhiều khung. Ca có thể bắt đầu trước giờ
        mở cửa để chuẩn bị (BR-54).
      </p>
      {waitingCount > 0 && (
        <div className="sp-banner sp-banner--warning rounded-(--radius-md)!" role="status">
          <span className="sp-banner__text">
            <strong>{waitingCount} lịch cần xếp lại</strong> sau khi bớt ca.
          </span>
          <Link
            href={appHref('time-off')}
            className="sp-btn sp-btn--primary sp-btn--sm no-underline"
          >
            Xử lý
          </Link>
        </div>
      )}
      <div className="flex items-start gap-(--space-5)">
        <section className="min-w-0 flex-auto" aria-label="Lưới ca">
          <div className="max-md:hidden">
            <ShiftGrid
              label={`Ca tuần ${range}`}
              columns={columns}
              rows={rows}
              footer={footer}
              selected={selected}
              onSelect={(rowId, date) => setSelected({ rowId, date })}
            />
          </div>
          {/* Phones: the same cells as a list by day, since a grid would scroll sideways. */}
          <div className="flex flex-col gap-(--space-4) md:hidden">
            {columns.map((column, c) => (
              <section key={column.date} aria-labelledby={`sg-${column.date}`}>
                <h2
                  id={`sg-${column.date}`}
                  className="m-0 mb-1.5 text-[15px] leading-[22px] font-semibold"
                >
                  {column.long}
                  <span className="sp-num ms-2 text-[13px] font-normal text-(--ink-muted)">
                    {footer[c]?.text}
                  </span>
                </h2>
                <ul className="sp-cards">
                  {rows.map((row) => {
                    const cell = row.cells[c]!;
                    const text =
                      cell.fixed ??
                      (cell.leave
                        ? 'Nghỉ phép'
                        : cell.blocks.length
                          ? cell.blocks.map((b) => b.text).join(', ')
                          : 'Nghỉ');
                    return (
                      <li key={row.id}>
                        <button
                          type="button"
                          className="sp-cards__item w-full text-left"
                          disabled={Boolean(cell.fixed)}
                          onClick={() => setSelected({ rowId: row.id, date: column.date })}
                        >
                          <span className="sp-cards__body">
                            <span className="sp-cards__title">{row.name}</span>
                            <span className="sp-cards__meta sp-num">{text}</span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        </section>
        {selected && (
          <ShiftPanel
            key={`${selected.rowId}|${selected.date}`}
            fixture={fixture}
            current={current}
            appointments={appointments}
            resourceId={selected.rowId}
            date={selected.date}
            lastDate={lastRotaDate}
            onClose={() => setSelected(null)}
            onSave={savePanel}
          />
        )}
      </div>
    </div>
  );
}
