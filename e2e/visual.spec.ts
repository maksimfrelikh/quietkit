import { test, expect, type Page } from '@playwright/test';

/* Pixel gate: composition and layout, which values cannot express. Rendered inside the
   Playwright Docker image only (scripts/e2e.sh), so the baselines are the same file on
   every machine. Pages are loaded with deterministic input through the read-only ?input=
   deep link; the one live value (the relative time) is masked. The sticky header is masked
   in the full-page shots (stitching moves it) and covered by its own element shot. */

const pages: [string, string][] = [
  ['home', '/'],
  ['url-encode', '/tools/url-encode?input=' + encodeURIComponent('https://example.com/search?q=café & crème#top')],
  ['url-decode', '/tools/url-encode?mode=decode&input=' + encodeURIComponent('https://x.dev/?q=caf%C3%A9+au+lait&n=1')],
  ['timestamp', '/tools/timestamp?tz=UTC&input=1790683200'],
  ['nbsp', '/tools/nbsp?input=' + encodeURIComponent('Мы с тобой пойдём в лес за грибами — А. С. Пушкин собрал бы 5 кг, и т. д.')],
];

async function settle(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
}

for (const scheme of ['light', 'dark'] as const) {
  for (const [name, url] of pages) {
    test(`${name} ${scheme}`, async ({ page }, info) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto(url);
      await settle(page);
      const device = info.project.name.replace('visual-', '');
      await expect(page).toHaveScreenshot(`${name}-${scheme}-${device}.png`, {
        fullPage: true,
        mask: [page.locator('.site-header'), page.getByRole('row', { name: /Relative/ })],
      });
    });
  }
  test(`header ${scheme}`, async ({ page }, info) => {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto('/');
    await settle(page);
    const device = info.project.name.replace('visual-', '');
    await expect(page.locator('.site-header')).toHaveScreenshot(`header-${scheme}-${device}.png`);
  });
}
