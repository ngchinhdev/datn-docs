import type { CSSProperties } from 'react';
import { cn } from '@/lib/utils';
import type { AppointmentStatus } from '@/mock/fixtures';
import { minutesBetween } from '@/mock/time';
import { statusModifier } from './status-badge';

export interface BlockSegment {
  /** ISO 8601, UTC. */
  startAt: string;
  endAt: string;
  kind: 'work' | 'wait';
  /** Extra line inside a wait segment, e.g. "Chờ lên màu · Hùng rảnh". */
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
}

const SLOT_MINUTES = 15;
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
}: AppointmentBlockProps) {
  const first = segments[0];
  const last = segments.at(-1);
  if (!first || !last) return null;

  const style: CSSProperties = {
    top: slots(minutesBetween(dayStart, first.startAt)),
    height: slots(minutesBetween(first.startAt, last.endAt)),
  };
  const single = segments.length === 1;
  const showsMeta = (i: number) => single || (i === segments.length - 1 && i > 0);
  // Same texts in the same order as on screen, so the name contains what is visible.
  const label = [
    title,
    ...segments.flatMap((s, i) => [s.note, meta && showsMeta(i) ? meta : undefined]),
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={label}
      className={cn(
        'sp-appt border-0 p-0 text-left',
        `sp-appt--${statusModifier[status]}`,
        inset && 'sp-appt--inset',
        selected && 'outline-2 outline-offset-1 outline-(--brand)',
      )}
      style={style}
    >
      {segments.map((segment, i) => (
        <span
          key={segment.startAt}
          className={cn('sp-appt__seg block', segment.kind === 'wait' && 'sp-appt__seg--wait')}
          style={{ height: slots(minutesBetween(segment.startAt, segment.endAt)) }}
        >
          {i === 0 && (
            <>
              <span className="sp-appt__title">{title}</span>{' '}
            </>
          )}
          {segment.note && (
            <>
              <span className="sp-appt__meta block">{segment.note}</span>{' '}
            </>
          )}
          {meta && showsMeta(i) && <span className="sp-appt__meta block">{meta}</span>}
        </span>
      ))}
    </button>
  );
}
