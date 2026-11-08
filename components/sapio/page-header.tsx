import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface Crumb {
  label: string;
  href?: string;
}

/** Title row of a page in the admin area: optional breadcrumb, title, one line below it, actions. */
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
  return (
    <div className="sp-page-head">
      <div className="min-w-0">
        {crumbs && (
          <nav aria-label="Vị trí" className={cn(hideCrumbsOnPhone && 'max-md:hidden')}>
            <ol className="sp-breadcrumb">
              {crumbs.map((crumb, i) => {
                const last = i === crumbs.length - 1;
                return (
                  <li key={crumb.label} className="contents">
                    {i > 0 && <span aria-hidden="true">/</span>}
                    {last || !crumb.href ? (
                      <span aria-current={last ? 'page' : undefined}>{crumb.label}</span>
                    ) : (
                      <Link href={crumb.href}>{crumb.label}</Link>
                    )}
                  </li>
                );
              })}
            </ol>
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
