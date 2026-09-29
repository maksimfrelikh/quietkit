/* Options live in the URL so a configured tool can be linked to. The asymmetry is the
   rule (docs/SPEC.md § 2.8): `?input=` is READ for deep links, never written — user data
   would land in history, referrers and proxy logs otherwise. Only keys listed by the tool
   are read or written; everything else in the query string is left alone. */

export function readOptions<T extends Record<string, string>>(defaults: T): T {
  if (typeof location === 'undefined') return { ...defaults };
  const q = new URLSearchParams(location.search);
  const out = { ...defaults };
  for (const key of Object.keys(defaults) as (keyof T)[]) {
    const v = q.get(String(key));
    if (v !== null) out[key] = v as T[keyof T];
  }
  return out;
}

/* The seed is captured once per page (MPA: one page, one tool) so that the order in which
   a tool's mount hooks and URL-writing effects run cannot lose it — writeOptions strips
   ?input= from the address bar, and it does so after capturing. */
let seed: string | null | undefined;

export function readInput(): string | null {
  if (seed !== undefined) return seed;
  if (typeof location === 'undefined') return null;
  seed = new URLSearchParams(location.search).get('input');
  return seed;
}

export function writeOptions<T extends Record<string, string>>(options: T, defaults: T): void {
  if (typeof history === 'undefined') return;
  readInput();
  const q = new URLSearchParams(location.search);
  for (const key of Object.keys(defaults)) {
    if (options[key] === defaults[key]) q.delete(key);
    else q.set(key, options[key]);
  }
  q.delete('input');
  const search = q.toString();
  history.replaceState(null, '', location.pathname + (search ? `?${search}` : ''));
}
