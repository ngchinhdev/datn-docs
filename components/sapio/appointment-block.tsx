import type { CSSProperties, PointerEvent } from 'react';
import { cn } from '@/lib/utils';
import type { AppointmentStatus } from '@/mock/fixtures';
import { minutesBetween } from '@/mock/time';
import { statusModifier } from './status-badge';

export interface BlockSegment {
  /** ISO 8601, UTC. */
  startAt: string;
  endAt: string;
  /** `buffer` is preparation or cleanup: dashed, outside the time the customer sees (BR-51). */
  kind: 'work' | 'wait' | 'buffer';
  /** Extra line inside a wait segment, e.g. "Chờ lên màu · Hùng rảnh"; the name of a buffer. */
  note?: string;
}

export interface AppointmentBlockProps {
  segments: BlockSegment[];
  status: AppointmentStatus;
  title: string;
  meta?: string;
  /** Sits inside another appointment's wait on a staff column. */
  inset?: boolean;
  selected?: boolean;
  /** ISO instant of the calendar's top edge. */
  dayStart: string;
  onSelect?: () => void;
  /** Can be picked up with the pointer (MH-27); the screen reads the press. */
  draggable?: boolean;
  onPointerDown?: (e: PointerEvent<HTMLButtonElement>) => void;
  /** The block being carried: lifted, and it does not take the pointer. */
  dragging?: boolean;
  /** The place the carried block came from, faded. */
  ghost?: boolean;
  /** Id of the appointment, for the drag code to find the block. */
  appointmentId?: string;
}

const SLOT_MINUTES = 15;
/** The `slot-height` token in pixels; text that does not fit a segment of this height is left out. */
const SLOT_PX = 16;
/** Line heights of `.sp-appt__title`, `.sp-appt__meta` and the buffer text; padding of a segment is 4px above and below. */
const LINE_PX = 16;
const BUFFER_LINE_PX = 14;
const PAD_PX = 8;
/** `n` slots tall, in multiples of the `slot-height` token. */
const slots = (minutes: number) => `calc(var(--slot-height) * ${minutes / SLOT_MINUTES})`;

export function AppointmentBlock({
  segments,
  status,
  title,
  meta,
  inset = false,
  selected = false,
  dayStart,
  onSelect,
  draggable = false,
  onPointerDown,
  dragging = false,
  ghost = false,
  appointmentId,
}: AppointmentBlockProps) {
  const first = segments[0];
  const last = segments.at(-1);
  if (!first || !last) return null;

  const style: CSSProperties = {
    top: slots(minutesBetween(dayStart, first.startAt)),
    height: slots(minutesBetween(first.startAt, last.endAt)),
    ...(ghost ? { opacity: 0.35 } : {}),
    ...(dragging ? { pointerEvents: 'none', zIndex: 4 } : {}),
  };
  // The title sits on the first segment the customer sees, the time on the last one.
  const seen = segments.flatMap((s, i) => (s.kind === 'buffer' ? [] : [i]));
  const titleAt = seen[0] ?? 0;
  const metaAt = seen.at(-1) ?? 0;
  const showsMeta = (i: number) => i === metaAt && (seen.length === 1 || i > titleAt);
  /**
   * What a segment shows, in order of priority: title, note, time and resources. Lines that do not
   * fit its height are left out (the full text stays in the name and the tooltip), so nothing is cut
   * off or spills onto the next segment. A one-slot segment drops its padding to keep the title.
   */
  const shown = (segment: BlockSegment, i: number) => {
    const lines = [
      i === titleAt ? 'title' : null,
      segment.note ? 'note' : null,
      meta && showsMeta(i) ? 'meta' : null,
    ].filter((x): x is 'title' | 'note' | 'meta' => x !== null);
    const height = (minutesBetween(segment.startAt, segment.endAt) / SLOT_MINUTES) * SLOT_PX;
    const lineHeight = segment.kind === 'buffer' ? BUFFER_LINE_PX : LINE_PX;
    const padding = segment.kind === 'buffer' ? 0 : PAD_PX;
    let count = lines.length;
    while (count > 1 && count * lineHeight + padding > height) count -= 1;
    // Only the title keeps a segment that is too short for its padding, so the name is never lost.
    const tight = count === 1 && lines[0] === 'title' && lineHeight + padding > height;
    if (count === 1 && lineHeight + (tight ? 0 : padding) > height) count = 0;
    const kept = lines.slice(0, count);
    return {
      title: kept.includes('title'),
      note: kept.includes('note'),
      meta: kept.includes('meta'),
      tight,
    };
  };
  // Same texts in the same order as on screen, so the name contains what is visible.
  const label = segments
    .flatMap((s, i) => [
      i === titleAt ? title : undefined,
      s.note,
      meta && showsMeta(i) ? meta : undefined,
    ])
    .filter(Boolean)
    .join(', ');

  return (
    <button
      type="button"
      onClick={onSelect}
      onPointerDown={onPointerDown}
      aria-pressed={selected}
      aria-label={label}
      title={label}
      {...(appointmentId ? { 'data-appointment-id': appointmentId } : {})}
      className={cn(
        'sp-appt border-0 p-0 text-left',
        `sp-appt--${statusModifier[status]}`,
        inset && 'sp-appt--inset',
        dragging && 'sp-appt--dragging',
        draggable && 'cursor-grab select-none',
        selected && 'outline-2 outline-offset-1 outline-(--brand)',
      )}
      style={style}
    >
      {segments.map((segment, i) => {
        const text = shown(segment, i);
        return (
          <span
            key={segment.startAt}
            className={cn(
              'sp-appt__seg block',
              text.tight && 'py-0!',
              segment.kind === 'wait' && 'sp-appt__seg--wait',
              segment.kind === 'buffer' && 'sp-appt__seg--buffer',
            )}
            style={{ height: slots(minutesBetween(segment.startAt, segment.endAt)) }}
          >
            {text.title && (
              <>
                <span className="sp-appt__title">{title}</span>{' '}
              </>
            )}
            {text.note && segment.note && (
              <>
                <span className="sp-appt__meta block">{segment.note}</span>{' '}
              </>
            )}
            {text.meta && meta && (
              <>
                <span className="sp-appt__meta block">{meta}</span>{' '}
              </>
            )}
          </span>
        );
      })}
    </button>
  );
}
