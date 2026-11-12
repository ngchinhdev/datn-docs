'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { useCustomerSession } from '@/components/mock/customer-session';
import type { TenantFixture } from '@/mock/fixtures';

/** Brand on the left, the way into the account on the right: the top of every customer page. */
export function CustomerHeader({
  fixture,
  right,
}: {
  fixture: TenantFixture;
  /** Replaces the account link, e.g. nothing on the login page. */
  right?: ReactNode;
}) {
  const { customer, isLoggedIn, email } = useCustomerSession();
  const { tenant } = fixture;
  const initial = customer?.callName?.slice(-1) || customer?.name[0] || email?.[0]?.toUpperCase();
  return (
    <header className="flex items-center justify-between gap-(--space-2) rounded-(--radius-md) bg-(--surface-raised) py-(--space-2) ps-(--space-4) pe-(--space-3) shadow-[0_1px_0_var(--line)]">
      <Link
        href={`/mock/${tenant.slug}`}
        className="flex items-center gap-(--space-3) text-(--ink) no-underline"
      >
        <span
          className="sp-switcher__mark size-8 rounded-lg bg-(--accent-soft) text-sm text-(--accent)"
          aria-hidden="true"
        >
          {tenant.monogram}
        </span>
        <span className="body font-semibold">{tenant.name}</span>
      </Link>
      {right !== undefined
        ? right
        : isLoggedIn && (
            <Link
              href={`/mock/${tenant.slug}/me`}
              className="sp-icon-btn flex size-11 items-center justify-center no-underline"
              aria-label={`Tài khoản của ${customer?.name ?? email}`}
            >
              <span className="sp-avatar sp-avatar--sm">{initial}</span>
            </Link>
          )}
    </header>
  );
}
