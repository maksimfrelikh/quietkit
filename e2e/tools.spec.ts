import { test, expect, type Page } from '@playwright/test';

/* Smoke tests for the first three tools: the island hydrates under the real CSP, the
   result appears without a button, options land in the URL and the input never does.
   Every test also fails on any console error — a CSP violation is a console error, and
   nothing else would tell us about one in production. */

const consoleErrors = async (page: Page) => {
  const errors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  return errors;
};

test('home lists the tools', async ({ page }) => {
  const errors = await consoleErrors(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('stay on your machine');
  await expect(page.getByRole('link', { name: /URL encode/ })).toBeVisible();
  expect(errors).toEqual([]);
});

test('url-encode: live result, three flavours, URL keeps options but not input', async ({ page }) => {
  const errors = await consoleErrors(page);
  await page.goto('/tools/url-encode');
  const input = page.getByLabel('Input');
  await expect(input).toBeFocused();
  await input.fill('a b&c');
  await expect(page.locator('.field-out').nth(0)).toHaveText('a%20b%26c');
  await expect(page.locator('.field-out').nth(1)).toHaveText('a+b%26c');
  await expect(page.locator('.field-out').nth(2)).toHaveText('a%20b&c');
  await page.getByText('Decode', { exact: true }).click();
  await expect(page).toHaveURL(/\?mode=decode$/);
  await expect(page).not.toHaveURL(/input=/);
  expect(errors).toEqual([]);
});

test('url-encode: deep link seeds the input and decodes a query string', async ({ page }) => {
  await page.goto('/tools/url-encode?mode=decode&input=' + encodeURIComponent('https://x.dev/?q=caf%C3%A9+au+lait&n=1'));
  await expect(page.locator('.field-out').first()).toHaveText('https://x.dev/?q=café au lait&n=1');
  await expect(page.locator('.kv th').first()).toHaveText('q');
  await expect(page.locator('.kv td').first()).toHaveText('café au lait');
  await expect(page).not.toHaveURL(/input=/);
});

test('timestamp: detects the unit and renders the table', async ({ page }) => {
  const errors = await consoleErrors(page);
  await page.goto('/tools/timestamp');
  await page.getByLabel('Timestamp or date').fill('1790683200');
  await expect(page.getByRole('row', { name: /ISO 8601 UTC/ })).toContainText('2026-09-29T12:00:00.000Z');
  await expect(page.getByLabel('Unit')).toContainText('(seconds)');
  await page.getByLabel('Unit').selectOption('milliseconds');
  await expect(page.getByRole('row', { name: /ISO 8601 UTC/ })).toContainText('1970-01-21');
  await expect(page).toHaveURL(/\?unit=milliseconds$/);
  expect(errors).toEqual([]);
});

const placeholderShown = (page: Page) => page.evaluate(() => {
  const el = document.querySelector('.field-out')!;
  return getComputedStyle(el, '::before').content !== 'none' && el.textContent === '';
});

for (const [tz, iso] of [['Asia/Tokyo', '2026-09-29T21:00:00+09:00'], ['UTC', '2026-09-29T12:00:00Z']]) {
  test(`timestamp: a ?tz=${tz} deep link selects that zone on first render`, async ({ page }) => {
    await page.goto(`/tools/timestamp?tz=${tz}&input=1790683200`);
    const select = page.getByLabel('Time zone');
    await expect(select).toHaveValue(tz);
    // The visible text too: a value with no matching <option> renders as a blank control.
    expect(await select.evaluate((el) => (el as HTMLSelectElement).selectedOptions[0]?.text)).toBe(tz);
    await expect(page.getByRole('row', { name: new RegExp(`ISO 8601 in ${tz.replace('/', '\\/')}`) })).toContainText(iso);
  });
}

test('nbsp: highlights added spaces, entity mode, copy text is real', async ({ page }) => {
  const errors = await consoleErrors(page);
  await page.goto('/tools/nbsp');
  expect(await placeholderShown(page)).toBe(true);
  await page.getByLabel('Input').fill('Мы пошли в лес и нашли 5 кг грибов');
  await expect(page.locator('.field-out mark')).toHaveCount(3);
  await expect(page.locator('.field-out')).toHaveText('Мы пошли в лес и нашли 5 кг грибов');
  await expect(page.getByLabel('Text language')).toContainText('(Russian)');
  await page.getByRole('group', { name: 'Output' }).getByText('&nbsp;').click();
  await expect(page.locator('.field-out')).toContainText('в&nbsp;лес');
  await expect(page).toHaveURL(/\?out=entity$/);
  await page.getByLabel('Glue the last two words').check();
  await expect(page).toHaveURL(/out=entity&last=1$/);
  await expect(page.locator('.field-out mark')).toHaveCount(4);
  expect(errors).toEqual([]);
});

test('theme toggle switches and persists without a flash', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');
  const html = page.locator('html');
  await expect(html).not.toHaveAttribute('data-theme');
  await page.getByRole('button', { name: 'Switch theme' }).click();
  await expect(html).toHaveAttribute('data-theme', 'dark');
  await page.goto('/tools/nbsp');
  // Set by the pre-paint bootstrap, i.e. present in the first frame, not after hydration.
  await expect(html).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', { name: 'Switch theme' }).click();
  await expect(html).not.toHaveAttribute('data-theme'); // back to "system"
});
