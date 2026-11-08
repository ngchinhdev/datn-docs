import type { CSSProperties } from 'react';
import { localToUtc, minutesBetween } from '@/mock/time';
import { AppointmentBlock, type AppointmentBlockProps } from './appointment-block';

export interface CalendarColumn {
  id: string;
  name: string;
  /** Second header line, e.g. "Nhân viên · 3 lịch" or "Ghế 1". */
  kind: string;
  /** Read by screen readers, e.g. "Mai, Thợ chính, 3 lịch hẹn". Defaults to name and kind. */
  label?: string;
  /** Whole column unavailable, e.g. "Nghỉ" for staff time off. */
  offLabel?: string;
  blocks: (Omit<AppointmentBlockProps, 'dayStart'> & { id: string })[];
}

export interface ResourceCalendarProps {
  columns: CalendarColumn[];
  /** Local date `YYYY-MM-DD`. */
  date: string;
  /** Visible range, local `HH:mm`, whole hours. */
  from: string;
  to: string;
  /** Opening hours, local `HH:mm`; the rest is drawn as closed. `null` = closed all day. */
  open: string | null;
  close: string | null;
  /** Shown on every column when closed all day, e.g. "Đóng cửa: Bảo trì". */
  closedLabel?: string;
  /** ISO 8601, UTC. */
  now: string;
  label: string;
  /** Narrow ruler and columns, for a preview in a side column. */
  compact?: boolean;
}

const SLOT_MINUTES = 15;
const slots = (minutes: number) => `calc(var(--slot-height) * ${minutes / SLOT_MINUTES})`;

function Unavailable({ text }: { text: string }) {
  return (
    <div className="sp-cal__closed top-0 bottom-0 p-(--space-2)">
      <span className="sp-appt__meta block">{text}</span>
    </div>
  );
}

/** Columns are sections placed on the grid explicitly, so the header and body of one column stay together. */
export function ResourceCalendar({
  columns,
  date,
  from,
  to,
  open,
  close,
  closedLabel,
  now,
  label,
  compact = false,
}: ResourceCalendarProps) {
  const dayStart = localToUtc(date, from);
  const dayEnd = localToUtc(date, to);
  const total = minutesBetween(dayStart, dayEnd);
  const hours = Array.from({ length: total / 60 }, (_, i) => i);
  const nowOffset = minutesBetween(dayStart, now);
  const closedAllDay = !open || !close;
  const closedBefore = open ? minutesBetween(dayStart, localToUtc(date, open)) : 0;
  const closedAfter = close ? minutesBetween(localToUtc(date, close), dayEnd) : 0;
  const fromHour = Number(from.slice(0, 2));

  return (
    <div
      className="sp-cal"
      aria-label={label}
      role="region"
      style={
        {
          '--cols': columns.length,
          ...(compact ? { '--ruler-width': '44px', '--column-min-width': '72px' } : {}),
        } as CSSProperties
      }
    >
      <div className="sp-cal__head" style={{ gridRow: 1, gridColumn: 1 }} />
      <div
        className="sp-cal__ruler"
        style={{ height: slots(total), gridRow: 2, gridColumn: 1 }}
        aria-hidden="true"
      >
        {hours.map((h) => (
          <span key={h} className="sp-cal__hour" style={{ top: slots(h * 60) }}>
            {String(fromHour + h).padStart(2, '0')}:00
          </span>
        ))}
      </div>
      {columns.map((column, i) => (
        <section
          key={column.id}
          className="contents"
          aria-label={column.label ?? `${column.name}, ${column.kind}`}
        >
          <div className="sp-cal__head" style={{ gridRow: 1, gridColumn: i + 2 }}>
            <div className="sp-cal__name">{column.name}</div>
            <div className="sp-cal__kind">{column.kind}</div>
          </div>
          <div
            className="sp-cal__col"
            style={{ height: slots(total), gridRow: 2, gridColumn: i + 2 }}
          >
            {closedAllDay ? (
              <Unavailable text={closedLabel ?? 'Đóng cửa'} />
            ) : column.offLabel ? (
              <Unavailable text={column.offLabel} />
            ) : (
              <>
                {closedBefore > 0 && (
                  <div className="sp-cal__closed" style={{ top: 0, height: slots(closedBefore) }} />
                )}
                {closedAfter > 0 && (
                  <div
                    className="sp-cal__closed"
                    style={{ bottom: 0, height: slots(closedAfter) }}
                  />
                )}
                {column.blocks.map(({ id, ...block }) => (
                  <AppointmentBlock key={id} dayStart={dayStart} {...block} />
                ))}
              </>
            )}
            {nowOffset >= 0 && nowOffset <= total && (
              <div className="sp-cal__now" style={{ top: slots(nowOffset) }} />
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
