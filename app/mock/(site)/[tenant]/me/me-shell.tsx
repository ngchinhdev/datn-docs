'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, type ReactNode } from 'react';
import { CustomerHeader } from '@/components/mock/customer-header';
import { useCustomerSession } from '@/components/mock/customer-session';
import { cn } from '@/lib/utils';
import { fixtureBySlug } from '@/mock/selection';

/** Pages of the account that exist; the tab bar lists these. */
const BUILT = new Set(['', '/subjects', '/wallet', '/profile']);

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** The account of one shop: header, the tab bar, and a way to the login when there is no session. */
export function MeShell({ tenantSlug, children }: { tenantSlug: string; children: ReactNode }) {
  const fixture = fixtureBySlug(tenantSlug)!;
  const { tenant, template } = fixture;
  const router = useRouter();
  const pathname = usePathname();
  const { isLoggedIn } = useCustomerSession();
  const base = `/mock/${tenantSlug}/me`;
  const subject = template.vocabulary.subject;

  // Sent to the login only when the page opens without a session: a page that logs out goes
  // wherever it likes.
  const hadSession = useRef(isLoggedIn);
  useEffect(() => {
    if (isLoggedIn) hadSession.current = true;
    else if (!hadSession.current) router.replace(`/mock/${tenantSlug}/login`);
  }, [isLoggedIn, router, tenantSlug]);

  const tabs = [
    { path: '', label: 'Lịch hẹn' },
    ...(subject ? [{ path: '/subjects', label: `${capitalize(subject)} của tôi` }] : []),
    { path: '/wallet', label: 'Gói và ví' },
    { path: '/profile', label: 'Thông tin' },
  ].filter((t) => BUILT.has(t.path));

  if (!isLoggedIn) return null;
  return (
    <div
      className={cn(
        `sp-tenant-${tenant.id}`,
        'mx-auto flex w-full max-w-[560px] flex-col gap-(--space-5)',
      )}
    >
      <CustomerHeader fixture={fixture} />
      <nav aria-label="Tài khoản" className="flex gap-(--space-1) overflow-x-auto">
        {tabs.map((tab) => {
          const href = base + tab.path;
          const current =
            tab.path === ''
              ? pathname.startsWith(`${base}/appointments`) || pathname === base
              : pathname === href;
          return (
            <Link
              key={tab.path}
              href={href}
              aria-current={current ? 'page' : undefined}
              className={cn(
                'body min-h-11 flex-none rounded-(--radius-pill) px-(--space-4) py-(--space-2) no-underline',
                current
                  ? 'bg-(--accent-soft) font-semibold text-(--accent)'
                  : 'text-(--ink-muted) hover:bg-(--surface-hover)',
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
      {children}
    </div>
  );
}
