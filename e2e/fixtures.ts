import { test as base, expect } from '@playwright/test';

/* Every browser test fails on any console error or uncaught exception. There is no
   analytics, so a CSP violation (which is a console error) or a hydration failure in
   production would otherwise go unnoticed. This is a fixture rather than a pattern copied
   into each test so that a new spec cannot forget it: import `test` from here, never
   from @playwright/test directly. */
export const test = base.extend({
  page: async ({ page }, use) => {
    const errors: string[] = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push(String(e)));
    await use(page);
    expect(errors, 'console errors during the test').toEqual([]);
  },
});

export { expect };
