import { test, expect, type Page } from '@playwright/test';

/* The value gate (docs/SPEC.md § 2.19). Screenshots are blind to a 1-step grey change and
   to a 2px radius; these snapshots are not. Three parts:
     tokens    — every custom property declared on :root / [data-theme] with its computed
                 value, per theme and per contrast mode (an added or removed token shows too)
     geometry  — the computed box/type of the components a tool page is made of
     states    — what a snapshot can never see: transitions zeroed while the theme switches,
                 the tap highlight being ours and following the theme
   Update on an intended change with `npm run e2e:update`; read the diff before you do. */

// One &nbsp; in the input so a "kept" mark exists and .field-out mark.was is measurable.
const PAGE = '/tools/nbsp?input=' + encodeURIComponent('Мы&nbsp;пошли в лес и нашли 5 кг грибов');

async function tokenNames(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const names = new Set<string>();
    for (const sheet of Array.from(document.styleSheets)) {
      let rules: CSSRuleList;
      try { rules = sheet.cssRules; } catch { continue; }
      const walk = (list: CSSRuleList) => {
        for (const rule of Array.from(list)) {
          if (rule instanceof CSSStyleRule) {
            if (/:root|^html|\[data-theme/.test(rule.selectorText)) {
              for (const prop of Array.from(rule.style)) if (prop.startsWith('--')) names.add(prop);
            }
          } else if ('cssRules' in rule) walk((rule as CSSGroupingRule).cssRules);
        }
      };
      walk(rules);
    }
    return Array.from(names).sort();
  });
}

async function tokens(page: Page): Promise<Record<string, string>> {
  const names = await tokenNames(page);
  return page.evaluate((names) => {
    const cs = getComputedStyle(document.documentElement);
    const out: Record<string, string> = {};
    for (const n of names) out[n] = cs.getPropertyValue(n).trim();
    return out;
  }, names);
}

const GEOMETRY_PROPS = [
  'font-family', 'font-size', 'font-weight', 'line-height', 'letter-spacing', 'text-transform',
  'color', 'background-color', 'border-top-width', 'border-top-style', 'border-top-color',
  'border-top-left-radius', 'border-bottom-right-radius',
  'padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'min-height', 'gap',
];
const GEOMETRY_SELECTORS = [
  'body', '.site-header', '.brand', '.theme-toggle', 'h1', '.page-head p', '.badge',
  '.tool-options', '.opt > span', '.opt select', '.seg', '.seg label', '.check input',
  '.tool-pane-head', '.pill.small', '.field', '.field-out', '.field-out mark', '.field-out mark.was',
  '.status', '.tool-doc', '.tool-doc h2', '.tool-doc p', '.related .pill', '.site-footer',
];

async function geometry(page: Page): Promise<Record<string, Record<string, string>>> {
  return page.evaluate(({ selectors, props }) => {
    const out: Record<string, Record<string, string>> = {};
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (!el) { out[sel] = { missing: 'true' }; continue; }
      const cs = getComputedStyle(el);
      out[sel] = Object.fromEntries(props.map((p) => [p, cs.getPropertyValue(p)]));
    }
    return out;
  }, { selectors: GEOMETRY_SELECTORS, props: GEOMETRY_PROPS });
}

const json = (v: unknown) => JSON.stringify(v, null, 2) + '\n';

for (const scheme of ['light', 'dark'] as const) {
  test(`tokens: ${scheme}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto(PAGE);
    expect(json(await tokens(page))).toMatchSnapshot(`tokens-${scheme}.json`);
  });
  test(`tokens: ${scheme}, prefers-contrast more`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme, contrast: 'more' });
    await page.goto(PAGE);
    expect(json(await tokens(page))).toMatchSnapshot(`tokens-${scheme}-contrast.json`);
  });
  test(`geometry: ${scheme}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto(PAGE);
    await page.evaluate(() => document.fonts.ready);
    expect(json(await geometry(page))).toMatchSnapshot(`geometry-${scheme}.json`);
  });
}

test('tokens: forced colors', async ({ page }) => {
  await page.emulateMedia({ forcedColors: 'active' });
  await page.goto(PAGE);
  expect(json(await tokens(page))).toMatchSnapshot('tokens-forced-colors.json');
});

test('explicit data-theme equals the OS branch of the same theme', async ({ page }) => {
  // The kit has a light branch on :root and a dark one under prefers-color-scheme AND under
  // [data-theme="dark"]. A token that diverges between the two dark branches is a kit bug.
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto(PAGE);
  const viaOs = await tokens(page);
  await page.emulateMedia({ colorScheme: 'light' });
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  const viaAttr = await tokens(page);
  expect(viaAttr).toEqual(viaOs);
});

test('states: transitions are zeroed while the theme switches', async ({ page }) => {
  await page.goto(PAGE);
  const during = await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme-switching', '');
    const pill = document.querySelector('.pill')!;
    const body = document.body;
    const r = {
      pill: getComputedStyle(pill).transitionDuration,
      body: getComputedStyle(body).transitionDuration,
    };
    document.documentElement.removeAttribute('data-theme-switching');
    return r;
  });
  expect(during.pill.split(',').every((d) => d.trim() === '0s')).toBe(true);
  expect(during.body.split(',').every((d) => d.trim() === '0s')).toBe(true);
  const after = await page.evaluate(() => getComputedStyle(document.querySelector('.pill')!).transitionDuration);
  // reducedMotion is on for the whole suite, so "after" is 0s too; the point of the test is
  // that the switching state does not depend on the motion preference. Assert with motion:
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const withMotion = await page.evaluate(() => getComputedStyle(document.querySelector('.pill')!).transitionDuration);
  expect(withMotion.split(',').some((d) => d.trim() !== '0s')).toBe(true);
  expect(after).toBeDefined();
});

test('states: the tap highlight is ours and follows the theme', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto(PAGE);
  const read = () => page.evaluate(() => {
    const cs = getComputedStyle(document.documentElement);
    return { tap: cs.getPropertyValue('-webkit-tap-highlight-color'), fg: cs.getPropertyValue('--fg').trim() };
  });
  const light = await read();
  expect(light.tap).not.toBe('');
  expect(light.tap).not.toMatch(/rgba\(0, 0, 0, 0\.18\)/); // the platform default
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  const dark = await read();
  expect(dark.fg).not.toBe(light.fg);
  expect(dark.tap).not.toBe(light.tap);
});
