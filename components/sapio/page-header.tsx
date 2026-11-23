'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Breadcrumb, useShellCrumbs, type Crumb } from './shell-crumbs';

export type { Crumb };

/**
 * Title row of a page in the admin area: optional breadcrumb, title, one line below it, actions.
 * From 768px the crumbs go to the card bar of `AppShell`; below that they stay above the title.
 */
export function PageHeader({
  title,
  sub,
  crumbs,
  actions,
  hideActionsOnPhone = false,
  hideCrumbsOnPhone = false,
}: {
  title: string;
  sub?: ReactNode;
  /** Last crumb is the current page. */
  crumbs?: Crumb[];
  actions?: ReactNode;
  /** The action moves to the phone header (`PhoneHeaderAction`). */
  hideActionsOnPhone?: boolean;
  /** The page already has a way back on phones (a "‹ Dịch vụ" button), so the crumbs go. */
  hideCrumbsOnPhone?: boolean;
}) {
  const inShell = useShellCrumbs(crumbs);
  return (
    <div className="sp-page-head">
      <div className="min-w-0">
        {crumbs && (
          <nav
            aria-label="Vị trí"
            className={cn(hideCrumbsOnPhone && 'max-md:hidden', inShell && 'md:hidden')}
          >
            <Breadcrumb crumbs={crumbs} />
          </nav>
        )}
        <h1 className="sp-page-head__title">{title}</h1>
        {sub && <p className="sp-page-head__sub sp-num">{sub}</p>}
      </div>
      {actions && (
        <div className={cn('sp-page-head__actions', hideActionsOnPhone && 'max-md:hidden!')}>
          {actions}
        </div>
      )}
    </div>
  );
}
