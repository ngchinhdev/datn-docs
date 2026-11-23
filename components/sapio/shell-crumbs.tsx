'use client';

import Link from 'next/link';
import { createContext, useContext, useEffect } from 'react';

export interface Crumb {
  label: string;
  href?: string;
}

/** Set by `AppShell`: where a page puts the crumbs that follow the menu group in the card bar. */
export const ShellCrumbsSetter = createContext<((crumbs: Crumb[] | null) => void) | null>(null);

/**
 * Sends the crumbs of a page to the card bar of `AppShell`. Returns whether a shell took them,
 * so the page knows it need not draw them itself.
 */
export function useShellCrumbs(crumbs: Crumb[] | undefined): boolean {
  const set = useContext(ShellCrumbsSetter);
  const key = crumbs ? JSON.stringify(crumbs) : '';
  useEffect(() => {
    if (!set || !key) return;
    set(JSON.parse(key) as Crumb[]);
    return () => set(null);
  }, [set, key]);
  return set !== null;
}

/** `ol.sp-breadcrumb`; the last crumb is the current page. */
export function Breadcrumb({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <ol className="sp-breadcrumb">
      {crumbs.map((crumb, i) => {
        const last = i === crumbs.length - 1;
        return (
          <li key={`${i}-${crumb.label}`} className="contents">
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
  );
}
