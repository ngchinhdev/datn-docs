import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface BottomBarProps {
  title: string;
  subtitle?: string | undefined;
  action: ReactNode;
  /** Fixed to the viewport bottom below 900px; static inside the desktop column. */
  className?: string;
}

export function BottomBar({ title, subtitle, action, className }: BottomBarProps) {
  return (
    <div
      className={cn(
        'fixed inset-x-0 bottom-0 z-40 flex items-center gap-(--space-3) bg-(--surface-raised) px-(--space-4) pt-(--space-3) pb-(--space-5) shadow-[0_-1px_0_var(--line)] min-[900px]:static min-[900px]:z-auto min-[900px]:p-0 min-[900px]:shadow-none',
        className,
      )}
    >
      <div className="flex min-w-0 grow flex-col">
        <span className="body sp-num font-semibold">{title}</span>
        {subtitle && <span className="body-sm text-(--ink-muted)">{subtitle}</span>}
      </div>
      {action}
    </div>
  );
}
