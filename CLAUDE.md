# quietkit — guide for Claude Code

Small developer tools that run in the browser. The product and the architecture are in
`docs/SPEC.md` (Russian; the decisions log at its top is the short version). This file holds
only what you need to work here without re-deriving it. Keep both true when the code moves.

## What is here (as of 2026-09-29)

- Astro 6 in **static** output, Svelte 5 islands, **npm** (not pnpm — the kit's `prepare`
  build needs it; see SPEC § 2.1), `stark-ui-kit` pinned by sha in `package.json`.
- Three tools, deliberately without a shared shell (SPEC § 3.1 step 2): `src/tools/url-encode`,
  `src/tools/timestamp`, `src/tools/nbsp`. Each is `engine.ts` (pure TS) + `engine.test.ts` +
  `Tool.svelte` + a page in `src/pages/tools/`. The duplication between them is the material
  the shell will be lifted from; do not unify them ahead of that.
- No shell, no manifest, no registry, no scaffold yet. The home page lists tools by hand in
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
   there is no analytics. Keep the `consoleErrors` pattern in new specs.

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
npm run verify   # astro check → eslint → vitest → build → check-csp
npm run e2e      # Playwright in Docker (chromium, firefox, webkit, iPhone) against `astro preview`
```

`e2e` runs inside `mcr.microsoft.com/playwright:v1.61.0-noble` (`scripts/e2e.sh`) so the
rendering is identical on the Mac and on laptop-server; frelikh's host-rendered screenshot
baselines only pass on the machine that made them, and this project must not repeat that.
Docker must be running. Port **4330** for dev/preview/e2e: 4321 is the live frelikh service
on laptop-server. There is no screenshot/token/geometry gate yet (SPEC § 2.19); it goes in
before the first shell component.

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
src/lib/urlstate.ts          options ⇄ URL, ?input= read-only
src/tools/<id>/              engine.ts, engine.test.ts, Tool.svelte
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
