/**
 * What the mock keeps in the tab's `sessionStorage`: one key, one entry per store. Pure apart from
 * the three storage functions, which never throw: a browser that refuses storage just forgets.
 */

/** Bump the number when a stored shape changes; an entry under another key is never read. */
export const STORAGE_KEY = 'sapio-mock-v1';

/** Marks of the values JSON cannot carry. */
const BIGINT = '$bigint';
const DATE = '$date';
const SET = '$set';
const MAP = '$map';

const isTagged = (v: unknown, tag: string): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v) && tag in v;

/** JSON text of a value with `bigint`, `Date`, `Set` and `Map` inside; `undefined` fields drop out. */
export function serialize(value: unknown): string {
  return JSON.stringify(value, function (this: Record<string, unknown>, key, v) {
    // `Date.toJSON` runs before the replacer, so the original sits on the holder.
    const original = this[key];
    if (original instanceof Date) return { [DATE]: original.toISOString() };
    if (original instanceof Set) return { [SET]: [...original] };
    if (original instanceof Map) return { [MAP]: [...original] };
    if (typeof v === 'bigint') return { [BIGINT]: v.toString() };
    return v;
  });
}

/** The value `serialize` wrote. */
export function deserialize(text: string): unknown {
  return JSON.parse(text, (_key, v) => {
    if (isTagged(v, BIGINT)) return BigInt(v[BIGINT] as string);
    if (isTagged(v, DATE)) return new Date(v[DATE] as string);
    if (isTagged(v, SET)) return new Set(v[SET] as unknown[]);
    if (isTagged(v, MAP)) return new Map(v[MAP] as [unknown, unknown][]);
    return v;
  });
}

type Slices = Record<string, string>;

let resetting = false;

function readAll(): Slices {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Slices)
      : {};
  } catch {
    return {};
  }
}

/** What a store saved under `name`, or `undefined` when there is nothing or it cannot be read. */
export function readSlice(name: string): unknown {
  try {
    const text = readAll()[name];
    return text === undefined ? undefined : deserialize(text);
  } catch {
    return undefined;
  }
}

export function writeSlice(name: string, value: unknown): void {
  if (resetting) return;
  try {
    window.sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...readAll(), [name]: serialize(value) }),
    );
  } catch {
    // Storage full or blocked: the page goes on with what it holds in memory.
  }
}

/** Forgets everything the mock saved and loads the page again from the sample data. */
export function resetMockData(): void {
  resetting = true;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to clear.
  }
  window.location.reload();
}
