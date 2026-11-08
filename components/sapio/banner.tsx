import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Account-wide notice above the page content (Banner README). It cannot be closed, because it
 * states where the account stands; one per page, the most important one.
 */
export function Banner({
  tone = 'info',
  action,
  children,
}: {
  /** `warning` when the plan or the trial is about to end. */
  tone?: 'info' | 'warning';
  action?: { label: string; href: string };
  children: ReactNode;
}) {
  return (
    <div className={cn('sp-banner', tone === 'warning' && 'sp-banner--warning')} role="status">
      <span className="sp-banner__text">{children}</span>
      {action && (
        <Link href={action.href} className="sp-btn sp-btn--primary sp-btn--sm no-underline">
          {action.label}
        </Link>
      )}
    </div>
  );
}
