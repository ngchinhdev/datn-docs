import type { CSSProperties, MouseEvent } from 'react';
import { cn } from '@/lib/utils';
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

/** The outlined empty block of an appointment being created (MH-26). */
export interface CalendarTarget {
  columnId: string;
  /** ISO 8601, UTC. */
  startAt: string;
  endAt: string;
  text: string;
  /** The time does not work: danger outline. */
  bad?: boolean;
}

/** Where a carried block may land (`ok`) or may not, in one column (MH-27). */
export interface CalendarDropZone {
  /** ISO 8601, UTC. */
  startAt: string;
  endAt: string;
  ok: boolean;
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
  /**
   * An empty part of a column was pressed: the column and the quarter hour under the pointer
   * (ISO 8601, UTC). Without it the columns are not pressable.
   */
  onEmptyPress?: (columnId: string, startAt: string) => void;
  targets?: CalendarTarget[];
  /** While a block is carried: the zones to draw in each column, by column id. */
  drops?: Record<string, CalendarDropZone[]>;
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
  onEmptyPress,
  targets = [],
  drops,
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

  function pressColumn(columnId: string, e: MouseEvent<HTMLDivElement>) {
    if (!onEmptyPress || (e.target as Element).closest('.sp-appt, .sp-cal__target')) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const quarter = Math.floor(((e.clientY - rect.top) / rect.height) * (total / SLOT_MINUTES));
    const clamped = Math.min(Math.max(quarter, 0), total / SLOT_MINUTES - 1);
    onEmptyPress(
      columnId,
      new Date(Date.parse(dayStart) + clamped * SLOT_MINUTES * 60_000).toISOString(),
    );
  }

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
            data-column-id={column.id}
            className={cn(
              'sp-cal__col',
              onEmptyPress && !closedAllDay && !column.offLabel && 'cursor-cell',
            )}
            style={{ height: slots(total), gridRow: 2, gridColumn: i + 2 }}
            {...(onEmptyPress && !closedAllDay && !column.offLabel
              ? { onClick: (e: MouseEvent<HTMLDivElement>) => pressColumn(column.id, e) }
              : {})}
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
                {(drops?.[column.id] ?? []).map((zone) => (
                  <div
                    key={`${zone.startAt}${zone.ok}`}
                    aria-hidden="true"
                    className={cn('sp-cal__drop', !zone.ok && 'sp-cal__drop--blocked')}
                    style={{
                      top: slots(minutesBetween(dayStart, zone.startAt)),
                      height: slots(minutesBetween(zone.startAt, zone.endAt)),
                    }}
                  />
                ))}
                {column.blocks.map(({ id, ...block }) => (
                  <AppointmentBlock key={id} dayStart={dayStart} {...block} />
                ))}
                {targets
                  .filter((t) => t.columnId === column.id)
                  .map((t) => (
                    <div
                      key={t.startAt}
                      aria-hidden="true"
                      className="sp-cal__target"
                      style={{
                        top: slots(minutesBetween(dayStart, t.startAt)),
                        height: slots(minutesBetween(t.startAt, t.endAt)),
                        ...(t.bad
                          ? {
                              outlineColor: 'var(--danger)',
                              color: 'var(--danger)',
                              background: 'transparent',
                            }
                          : {}),
                      }}
                    >
                      {t.text}
                    </div>
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
