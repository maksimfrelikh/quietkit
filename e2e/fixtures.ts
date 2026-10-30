import { test as base, expect, type Page } from '@playwright/test';

/* Every browser test fails on any console error or uncaught exception. There is no
   analytics, so a CSP violation (which is a console error) or a hydration failure in
   production would otherwise go unnoticed. This is a fixture rather than a pattern copied
   into each test so that a new spec cannot forget it: import `test` from here, never
   from @playwright/test directly. */
/* WebKit in Playwright 1.64 reports a style-src-attr CSP violation from Svelte's own feature
   detection (svelte/src/internal/client/dom/elements/customizable-select.js sets
   `select.innerHTML = '<option><span>t</span></option>'` on a detached element). Nothing of ours
   is refused: the violation's sample is empty, the DOM has no style attribute, and the Astro 6
   build of 2026-10-01 logs the same line under this WebKit while the 1.61 WebKit was silent.
   Ignored by exact text and only in WebKit — chromium and firefox still fail on any inline-style
   violation, and `npm run csp` rejects style attributes at build time. Seen 2026-10-11. */
const WEBKIT_SVELTE_SELECT_NOISE =
  "Refused to apply a stylesheet because its hash, its nonce, or 'unsafe-inline' does not appear in the style-src directive of the Content Security Policy.";

export const test = base.extend({
  page: async ({ page, browserName }, use) => {
    const errors: string[] = [];
    page.on('console', (m) => {
      if (m.type() !== 'error') return;
      if (browserName === 'webkit' && m.text() === WEBKIT_SVELTE_SELECT_NOISE) return;
      errors.push(m.text());
    });
    page.on('pageerror', (e) => errors.push(String(e)));
    await use(page);
    expect(errors, 'console errors during the test').toEqual([]);
  },
});

/* Islands hydrate once their chunks arrive, and the input pane focuses itself on mount
   (TextInput's autofocus). Against the live site that can land after a test has already
   blurred or measured the page, so the value and pixel gates wait for every island first:
   Astro drops `ssr` from an <astro-island> after its component has rendered. Seen 2026-10-30:
   two runs against quietkit.frelikh.dev failed 7 and 6 shots or geometries, a different set
   each time (the focus ring, output marks not rendered yet), on files that passed 66/66 locally. */
export async function hydrated(page: Page) {
  await page.waitForFunction(() => !document.querySelector('astro-island[ssr]'));
}

export { expect };
