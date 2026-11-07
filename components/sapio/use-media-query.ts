'use client';

import { useSyncExternalStore } from 'react';

/** Follows a CSS media query; `serverValue` is what the first render assumes. */
export function useMediaQuery(query: string, serverValue = true) {
  return useSyncExternalStore(
    (callback) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', callback);
      return () => list.removeEventListener('change', callback);
    },
    () => window.matchMedia(query).matches,
    () => serverValue,
  );
}
