'use client';

import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { settingsEntries } from '@/components/mock/app-nav';
import { useSubscription } from '@/components/mock/subscription-store';
import { useAppHref } from '@/components/mock/use-app-href';
import { LockIcon } from '@/components/sapio/lock-icon';
import { PageHeader } from '@/components/sapio/page-header';
import { useMediaQuery } from '@/components/sapio/use-media-query';

/** From 900px the first section opens; below that this page is the list of sections. */
export function SettingsIndex({ tenantSlug }: { tenantSlug: string }) {
  const router = useRouter();
  const appHref = useAppHref(tenantSlug);
  const { can } = useSubscription();
  const wide = useMediaQuery('(min-width: 901px)', false);

  useEffect(() => {
    if (wide) router.replace(appHref(settingsEntries[0]!.path));
  }, [wide, router, appHref]);

  return (
    <>
      <PageHeader title="Cài đặt" sub="Chọn một mục để chỉnh." />
      <ul className="sp-cards">
        {settingsEntries.map((entry) => (
          <li key={entry.id}>
            <Link href={appHref(entry.path)} className="sp-cards__item min-h-14">
              <span className="sp-cards__body">
                <span className="sp-cards__title">
                  {entry.label}
                  {entry.feature && !can(entry.feature) && (
                    <span className="sp-sr-only"> (cần nâng gói)</span>
                  )}
                </span>
              </span>
              {entry.feature && !can(entry.feature) && <LockIcon />}
              <ChevronRight size={16} aria-hidden="true" className="text-(--ink-muted)" />
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
