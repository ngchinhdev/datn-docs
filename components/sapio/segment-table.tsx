'use client';

import { GripVertical, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';
import type { SegmentKind } from '@/mock/fixtures';
import {
  duration,
  type DraftSegment,
  type SegmentErrors,
  type SegmentPatch,
} from '@/mock/service-edit';

export interface SegmentTableType {
  id: string;
  name: string;
  isStaff: boolean;
}

const KINDS: { value: SegmentKind; label: string }[] = [
  { value: 'prep', label: 'Chuẩn bị' },
  { value: 'work', label: 'Làm' },
  { value: 'wait', label: 'Chờ' },
];

function CellField({
  id,
  error,
  width,
  children,
}: {
  id: string;
  error: string | undefined;
  width: number;
  children: React.ReactNode;
}) {
  return (
    <span className={cn('sp-field sp-field--sm', error && 'sp-field--error')} style={{ width }}>
      <span className="sp-field__control">{children}</span>
      {error && (
        <span id={id} className="sp-field__help">
          {error}
        </span>
      )}
    </span>
  );
}

/**
 * One editable row per segment (BR-50): name, kind, minutes and the resource types it holds.
 * Rows move by dragging the handle or by focusing it and pressing the arrow keys.
 */
export function SegmentTable({
  caption,
  segments,
  types,
  selected,
  onSelect,
  errors,
  onPatch,
  onMove,
  onRemove,
}: {
  /** "Các đoạn của biến thể Tóc ngắn". */
  caption: string;
  segments: DraftSegment[];
  types: SegmentTableType[];
  selected: number | null;
  onSelect: (index: number) => void;
  errors: Record<number, SegmentErrors>;
  onPatch: (index: number, patch: SegmentPatch) => void;
  onMove: (from: number, to: number) => void;
  onRemove: (index: number) => void;
}) {
  const handles = useRef<(HTMLButtonElement | null)[]>([]);
  const [focusAt, setFocusAt] = useState<number | null>(null);
  const [armed, setArmed] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const [said, setSaid] = useState('');

  // After a row moves with the keyboard, focus follows it to its new place.
  useEffect(() => {
    if (focusAt !== null) {
      handles.current[focusAt]?.focus();
      setFocusAt(null);
    }
  }, [focusAt]);

  function moveBy(index: number, step: -1 | 1) {
    const to = index + step;
    if (to < 0 || to >= segments.length) return;
    onMove(index, to);
    setFocusAt(to);
    setSaid(`Đoạn ${segments[index]?.name ?? index + 1} chuyển sang vị trí ${to + 1}.`);
  }

  function onHandleKey(e: KeyboardEvent, index: number) {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
    e.preventDefault();
    moveBy(index, e.key === 'ArrowUp' ? -1 : 1);
  }

  return (
    <div className="sp-table-wrap" tabIndex={0} role="region" aria-label={`${caption}, cuộn được`}>
      <table className="sp-table sp-segtable">
        <caption className="sp-sr-only">{caption}</caption>
        <thead>
          <tr>
            <th scope="col">
              <span className="sp-sr-only">Thứ tự</span>
            </th>
            <th scope="col">Đoạn, tên trên lịch</th>
            <th scope="col">Loại</th>
            <th scope="col">Phút</th>
            <th scope="col">Chiếm</th>
            <th scope="col">
              <span className="sp-sr-only">Thao tác</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {segments.map((segment, i) => {
            const n = i + 1;
            const e = errors[i] ?? {};
            const isWait = segment.kind === 'wait';
            return (
              <tr
                key={i}
                aria-selected={selected === i}
                draggable={armed === i}
                className={cn(
                  over === i &&
                    armed !== null &&
                    armed !== i &&
                    'shadow-[inset_0_2px_0_var(--brand)]',
                )}
                onFocusCapture={() => onSelect(i)}
                onClick={(ev) => {
                  if (!(ev.target as HTMLElement).closest('input, select, button')) onSelect(i);
                }}
                onDragStart={(ev) => {
                  ev.dataTransfer.effectAllowed = 'move';
                  ev.dataTransfer.setData('text/plain', String(i));
                }}
                onDragOver={(ev) => {
                  if (armed === null) return;
                  ev.preventDefault();
                  setOver(i);
                }}
                onDrop={(ev) => {
                  ev.preventDefault();
                  if (armed !== null) onMove(armed, i);
                  setArmed(null);
                  setOver(null);
                }}
                onDragEnd={() => {
                  setArmed(null);
                  setOver(null);
                }}
              >
                <td>
                  <button
                    ref={(el) => {
                      handles.current[i] = el;
                    }}
                    type="button"
                    className="sp-icon-btn cursor-grab"
                    aria-label={`Kéo để đổi thứ tự đoạn ${n}`}
                    title="Kéo, hoặc bấm ↑ ↓ để đổi thứ tự"
                    onPointerDown={() => setArmed(i)}
                    onPointerUp={() => setArmed(null)}
                    onKeyDown={(ev) => onHandleKey(ev, i)}
                  >
                    <GripVertical size={16} aria-hidden="true" />
                  </button>
                </td>
                <td>
                  <span className="sp-segtable__kind">
                    <span
                      className={`sp-kind sp-kind--${kindClass(segment.kind)}`}
                      aria-hidden="true"
                    />
                    <CellField id={`seg-${i}-name-err`} error={e.name} width={112}>
                      <input
                        type="text"
                        value={segment.name}
                        aria-label={`Tên đoạn ${n} trên lịch`}
                        aria-invalid={e.name ? true : undefined}
                        aria-describedby={e.name ? `seg-${i}-name-err` : undefined}
                        onChange={(ev) => onPatch(i, { name: ev.target.value })}
                      />
                    </CellField>
                  </span>
                </td>
                <td>
                  <CellField id={`seg-${i}-kind-err`} error={e.kind} width={110}>
                    <select
                      value={segment.kind}
                      aria-label={`Loại đoạn ${n}`}
                      aria-invalid={e.kind ? true : undefined}
                      aria-describedby={e.kind ? `seg-${i}-kind-err` : undefined}
                      onChange={(ev) => onPatch(i, { kind: ev.target.value as SegmentKind })}
                    >
                      {KINDS.map((k) => (
                        <option key={k.value} value={k.value}>
                          {k.label}
                        </option>
                      ))}
                    </select>
                  </CellField>
                </td>
                <td>
                  <span className={cn('sp-field sp-field--sm', e.minutes && 'sp-field--error')}>
                    <label className="sp-mins">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={segment.minutesText ?? String(duration(segment))}
                        aria-label={`Thời lượng đoạn ${n}, phút`}
                        aria-invalid={e.minutes ? true : undefined}
                        aria-describedby={e.minutes ? `seg-${i}-min-err` : undefined}
                        onChange={(ev) =>
                          onPatch(i, { minutesText: ev.target.value.replace(/\D/g, '') })
                        }
                      />
                    </label>
                    {e.minutes && (
                      <span id={`seg-${i}-min-err`} className="sp-field__help max-w-40">
                        {e.minutes}
                      </span>
                    )}
                  </span>
                </td>
                <td>
                  <div
                    className="sp-segtable__uses min-w-0!"
                    role="group"
                    aria-label={`Đoạn ${n} chiếm`}
                    aria-describedby={e.uses ? `seg-${i}-uses-err` : undefined}
                  >
                    {types.map((type) => {
                      const on = segment.resourceTypeIds.includes(type.id);
                      const locked = isWait && type.isStaff;
                      return (
                        <button
                          key={type.id}
                          type="button"
                          className="sp-chip"
                          aria-pressed={on}
                          disabled={locked}
                          title={locked ? 'Đoạn chờ không giữ nhân viên' : undefined}
                          style={locked ? { opacity: 0.45 } : undefined}
                          onClick={() =>
                            onPatch(i, {
                              typeIds: on
                                ? segment.resourceTypeIds.filter((t) => t !== type.id)
                                : [...segment.resourceTypeIds, type.id],
                            })
                          }
                        >
                          {type.name}
                        </button>
                      );
                    })}
                  </div>
                  {e.uses && (
                    <span className="sp-field--error mt-1 block">
                      <span id={`seg-${i}-uses-err`} className="sp-field__help">
                        {e.uses}
                      </span>
                    </span>
                  )}
                </td>
                <td className="sp-table__actions">
                  <button
                    type="button"
                    className="sp-icon-btn"
                    aria-label={`Xóa đoạn ${n}`}
                    title="Xóa đoạn"
                    disabled={segments.length === 1}
                    onClick={() => onRemove(i)}
                  >
                    <Trash2 size={16} aria-hidden="true" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="sp-sr-only" role="status" aria-live="polite">
        {said}
      </p>
    </div>
  );
}

export const kindClass = (kind: SegmentKind) => (kind === 'prep' ? 'buffer' : kind);
