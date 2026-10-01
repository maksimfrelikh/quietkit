# quietkit — guide for Claude Code

Small developer tools that run in the browser. The product and the architecture are in
`docs/SPEC.md` (Russian; the decisions log at its top is the short version). This file holds
only what you need to work here without re-deriving it. Keep both true when the code moves.

## What is here (as of 2026-10-01)

- Astro 6 in **static** output, Svelte 5 islands, **npm** (not pnpm — the kit's `prepare`
  build needs it; see SPEC § 2.1), `stark-ui-kit` pinned by sha in `package.json`.
- Three tools: `src/tools/url-encode`, `src/tools/timestamp`, `src/tools/nbsp`. Each is
  `engine.ts` (pure TS) + `engine.test.ts` + `Tool.svelte` + a page in `src/pages/tools/`.
- **The shell** (`src/ui/shell/`, SPEC § 2.8) was lifted from those three after they were
  written without one, and the refactor onto it was pixel-identical under the visual gate.
  It is only what all three needed: `Tool` (grid + status line via context), `Options`, `IO`,
  `Pane`/`PaneHead`, `PillButton`, `CopyButton`, `TextInput` (autofocus, Example, Clear),
  `TextOutput`, `KeyValue`, `Segmented`, `SelectOption`, `Checkbox`, and `urlOptions` /
  `seededInput` for state ⇄ URL. Rule: something two tools need stays in the tools;
  three, and it moves here. No `if (toolId …)` in the shell, ever.
- No manifest, no registry, no scaffold yet. The home page lists tools by hand in
  `src/pages/index.astro`; that is temporary and known.

## Rules that are enforced

1. **`engine.ts` is pure TS.** No Svelte, React, DOM, Node. ESLint `no-restricted-imports`
   and `no-restricted-globals` on `src/tools/*/engine*.ts` and `src/core/**` (`eslint.config.js`).
   Tests run in Node with no DOM (`vitest.config.ts`); a test that needs a browser is a sign
   the code belongs in `Tool.svelte`.
2. **No colours, no px spacing, no font sizes in tool components.** Classes and kit tokens
   only; shared tool classes live in `src/styles/app.css`. Kit values are never copied by hand
   (kit `CLAUDE.md` rule 6).
3. **No `style=""` attributes anywhere.** The CSP has no `unsafe-inline` and a hash cannot
   allow an attribute. `npm run csp` fails the build on one. Use a class.
4. **`?input=` is read, never written** (`src/lib/urlstate.ts`). Options go to the URL, user
   data never does.
5. **Nothing the user typed or produced is stored** in the browser beyond the future handoff
   TTL. Only settings (`quietkit_theme`) in localStorage.
6. **Every browser test fails on any console error** — that is how a CSP violation surfaces,
   there is no analytics. `e2e/fixtures.ts` does it for every test: import `test` from there,
   never from `@playwright/test` directly.

## CSP: how it is produced, how it breaks

`astro.config.mjs` enables `security.csp`: Astro emits a `<meta http-equiv=…>` per page with
hashes of its own inline island scripts and styles; the theme bootstrap in
`src/layouts/Base.astro` (the one `<script is:inline>`) is hashed from source at config
time. `deploy/nginx.conf` sends only `frame-ancestors`; **never add `script-src` or
`style-src` there**, both policies apply and the stricter one wins silently.
`scripts/check-csp.mjs` verifies the built pages. Dev mode (`astro dev`) does not apply the
CSP; use `npm run build:nocheck && npm run preview` to test it.

## Gates

```
npm run verify       # astro check → eslint → vitest → build → check-csp
npm run e2e          # Playwright in Docker: builds, then serves dist/ with `astro preview`
npm run e2e:update   # same, rewriting the snapshots — read the diff first
```

Three Playwright suites, one Docker image (`scripts/e2e.sh`), all building `dist/` first
(the preview server serves the last build; before 2026-09-29 the config skipped the build and
the gate stayed green through a real change):

- `e2e/tools.spec.ts` — behaviour, in chromium / firefox / webkit / iPhone.
- `e2e/gate.spec.ts` — **values** (SPEC § 2.19): every custom property with its computed value
  per theme and contrast mode, the computed geometry of the tool-page components, and the two
  transition states a screenshot never sees (transitions zeroed during a theme switch, the
  tap highlight being ours). Chromium only; the values are browser-independent.
- `e2e/visual.spec.ts` — **pixels**, desktop 1280×900 and iPhone 13, light and dark, with the
  sticky header masked in full-page shots and covered by its own shot. `maxDiffPixels: 0`.

Baselines are committed under `e2e/__snapshots__/`. The gate was proven to go red on a
0.05rem change of `--field-pad` (tokens, geometry and 8 page shots) before its first commit;
prove it again the same way if you ever doubt it.

`e2e` runs inside `mcr.microsoft.com/playwright:v1.61.0-noble` (`scripts/e2e.sh`) so the
rendering is identical on the Mac and on laptop-server; frelikh's host-rendered screenshot
baselines only pass on the machine that made them, and this project must not repeat that.
The container runs as the host user: as root it left root-owned files in `dist/`,
`node_modules/.vite/deps` and the snapshots, and `astro check` on the host failed on them.
`E2E_BASE_URL=https://quietkit.frelikh.dev npm run e2e` runs the same tests against the live
site (no local server) — do it after every deploy; it is the production check of hydration
and CSP. Docker must be running. Port **4330** for dev/preview/e2e: 4321 is the live frelikh service
on laptop-server.

## Theme

Stored preference is `dark` | `light` in `localStorage['quietkit_theme']`; no key means
"system" and then `data-theme` is NOT set, so the kit follows `prefers-color-scheme`. The
light theme is called `light` (frelikh's `white` is historical). `src/scripts/site.ts` is the
toggle; picking what the OS shows anyway removes the key.

## Where things are

```
src/layouts/Base.astro       head, kit CSS imports, theme bootstrap, header/footer
src/components/ToolPage.astro  frame of a tool page: h1, badge, island slot, doc slot, related
src/styles/app.css           the app layer over the kit; shared .tool-* classes
src/lib/urlstate.ts          options ⇄ URL, ?input= read-only (seed captured once per page)
src/ui/shell/                the tool shell; index.ts is the import surface
src/tools/<id>/              engine.ts, engine.test.ts, Tool.svelte (on the shell)
src/pages/tools/<id>.astro   page = ToolPage + island + prose text (description, examples, FAQ)
e2e/                         Playwright smoke tests; playwright.config.ts; scripts/e2e.sh
deploy/nginx.conf            the site block; DEPLOY.md is the chain
docs/SPEC.md                 product + architecture; decisions log at the top
```

## Two machines

Dev clones: `~/projects/quietkit` on the owner's Mac and on laptop-server; prod checkout
`/var/www/quietkit` on laptop-server, updated only by the deploy. Sync only through GitHub
`main`: `git pull --ff-only` before editing. The kit is fetched over `git+ssh`; in a
non-interactive shell on laptop-server set `SSH_AUTH_SOCK=/run/user/1000/ssh-tpm-agent.sock`
before `npm ci`.
