'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import type { CalendarDropZone } from '@/components/sapio/resource-calendar';
import type { Appointment, TenantFixture } from '@/mock/fixtures';
import { blockExtent, itemArrival, moveAppointment, staffOf, validStarts } from '@/mock/move';
import { isoOf, localMinutes, minutesOf } from '@/mock/shifts';

const SLOT = 15;
/** A mouse starts carrying after this many pixels; a finger after a long press. */
const MOUSE_SLOP = 4;
const TOUCH_SLOP = 8;
const LONG_PRESS_MS = 380;

export interface DragTarget {
  columnId: string;
  /** Minutes since midnight: when the customer would arrive. */
  minute: number;
  ok: boolean;
  /** Why the block cannot go there. */
  reason?: string;
  /** The appointment as it would be, when `ok`. */
  moved?: Appointment;
  resourcesBefore: string[];
  resourcesAfter: string[];
}

export interface ActiveDrag {
  apptId: string;
  /** Pointer position, for the label. */
  x: number;
  y: number;
  target: DragTarget | null;
}

interface Session {
  apptId: string;
  pointerType: string;
  startX: number;
  startY: number;
  started: boolean;
  timer: number | undefined;
  /** Where each column is, taken when carrying starts. */
  columns: { id: string; left: number; right: number }[];
  slotPx: number;
  /** Minutes since midnight at which the customer arrives now. */
  oldMinute: number;
  last: ActiveDrag;
  lastKey: string;
}

/** Can this appointment be picked up? One person does all of it, and it has not started. */
export const isDraggable = (appt: Appointment) =>
  appt.status === 'confirmed' && staffOf(appt).length === 1;

/**
 * Carrying a block of the staff calendar (MH-27): mouse after a few pixels, finger after a long
 * press. While carried, each column shows where the block may land, computed with findSlots with
 * the appointment itself left out; Escape drops nothing.
 */
export function useCalendarDrag(args: {
  enabled: boolean;
  fixture: TenantFixture;
  /** Local date of the calendar. */
  date: string;
  now: string;
  /** Visible range of the calendar, local `HH:mm`. */
  from: string;
  to: string;
  /** Called with the appointment and where it was dropped, when that place is valid. */
  onDrop: (appt: Appointment, target: DragTarget) => void;
  /** Dropped where it cannot go. */
  onRejected: (reason: string) => void;
}) {
  const { enabled, fixture, date, now, from, to } = args;
  const latest = useRef(args);
  latest.current = args;

  const [active, setActive] = useState<ActiveDrag | null>(null);
  const [zones, setZones] = useState<Record<string, CalendarDropZone[]>>({});
  const session = useRef<Session | null>(null);
  const justDragged = useRef(false);
  const cleanup = useRef<() => void>(() => {});

  const zonesFor = useCallback(
    (appt: Appointment, columnIds: string[]) => {
      const dayStart = localMinutes(date, from);
      const dayEnd = localMinutes(date, to);
      const { before, after } = blockExtent(fixture, appt);
      const out: Record<string, CalendarDropZone[]> = {};
      for (const id of columnIds) {
        const starts = validStarts({ fixture, appt, date, staffResourceId: id, now });
        const day = localMinutes(date, '00:00');
        const ok: [number, number][] = [];
        for (const minute of [...starts].sort((a, b) => a - b)) {
          const lo = Math.max(day + minute - before, dayStart);
          const hi = Math.min(day + minute + after, dayEnd);
          const last = ok.at(-1);
          if (last && lo <= last[1]) last[1] = Math.max(last[1], hi);
          else ok.push([lo, hi]);
        }
        const list: CalendarDropZone[] = [];
        let cursor = dayStart;
        for (const [lo, hi] of ok) {
          if (lo > cursor) list.push({ startAt: isoOf(cursor), endAt: isoOf(lo), ok: false });
          list.push({ startAt: isoOf(lo), endAt: isoOf(hi), ok: true });
          cursor = hi;
        }
        if (cursor < dayEnd) list.push({ startAt: isoOf(cursor), endAt: isoOf(dayEnd), ok: false });
        out[id] = list;
      }
      return out;
    },
    [fixture, date, from, to, now],
  );

  const evaluate = useCallback(
    (appt: Appointment, columnId: string, minute: number): DragTarget => {
      const result = moveAppointment({
        fixture,
        appt,
        date,
        minute,
        staffResourceId: columnId,
        now,
      });
      return result.ok
        ? {
            columnId,
            minute,
            ok: true,
            moved: result.appt,
            resourcesBefore: result.resourcesBefore,
            resourcesAfter: result.resourcesAfter,
          }
        : {
            columnId,
            minute,
            ok: false,
            reason: result.reason,
            resourcesBefore: [],
            resourcesAfter: [],
          };
    },
    [fixture, date, now],
  );

  const onBlockPointerDown = useCallback(
    (apptId: string) => (e: PointerEvent<HTMLElement>) => {
      const found = latest.current.fixture.appointments.find((a) => a.id === apptId);
      if (!latest.current.enabled || !found || !isDraggable(found)) return;
      const appt: Appointment = found;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      cleanup.current();

      const day = localMinutes(latest.current.date, '00:00');
      const s: Session = {
        apptId,
        pointerType: e.pointerType,
        startX: e.clientX,
        startY: e.clientY,
        started: false,
        timer: undefined,
        columns: [],
        slotPx: 16,
        oldMinute: minutesOf(itemArrival(appt, 0)) - day,
        last: { apptId, x: e.clientX, y: e.clientY, target: null },
        lastKey: '',
      };
      session.current = s;

      const begin = () => {
        if (s.started) return;
        s.started = true;
        const cols = [
          ...document.querySelectorAll<HTMLElement>('.sp-cal__col[data-column-id]'),
        ].filter((el) => el.offsetParent !== null);
        s.columns = cols.map((el) => {
          const r = el.getBoundingClientRect();
          return { id: el.dataset.columnId ?? '', left: r.left, right: r.right };
        });
        const first = cols[0]?.getBoundingClientRect();
        const from = latest.current.from;
        const to = latest.current.to;
        const total =
          localMinutes(latest.current.date, to) - localMinutes(latest.current.date, from);
        if (first && total > 0) s.slotPx = first.height / (total / SLOT);
        setZones(
          zonesFor(
            appt,
            s.columns.map((c) => c.id),
          ),
        );
        setActive(s.last);
        document.body.style.userSelect = 'none';
      };

      const update = (ev: globalThis.PointerEvent) => {
        // The column under the pointer; outside all of them, the nearest.
        const column =
          s.columns.find((c) => ev.clientX >= c.left && ev.clientX < c.right) ??
          s.columns.reduce<Session['columns'][number] | undefined>(
            (best, c) =>
              !best ||
              Math.min(Math.abs(ev.clientX - c.left), Math.abs(ev.clientX - c.right)) <
                Math.min(Math.abs(ev.clientX - best.left), Math.abs(ev.clientX - best.right))
                ? c
                : best,
            undefined,
          );
        if (!column) return;
        const steps = Math.round((ev.clientY - s.startY) / s.slotPx);
        // Less than one cell of travel keeps an off-grid time (14:05) as it is.
        const minute =
          steps === 0
            ? s.oldMinute
            : Math.min(
                Math.max(Math.round((s.oldMinute + steps * SLOT) / SLOT) * SLOT, 0),
                24 * 60 - SLOT,
              );
        const key = `${column.id}|${minute}`;
        const target = key === s.lastKey ? s.last.target : evaluate(appt, column.id, minute);
        s.lastKey = key;
        s.last = { apptId, x: ev.clientX, y: ev.clientY, target };
        setActive(s.last);
      };

      const onMove = (ev: globalThis.PointerEvent) => {
        if (!s.started) {
          const distance = Math.hypot(ev.clientX - s.startX, ev.clientY - s.startY);
          if (s.pointerType === 'mouse' || s.pointerType === 'pen') {
            if (distance < MOUSE_SLOP) return;
            begin();
          } else {
            // A finger that moves before the long press is scrolling the page.
            if (distance > TOUCH_SLOP) end(false);
            return;
          }
        }
        update(ev);
      };
      const onTouchMove = (ev: TouchEvent) => {
        if (s.started) ev.preventDefault();
      };
      const onUp = () => end(true);
      const onKey = (ev: KeyboardEvent) => {
        if (ev.key === 'Escape' && s.started) {
          ev.preventDefault();
          end(false);
        }
      };

      function end(drop: boolean) {
        const { target } = s.last;
        const wasCarrying = s.started;
        cleanup.current();
        if (!wasCarrying) return;
        // The click that follows the release must not open the appointment.
        justDragged.current = true;
        window.setTimeout(() => (justDragged.current = false), 0);
        if (!drop || !target) return;
        const unchanged =
          target.minute === s.oldMinute && target.columnId === appt.items[0]?.staffResourceId;
        if (unchanged) return;
        if (target.ok) latest.current.onDrop(appt, target);
        else latest.current.onRejected(target.reason ?? 'Không thả được vào đây.');
      }

      cleanup.current = () => {
        window.clearTimeout(s.timer);
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onCancel);
        window.removeEventListener('keydown', onKey, true);
        document.removeEventListener('touchmove', onTouchMove);
        document.body.style.userSelect = '';
        session.current = null;
        setActive(null);
        setZones({});
      };
      const onCancel = () => end(false);

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onCancel);
      window.addEventListener('keydown', onKey, true);
      document.addEventListener('touchmove', onTouchMove, { passive: false });
      if (s.pointerType === 'touch') {
        s.timer = window.setTimeout(() => {
          begin();
          update(new PointerEvent('pointermove', { clientX: s.startX, clientY: s.startY }));
        }, LONG_PRESS_MS);
      }
    },
    [evaluate, zonesFor],
  );

  // Leaving the page or changing the day drops the carried block.
  useEffect(() => () => cleanup.current(), [date]);
  useEffect(() => {
    if (!enabled) cleanup.current();
  }, [enabled]);

  /** True once after a drag, so the click that ends it can be ignored. */
  const consumeClick = useCallback(() => {
    const was = justDragged.current;
    justDragged.current = false;
    return was;
  }, []);

  return useMemo(
    () => ({ onBlockPointerDown, active, zones, consumeClick }),
    [onBlockPointerDown, active, zones, consumeClick],
  );
}
