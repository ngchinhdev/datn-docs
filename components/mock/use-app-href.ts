'use client';

import { useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

/** Query keys that follow the user between pages of `/mock/app`: who is looking and which plan is being tried. */
const KEPT = ['role', 'branch', 'plan', 'periodEnd', 'branches'] as const;

/** Builds a link inside `/mock/app/[tenant]` that keeps the keys above. */
export function useAppHref(tenantSlug: string) {
  const searchParams = useSearchParams();
  return useCallback(
    (path: string, extra: Record<string, string | undefined> = {}) => {
      const params = new URLSearchParams();
      for (const key of KEPT) {
        const value = searchParams.get(key);
        if (value) params.set(key, value);
      }
      for (const [key, value] of Object.entries(extra)) {
        if (value === undefined) params.delete(key);
        else params.set(key, value);
      }
      const query = params.toString();
      const base = `/mock/app/${tenantSlug}${path ? `/${path}` : ''}`;
      return query ? `${base}?${query}` : base;
    },
    [searchParams, tenantSlug],
  );
}
