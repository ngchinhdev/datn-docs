import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** The colour of the line under a figure: the brand colour for good news, red for bad. */
export type Tone = 'good' | 'bad' | 'muted';

const TONE: Record<Tone, string> = {
  good: 'text-(--brand)',
  bad: 'text-(--danger)',
  muted: 'text-(--ink-muted)',
};

/** One figure with its name above and a line of context below, as the reports and Tổng quan draw it. */
export function StatTile({
  label,
  value,
  note,
  tone = 'muted',
  big = false,
}: {
  label: string;
  value: ReactNode;
  note?: ReactNode;
  tone?: Tone;
  /** The larger figure of the phone screens. */
  big?: boolean;
}) {
  return (
    <section className="sp-panel min-w-0 flex-[1_1_180px] gap-1" aria-label={label}>
      <span className="text-[13px] leading-[18px] font-medium text-(--ink-muted)">{label}</span>
      <span
        className={cn(
          'sp-num font-bold tracking-[-0.01em]',
          big ? 'text-[30px] leading-9' : 'text-[26px] leading-8',
        )}
      >
        {value}
      </span>
      {note && <span className={cn('sp-num text-[13px] leading-[18px]', TONE[tone])}>{note}</span>}
    </section>
  );
}

/** A row of tiles that wraps on narrow screens. */
export function StatRow({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap gap-(--space-4)">{children}</div>;
}
