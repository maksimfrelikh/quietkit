// Post-build CSP check: every inline <script> and <style> in every built page must be
// covered by a hash in that page's <meta http-equiv="content-security-policy">, and no
// element may carry a style="" attribute (a hash cannot allow those). A miss here means
// the page would silently lose hydration or its theme in production — and there is no
// analytics to tell us. Part of `npm run verify`.
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const dist = resolve(new URL('../dist', import.meta.url).pathname);
const pages = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (name.endsWith('.html')) pages.push(p);
  }
})(dist);

const decode = (s) => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
let failed = 0;
for (const page of pages) {
  const html = readFileSync(page, 'utf8');
  const meta = html.match(/<meta http-equiv="content-security-policy" content="([^"]*)"/i)?.[1];
  const rel = page.slice(dist.length);
  if (!meta) { console.error(`${rel}: no CSP meta`); failed++; continue; }
  const allowed = new Set([...decode(meta).matchAll(/'(sha256-[A-Za-z0-9+/=]+)'/g)].map((m) => m[1]));
  const hash = (s) => `sha256-${createHash('sha256').update(s).digest('base64')}`;
  const inlineScripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  const inlineStyles = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]);
  for (const s of inlineScripts) if (!allowed.has(hash(s))) { console.error(`${rel}: inline <script> not allowed by CSP: ${s.slice(0, 60)}…`); failed++; }
  for (const s of inlineStyles) if (!allowed.has(hash(s))) { console.error(`${rel}: inline <style> not allowed by CSP`); failed++; }
  const attrs = html.match(/ style="[^"]*"/g) ?? [];
  if (attrs.length) { console.error(`${rel}: ${attrs.length} style="" attribute(s): ${attrs.slice(0, 3).join(' ')}`); failed++; }
}
if (failed) { console.error(`check-csp: ${failed} problem(s) in ${pages.length} page(s)`); process.exit(1); }
console.log(`check-csp: ok — ${pages.length} pages, every inline script/style hashed, no style attributes`);
