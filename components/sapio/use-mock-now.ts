'use client';

import { useEffect, useState } from 'react';
import { MOCK_NOW } from '@/mock/time';

/**
 * `from` (`MOCK_NOW` by default) plus the time since mount, ticking every second. Never reads
 * the wall clock. A page that carries on from another one passes the time the first one ended at.
 */
export function useMockNow(from: string = MOCK_NOW): string {
  const [now, setNow] = useState(from);
  useEffect(() => {
    const mountedAt = performance.now();
    const base = Date.parse(from);
    const id = setInterval(() => {
      setNow(new Date(base + (performance.now() - mountedAt)).toISOString());
    }, 1000);
    return () => clearInterval(id);
  }, [from]);
  return now;
}
