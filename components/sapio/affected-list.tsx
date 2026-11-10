import { Check } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface AffectedRow {
  id: string;
  /** Local time of the appointment, `17:30`. */
  time: string;
  /** Customer and service. */
  title: string;
  /** How the customer chose the person: "Bất kỳ ai" or "Chọn đích danh Lan". */
  choice: { text: string; named: boolean };
  /** Resource, price, deposit. */
  meta: string;
  /** What is planned, waiting or done. */
  fix: ReactNode;
  tone: 'suggest' | 'bad' | 'done' | 'waiting';
  /** Settled: the row is quiet and offers to undo. */
  done: boolean;
  actions: ReactNode;
}

/**
 * The appointments a leave request or a cut shift touches (MH-40): time, who and what, how the
 * customer chose the person, what is planned for it, and the buttons that settle it.
 */
export function AffectedList({ rows, label }: { rows: AffectedRow[]; label: string }) {
  return (
    <ul className="sp-affected" aria-label={label}>
      {rows.map((row) => (
        <li key={row.id} className="sp-affected__item" {...(row.done ? { 'data-done': '' } : {})}>
          <span className="sp-affected__time">{row.time}</span>
          <div className="sp-affected__body">
            <span className="sp-affected__title">
              {row.title}{' '}
              <span
                className={cn(
                  'sp-badge',
                  row.choice.named ? 'sp-badge--pending' : 'sp-badge--confirmed',
                )}
              >
                {row.choice.text}
              </span>
            </span>
            <span className="sp-affected__meta">{row.meta}</span>
            <span
              className={cn(
                'sp-affected__fix',
                row.tone === 'bad' && 'sp-affected__fix--bad',
                row.tone === 'waiting' && 'text-(--ink)!',
              )}
            >
              {row.tone === 'done' && (
                <Check size={14} aria-hidden="true" className="me-1 inline align-[-2px]" />
              )}
              {row.fix}
            </span>
          </div>
          <div className="sp-affected__actions">{row.actions}</div>
        </li>
      ))}
    </ul>
  );
}
