import type { CSSProperties } from 'react';
import { localToUtc, minutesBetween } from '@/mock/time';
import { AppointmentBlock, type AppointmentBlockProps } from './appointment-block';

export interface CalendarColumn {
  id: string;
  name: string;
  /** Second header line, e.g. "Thợ · 3 lịch" or "Ghế làm tóc". */
  kind: string;
  blocks: (Omit<AppointmentBlockProps, 'dayStart'> & { id: string })[];
}

export interface ResourceCalendarProps {
  columns: CalendarColumn[];
  /** Local date `YYYY-MM-DD`. */
  date: string;
  /** Visible range, local `HH:mm`, whole hours. */
  from: string;
  to: string;
  /** Opening hours, local `HH:mm`; the rest is drawn as closed. */
  open: string;
  close: string;
  /** ISO 8601, UTC. */
  now: string;
  label: string;
}

const SLOT_MINUTES = 15;
const slots = (minutes: number) => `calc(var(--slot-height) * ${minutes / SLOT_MINUTES})`;

export function ResourceCalendar({
  columns,
  date,
  from,
  to,
  open,
  close,
  now,
  label,
}: ResourceCalendarProps) {
  const dayStart = localToUtc(date, from);
  const dayEnd = localToUtc(date, to);
  const total = minutesBetween(dayStart, dayEnd);
  const hours = Array.from({ length: total / 60 }, (_, i) => i);
  const nowOffset = minutesBetween(dayStart, now);
  const closedBefore = minutesBetween(dayStart, localToUtc(date, open));
  const closedAfter = minutesBetween(localToUtc(date, close), dayEnd);
  const fromHour = Number(from.slice(0, 2));

  return (
    <div
      className="sp-cal"
      role="grid"
      aria-label={label}
      style={{ '--cols': columns.length } as CSSProperties}
    >
      <div className="sp-cal__head" />
      {columns.map((column) => (
        <div key={column.id} className="sp-cal__head" role="columnheader">
          <div className="sp-cal__name">{column.name}</div>
          <div className="sp-cal__kind">{column.kind}</div>
        </div>
      ))}

      <div className="sp-cal__ruler" style={{ height: slots(total) }} aria-hidden="true">
        {hours.map((h) => (
          <span key={h} className="sp-cal__hour" style={{ top: slots(h * 60) }}>
            {String(fromHour + h).padStart(2, '0')}:00
          </span>
        ))}
      </div>
      {columns.map((column) => (
        <div
          key={column.id}
          className="sp-cal__col"
          role="gridcell"
          aria-label={column.name}
          style={{ height: slots(total) }}
        >
          {closedBefore > 0 && (
            <div className="sp-cal__closed" style={{ top: 0, height: slots(closedBefore) }} />
          )}
          {closedAfter > 0 && (
            <div className="sp-cal__closed" style={{ bottom: 0, height: slots(closedAfter) }} />
          )}
          {column.blocks.map(({ id, ...block }) => (
            <AppointmentBlock key={id} dayStart={dayStart} {...block} />
          ))}
          {nowOffset >= 0 && nowOffset <= total && (
            <div className="sp-cal__now" style={{ top: slots(nowOffset) }} />
          )}
        </div>
      ))}
    </div>
  );
}
