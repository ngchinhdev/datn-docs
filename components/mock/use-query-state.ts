'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

/**
 * One query-string value as state: the URL is the source, so reload and shared links keep it.
 * A value equal to `fallback` is dropped from the URL.
 */
export function useQueryState(key: string, fallback: string) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const value = searchParams.get(key) ?? fallback;

  const set = useCallback(
    (next: string, mode: 'replace' | 'push' = 'replace') => {
      const params = new URLSearchParams(searchParams);
      if (next === fallback) params.delete(key);
      else params.set(key, next);
      const query = params.toString();
      router[mode](query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [fallback, key, pathname, router, searchParams],
  );

  return [value, set] as const;
}
