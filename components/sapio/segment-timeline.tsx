import type { CSSProperties } from 'react';
import { cn } from '@/lib/utils';
import type { SegmentKind } from '@/mock/fixtures';
import { formatDuration } from '@/mock/format';

export interface TimelineSegment {
  name: string;
  kind: SegmentKind;
  /** Minutes from the start of the first segment, `[from, to)`. */
  from: number;
  to: number;
  typeIds: string[];
}

export interface TimelineType {
  id: string;
  label: string;
  /** Second line under the label, e.g. "nhân viên". */
  small?: string;
}

export interface SegmentTimelineProps {
  segments: TimelineSegment[];
  /** One row per type, in this order. */
  types: TimelineType[];
  /** Minutes to clean each type after its last segment (BR-52). */
  cleanup: Record<string, number>;
  /** What the customer sees, minutes from the start of the first segment (BR-51). */
  visible: readonly [number, number];
  /** Local time the customer arrives, `09:00`; the ruler reads clock times. Absent: minutes. */
  exampleStart?: string;
  /** Index of the segment being edited. */
  selected?: number | null;
  /** Bars become buttons that pick a segment. */
  onSelect?: (index: number) => void;
  /** One line per variant in lists and on phones: smaller bars. */
  mini?: boolean;
  /** Draw the ruler. */
  scale?: boolean;
  /** Width of the label column, px. */
  labelWidth?: number;
  label: string;
}

const KIND_WORD: Record<SegmentKind | 'cleanup', string> = {
  prep: 'Chuẩn bị',
  work: 'Làm',
  wait: 'Chờ',
  cleanup: 'Dọn dẹp',
};
const BAR_CLASS: Record<SegmentKind | 'cleanup', string> = {
  prep: 'sp-timeline__bar--buffer',
  work: 'sp-timeline__bar--work',
  wait: 'sp-timeline__bar--wait',
  cleanup: 'sp-timeline__bar--buffer',
};

const toMinutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3));
const clock = (minutes: number) =>
  `${String(Math.floor(minutes / 60) % 24).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

/** The legend under a timeline: what the three bar styles mean. */
export function TimelineLegend() {
  return (
    <ul className="sp-timeline__legend">
      <li>
        <span className="sp-kind sp-kind--work" aria-hidden="true" />
        Làm: các tài nguyên đã chọn cùng bận
      </li>
      <li>
        <span className="sp-kind sp-kind--wait" aria-hidden="true" />
        Chờ: nhân viên rảnh, tài nguyên đã chọn vẫn bận (BR-05)
      </li>
      <li>
        <span className="sp-kind sp-kind--buffer" aria-hidden="true" />
        Chuẩn bị, dọn dẹp: bận như lúc làm, khách không thấy (BR-04)
      </li>
    </ul>
  );
}

/**
 * The parts of one service variant on a minute axis: a row per resource type, a bar per segment,
 * the cleanup of each type after its last segment, and a row for what the customer sees.
 */
export function SegmentTimeline({
  segments,
  types,
  cleanup,
  visible,
  exampleStart,
  selected = null,
  onSelect,
  mini = false,
  scale = true,
  labelWidth,
  label,
}: SegmentTimelineProps) {
  const cleanups = types.flatMap((type) => {
    const minutes = cleanup[type.id] ?? 0;
    const mine = segments.filter((s) => s.typeIds.includes(type.id));
    if (minutes <= 0 || mine.length === 0) return [];
    const from = Math.max(...mine.map((s) => s.to));
    return [{ typeId: type.id, from, to: from + minutes }];
  });
  const total = Math.max(1, ...segments.map((s) => s.to), ...cleanups.map((c) => c.to));
  const [seenFrom, seenTo] = visible;
  const arrive = exampleStart ? toMinutes(exampleStart) : null;
  /** Clock time at `minute` of the axis, when the customer arrives at `exampleStart`. */
  const at = (minute: number) => (arrive === null ? null : clock(arrive - seenFrom + minute));

  const ticks: { at: number; text: string }[] = [];
  if (scale) {
    if (arrive !== null && mini) {
      ticks.push({ at: seenFrom, text: at(seenFrom) ?? '' });
      for (let m = seenFrom + 1; m < seenTo - 14; m++) {
        if ((arrive - seenFrom + m) % 60 === 0) ticks.push({ at: m, text: at(m) ?? '' });
      }
      ticks.push({ at: seenTo, text: at(seenTo) ?? '' });
    } else {
      for (let m = 0; m <= total; m += 15) {
        if (m + 8 > total && m !== 0 && m !== total) continue;
        ticks.push({ at: m, text: at(m) ?? `${m}′` });
      }
    }
  }

  const style = {
    '--total': total,
    ...(labelWidth ? { '--tl-label': `${labelWidth}px` } : {}),
  } as CSSProperties;
  const range = `${at(seenFrom) ?? ''}${arrive !== null ? `–${at(seenTo)}` : ''}`;
  const spanText = [range, formatDuration(seenTo - seenFrom)].filter(Boolean).join(' · ');

  return (
    <div
      className={cn('sp-timeline', mini && 'sp-timeline--mini')}
      style={style}
      role="group"
      aria-label={label}
    >
      {scale && (
        <div className="sp-timeline__row">
          <span />
          <div className="sp-timeline__scale" aria-hidden="true">
            {ticks.map((tick) => (
              <span
                key={tick.at}
                className="sp-timeline__tick"
                style={{ '--at': tick.at } as CSSProperties}
              >
                {tick.text}
              </span>
            ))}
          </div>
        </div>
      )}
      {types.map((type) => (
        <div key={type.id} className="sp-timeline__row">
          <span className="sp-timeline__label">
            {type.label}
            {type.small && <small>{type.small}</small>}
          </span>
          <div className="sp-timeline__track">
            {segments.flatMap((segment, index) => {
              if (!segment.typeIds.includes(type.id)) return [];
              const minutes = segment.to - segment.from;
              const kindText = `${KIND_WORD[segment.kind]}: ${segment.name}, ${minutes} phút`;
              const common = {
                className: cn('sp-timeline__bar', BAR_CLASS[segment.kind]),
                style: { '--from': segment.from, '--to': segment.to } as CSSProperties,
                title: kindText,
              };
              const content = (
                <>
                  <span className="sp-sr-only">
                    {KIND_WORD[segment.kind]}, {minutes} phút:{' '}
                  </span>
                  {segment.name}
                </>
              );
              return onSelect ? (
                <button
                  key={`s${index}`}
                  {...common}
                  type="button"
                  aria-pressed={selected === index}
                  onClick={() => onSelect(index)}
                >
                  {content}
                </button>
              ) : (
                <span key={`s${index}`} {...common}>
                  {content}
                </span>
              );
            })}
            {cleanups
              .filter((c) => c.typeId === type.id)
              .map((c) => (
                <span
                  key="cleanup"
                  className="sp-timeline__bar sp-timeline__bar--buffer"
                  style={{ '--from': c.from, '--to': c.to } as CSSProperties}
                  title={`Dọn dẹp: ${c.to - c.from} phút`}
                >
                  <span className="sp-sr-only">Dọn dẹp, {c.to - c.from} phút: </span>
                  Dọn
                </span>
              ))}
          </div>
        </div>
      ))}
      <div className="sp-timeline__row">
        <span className="sp-timeline__label">Khách thấy</span>
        <div className="sp-timeline__track sp-timeline__track--bare">
          <span
            className="sp-timeline__bar sp-timeline__bar--span"
            style={{ '--from': seenFrom, '--to': seenTo } as CSSProperties}
          >
            {spanText}
          </span>
        </div>
      </div>
    </div>
  );
}
