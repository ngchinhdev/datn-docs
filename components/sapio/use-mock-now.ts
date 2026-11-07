'use client';

import { useEffect, useState } from 'react';
import { MOCK_NOW } from '@/mock/time';

/** `MOCK_NOW` plus the time since mount, ticking every second. Never reads the wall clock. */
export function useMockNow(): string {
  const [now, setNow] = useState(MOCK_NOW);
  useEffect(() => {
    const mountedAt = performance.now();
    const base = Date.parse(MOCK_NOW);
    const id = setInterval(() => {
      setNow(new Date(base + (performance.now() - mountedAt)).toISOString());
    }, 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}
