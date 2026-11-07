'use client';

import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { settingsEntries } from '@/components/mock/app-nav';
import { useAppHref } from '@/components/mock/use-app-href';
import { SettingsNav } from '@/components/sapio/settings-nav';

/**
 * Settings pages: the menu on the left from 900px; below that the menu is the page `/settings`
 * and each section shows a way back.
 */
export function SettingsFrame({
  tenantSlug,
  children,
}: {
  tenantSlug: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const appHref = useAppHref(tenantSlug);
  const base = `/mock/app/${tenantSlug}`;
  const isRoot = pathname === `${base}/settings`;

  return (
    <div className="sp-shell__content">
      <div className="flex flex-wrap items-start gap-(--space-6)">
        <SettingsNav
          items={settingsEntries.map((entry) => ({
            id: entry.id,
            label: entry.label,
            href: appHref(entry.path),
            current:
              pathname === `${base}/${entry.path}` || pathname.startsWith(`${base}/${entry.path}/`),
          }))}
        />
        <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-(--space-5)">
          {!isRoot && (
            <Link
              href={appHref('settings')}
              className="sp-btn sp-btn--ghost -ms-(--space-3) self-start no-underline min-[901px]:hidden!"
            >
              <ChevronLeft size={16} aria-hidden="true" />
              Cài đặt
            </Link>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}
