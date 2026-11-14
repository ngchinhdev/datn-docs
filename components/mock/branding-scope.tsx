'use client';

import type { ReactNode } from 'react';
import { tenantFixtures } from '@/mock/fixtures';
import { accentStyle } from '@/mock/shop';
import { useScheduleStore } from './schedule-store';

/**
 * The colour a shop chose (Cài đặt › Thương hiệu, BR-65) for the pages its customers see: the
 * sample colour of the tenant is replaced by it, and left alone while the shop keeps the sample.
 */
export function BrandingScope({
  tenantSlug,
  children,
}: {
  tenantSlug: string;
  children: ReactNode;
}) {
  const { config } = useScheduleStore();
  const base = tenantFixtures.find((f) => f.tenant.slug === tenantSlug) ?? tenantFixtures[0]!;
  const chosen = config.branding.accent;
  const sample = base.config.branding.accent;
  return (
    <div
      className="contents"
      {...(chosen.toLowerCase() === sample.toLowerCase()
        ? {}
        : { style: accentStyle(base.tenant.id, chosen) })}
    >
      {children}
    </div>
  );
}
