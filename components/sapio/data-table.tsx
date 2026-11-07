'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface Column<T> {
  key: string;
  label: string;
  /** Numbers align to the end and stand in columns. */
  numeric?: boolean;
  sortable?: boolean;
  /** Header text only for screen readers, e.g. the action column. */
  labelHidden?: boolean;
  /** Fixed width (px, or a share like "15%"); one column without it takes the rest. Keeps columns from moving when the rows change. */
  width?: number | string;
  cell: (row: T) => ReactNode;
}

export interface SortState {
  key: string;
  dir: 'asc' | 'desc';
}

/**
 * The list pattern (MH-08): a card whose table scrolls inside it, header row and footer fixed.
 * Below 768px the rows become cards (`cards`), so nothing scrolls sideways.
 */
export function DataTable<T>({
  label,
  columns,
  rows,
  rowKey,
  sort,
  onSort,
  cards,
  foot,
  phoneFoot,
}: {
  /** What the list is, for the scroll region: "Danh sách khách hàng". */
  label: string;
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  sort?: SortState;
  onSort?: (key: string) => void;
  /** One card per row for phones. */
  cards: (row: T) => ReactNode;
  foot: ReactNode;
  phoneFoot: ReactNode;
}) {
  return (
    <>
      <div className="sp-table-card max-md:hidden!">
        <div
          className="sp-table-wrap"
          tabIndex={0}
          role="region"
          aria-label={`${label}, cuộn được`}
        >
          <table className="sp-table min-w-[860px] table-fixed">
            <colgroup>
              {columns.map((col) => (
                <col key={col.key} style={col.width ? { width: col.width } : undefined} />
              ))}
            </colgroup>
            <thead>
              <tr>
                {columns.map((col) => {
                  const active = sort?.key === col.key;
                  const ariaSort = active
                    ? sort.dir === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : undefined;
                  return (
                    <th
                      key={col.key}
                      scope="col"
                      aria-sort={ariaSort ?? (col.sortable ? 'none' : undefined)}
                      className={cn('uppercase', col.numeric && 'sp-table__num')}
                    >
                      {col.labelHidden ? (
                        <span className="sr-only">{col.label}</span>
                      ) : col.sortable ? (
                        <button
                          type="button"
                          className="inline-flex cursor-pointer items-center uppercase gap-1 border-0 bg-transparent p-0 font-[inherit] text-[inherit] hover:text-(--ink)"
                          onClick={() => onSort?.(col.key)}
                        >
                          {col.label}
                          {active && (
                            <span aria-hidden="true">{sort.dir === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </button>
                      ) : (
                        col.label
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={rowKey(row)}>
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        col.numeric && 'sp-table__num',
                        col.labelHidden && 'sp-table__actions',
                      )}
                    >
                      {col.cell(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {foot}
      </div>

      <div className="flex flex-col gap-(--space-3) md:hidden">
        <ul className="sp-cards" aria-label={label}>
          {rows.map((row) => (
            <li key={rowKey(row)}>{cards(row)}</li>
          ))}
        </ul>
        {phoneFoot}
      </div>
    </>
  );
}
