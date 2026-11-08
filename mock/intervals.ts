/*
 * Half-open integer intervals `[start, end)` and the operations the free-slot algorithm needs.
 * Pure; imports nothing, so Node can run it directly (scripts/check-availability.ts).
 */
export type Interval = readonly [start: number, end: number];

/** Sorted, merged, no empty interval; touching intervals join. */
export function normalize(xs: readonly Interval[]): Interval[] {
  const sorted = xs.filter(([s, e]) => e > s).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const out: [number, number][] = [];
  for (const [s, e] of sorted) {
    const last = out.at(-1);
    if (last && s <= last[1]) last[1] = Math.max(last[1], e);
    else out.push([s, e]);
  }
  return out;
}

export const union = (a: readonly Interval[], b: readonly Interval[]) => normalize([...a, ...b]);

/** Both inputs normalized. */
export function intersect(a: readonly Interval[], b: readonly Interval[]): Interval[] {
  const out: Interval[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    const [as, ae] = a[i]!;
    const [bs, be] = b[j]!;
    const s = Math.max(as, bs);
    const e = Math.min(ae, be);
    if (e > s) out.push([s, e]);
    if (ae < be) i++;
    else j++;
  }
  return out;
}

/** `a` minus `b`, both normalized. */
export function subtract(a: readonly Interval[], b: readonly Interval[]): Interval[] {
  const out: Interval[] = [];
  for (const [s, e] of a) {
    let cursor = s;
    for (const [bs, be] of b) {
      if (be <= cursor) continue;
      if (bs >= e) break;
      if (bs > cursor) out.push([cursor, bs]);
      cursor = Math.max(cursor, be);
    }
    if (cursor < e) out.push([cursor, e]);
  }
  return out;
}

export const shift = (xs: readonly Interval[], by: number): Interval[] =>
  xs.map(([s, e]) => [s + by, e + by]);

export const contains = (xs: readonly Interval[], t: number) =>
  xs.some(([s, e]) => s <= t && t < e);

export const length = (xs: readonly Interval[]) => xs.reduce((sum, [s, e]) => sum + (e - s), 0);

/**
 * Origins `t` for which `[t + a, t + b)` lies inside one interval of `free`. The closed set
 * `[u − a, v − b]` is written half-open as `[u − a, v − b + 1)` on whole minutes.
 */
export function erode(free: readonly Interval[], [a, b]: Interval): Interval[] {
  return normalize(
    free.filter(([u, v]) => v - u >= b - a).map(([u, v]): Interval => [u - a, v - b + 1]),
  );
}

/** Origins for which every interval of `occupation` (relative to the origin) lies inside `free`. */
export function fit(free: readonly Interval[], occupation: readonly Interval[]): Interval[] {
  let result: Interval[] | null = null;
  for (const part of occupation) {
    const origins = erode(free, part);
    result = result ? intersect(result, origins) : origins;
    if (result.length === 0) return [];
  }
  return result ?? [];
}
