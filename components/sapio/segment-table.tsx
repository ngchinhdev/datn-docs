'use client';

import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
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
 * A row moves one place up or down with its two buttons; the first row cannot go up, the last cannot go down.
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
  const buttons = useRef<Record<string, HTMLButtonElement | null>>({});
  /** After a row moves, the button that was pressed goes with it: `{row}:{-1 or 1}`. */
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const [said, setSaid] = useState('');

  useEffect(() => {
    if (focusKey === null) return;
    const [row, dir] = focusKey.split(':') as [string, '-1' | '1'];
    const other = dir === '-1' ? '1' : '-1';
    const target = [buttons.current[`${row}:${dir}`], buttons.current[`${row}:${other}`]].find(
      (el) => el && !el.disabled,
    );
    target?.focus();
    setFocusKey(null);
  }, [focusKey]);

  function moveBy(index: number, step: -1 | 1) {
    const to = index + step;
    if (to < 0 || to >= segments.length) return;
    onMove(index, to);
    setFocusKey(`${to}:${step}`);
    setSaid(`Đoạn ${segments[index]?.name ?? index + 1} chuyển sang vị trí ${to + 1}.`);
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
                onFocusCapture={() => onSelect(i)}
                onClick={(ev) => {
                  if (!(ev.target as HTMLElement).closest('input, select, button')) onSelect(i);
                }}
              >
                <td>
                  <span className="inline-flex gap-1">
                    {([-1, 1] as const).map((step) => (
                      <button
                        key={step}
                        ref={(el) => {
                          buttons.current[`${i}:${step}`] = el;
                        }}
                        type="button"
                        className="sp-icon-btn"
                        aria-label={`${step === -1 ? 'Lên' : 'Xuống'}: đoạn ${n}`}
                        title={step === -1 ? 'Lên' : 'Xuống'}
                        disabled={step === -1 ? i === 0 : i === segments.length - 1}
                        onClick={() => moveBy(i, step)}
                      >
                        {step === -1 ? (
                          <ArrowUp size={16} aria-hidden="true" />
                        ) : (
                          <ArrowDown size={16} aria-hidden="true" />
                        )}
                      </button>
                    ))}
                  </span>
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
                        maxLength={40}
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
