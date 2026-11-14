'use client';

import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import type { ReactNode } from 'react';
import { settingsEntries } from '@/components/mock/app-nav';
import { useSubscription } from '@/components/mock/subscription-store';
import { useAppHref } from '@/components/mock/use-app-href';
import { SettingsNav } from '@/components/sapio/settings-nav';
import { staffRoleOf } from '@/mock/selection';

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
  const { can } = useSubscription();
  // A manager reaches Nhân sự only (BR-78); the other settings are the owner's.
  const role = staffRoleOf(useSearchParams().get('role'));
  const entries =
    role === 'manager' ? settingsEntries.filter((e) => e.id === 'staff') : settingsEntries;
  const base = `/mock/app/${tenantSlug}`;
  const isRoot = pathname === `${base}/settings`;
  // A page inside a section ("Dịch vụ › Nhuộm tóc") goes back to the section, not to the menu.
  const section = settingsEntries.find((entry) => pathname.startsWith(`${base}/${entry.path}/`));

  // A detail page with a preview (DetailPage) has no menu; its breadcrumb takes that place.
  const detail = pathname.startsWith(`${base}/settings/services/`);

  return (
    <div className="sp-shell__content">
      <div className="flex flex-wrap items-start gap-(--space-6)">
        {!detail && (
          <SettingsNav
            items={entries.map((entry) => ({
              id: entry.id,
              label: entry.label,
              href: appHref(entry.path),
              locked: entry.feature ? !can(entry.feature) : false,
              current:
                pathname === `${base}/${entry.path}` ||
                pathname.startsWith(`${base}/${entry.path}/`),
            }))}
          />
        )}
        <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-(--space-5)">
          {!isRoot && (
            <Link
              href={appHref(section ? section.path : 'settings')}
              className="sp-btn sp-btn--ghost -ms-(--space-3) self-start no-underline min-[901px]:hidden!"
            >
              <ChevronLeft size={16} aria-hidden="true" />
              {section ? section.label : 'Cài đặt'}
            </Link>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}
