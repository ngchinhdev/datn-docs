'use client';

import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { readSlice, writeSlice } from '@/mock/persist';

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * `useState` that keeps its value in the tab's `sessionStorage` under `name`. The first render
 * always uses `initial`, so the server and the browser agree; the saved value is read after the
 * component mounts. Returns `hydrated` once that read is done, so a page that sends someone away
 * for having no session can wait for it.
 */
export function usePersistedState<T>(
  name: string,
  initial: T | (() => T),
): [T, Dispatch<SetStateAction<T>>, boolean] {
  const [value, setValue] = useState<T>(initial);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const saved = readSlice(name);
    if (saved !== undefined) {
      // A record is laid over the initial one, so a field added later still has its sample value.
      setValue((cur) =>
        isRecord(cur) && isRecord(saved) ? ({ ...cur, ...saved } as T) : (saved as T),
      );
    }
    setHydrated(true);
  }, [name]);

  useEffect(() => {
    if (hydrated) writeSlice(name, value);
  }, [hydrated, name, value]);

  return [value, setValue, hydrated];
}
