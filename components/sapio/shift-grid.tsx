import { cn } from '@/lib/utils';

export interface ShiftBlock {
  text: string;
  /** Outside the new shift, or otherwise needing a look. */
  warn?: boolean;
  /** Shown after the text: "!" for appointments without a person. */
  count?: string;
}

export interface ShiftCellData {
  date: string;
  blocks: ShiftBlock[];
  /** The whole day is leave; the badge says whether it is decided. */
  leave?: { status: 'pending' | 'approved' };
  /** Leave for a few hours of the day, shown under the blocks. */
  partialLeave?: string;
  /** No shifts and not editable: the day has no rota, or the branch is closed. */
  fixed?: string;
}

export interface ShiftRowData {
  id: string;
  name: string;
  /** "Thợ chính". */
  title: string;
  /** "49,5 giờ/tuần". */
  hours: string;
  cells: ShiftCellData[];
}

export interface ShiftColumnData {
  date: string;
  /** `T2`. */
  short: string;
  /** `09/11`. */
  label: string;
  /** Long form for labels: "Thứ Hai 09/11". */
  long: string;
}

export interface ShiftFooterCell {
  text: string;
  /** Under the hours, in danger color: "13:00–15:00 không ai trực". */
  warnings?: string[];
}

/**
 * The week's shifts (MH-38): a row per person, a column per day. A cell is one button per block;
 * pressing it edits that day in the panel beside the grid. Scrolls inside its own region when narrow.
 */
export function ShiftGrid({
  label,
  columns,
  rows,
  footer,
  selected,
  onSelect,
}: {
  label: string;
  columns: ShiftColumnData[];
  rows: ShiftRowData[];
  footer: ShiftFooterCell[];
  selected: { rowId: string; date: string } | null;
  onSelect: (rowId: string, date: string) => void;
}) {
  return (
    <div className="sp-table-wrap" tabIndex={0} role="region" aria-label={`${label}, cuộn được`}>
      <table className="sp-shiftgrid">
        <caption className="sp-sr-only">{label}, mỗi hàng một nhân viên</caption>
        <thead>
          <tr>
            <th scope="col">
              <span className="sp-sr-only">Nhân viên</span>
            </th>
            {columns.map((c) => (
              <th key={c.date} scope="col">
                {c.short}
                <small>{c.label}</small>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <th scope="row" className="min-w-[104px]">
                {row.name}
                <small>
                  {row.title}
                  <br />
                  {row.hours}
                </small>
              </th>
              {row.cells.map((cell, i) => {
                const column = columns[i]!;
                const isSelected = selected?.rowId === row.id && selected.date === cell.date;
                const aria = `${row.name}, ${column.long}`;
                return (
                  <td
                    key={cell.date}
                    {...(isSelected ? { 'aria-current': true, 'data-selected': '' } : {})}
                    className="data-selected:bg-(--fill-tonal) data-selected:shadow-[inset_0_0_0_1.5px_var(--brand)]"
                  >
                    {cell.fixed ? (
                      <span
                        className="sp-shift sp-shift--off"
                        aria-label={`${aria}, ${cell.fixed}`}
                      >
                        {cell.fixed}
                      </span>
                    ) : cell.leave ? (
                      <>
                        <button
                          type="button"
                          className="sp-shift sp-shift--leave"
                          aria-label={`${aria}, nghỉ phép, sửa ca`}
                          onClick={() => onSelect(row.id, cell.date)}
                        >
                          Nghỉ phép
                        </button>
                        <span
                          className={cn(
                            'sp-badge mt-0.5',
                            cell.leave.status === 'pending'
                              ? 'sp-badge--pending'
                              : 'sp-badge--confirmed',
                          )}
                        >
                          {cell.leave.status === 'pending' ? 'Chờ duyệt' : 'Đã duyệt'}
                        </span>
                      </>
                    ) : cell.blocks.length === 0 ? (
                      <button
                        type="button"
                        className="sp-shift sp-shift--off"
                        aria-label={`${aria}, nghỉ, thêm ca`}
                        onClick={() => onSelect(row.id, cell.date)}
                      >
                        Nghỉ
                      </button>
                    ) : (
                      <>
                        {cell.blocks.map((block) => (
                          <button
                            key={block.text}
                            type="button"
                            className={cn('sp-shift', block.warn && 'sp-shift--warn')}
                            aria-label={`${aria}, ${block.text}, sửa ca`}
                            onClick={() => onSelect(row.id, cell.date)}
                          >
                            {block.text}
                            {block.count && <span className="sp-shift__count">{block.count}</span>}
                          </button>
                        ))}
                        {cell.partialLeave && (
                          <span className="sp-shift sp-shift--leave">{cell.partialLeave}</span>
                        )}
                      </>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">Mở cửa</th>
            {footer.map((cell, i) => (
              <td key={columns[i]!.date} className="sp-num">
                {cell.text}
                {cell.warnings?.map((w) => (
                  <span key={w} style={{ display: 'block', color: 'var(--danger)' }}>
                    {w}
                  </span>
                ))}
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
