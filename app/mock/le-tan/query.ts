type Params = Record<string, string | string[] | undefined>;

/** Keeps `?tenant=&role=` when moving between mock routes. */
export function keepQuery(params: Params) {
  const q = new URLSearchParams();
  for (const key of ['tenant', 'role']) {
    const value = params[key];
    if (typeof value === 'string') q.set(key, value);
  }
  const s = q.toString();
  return s ? `?${s}` : '';
}
