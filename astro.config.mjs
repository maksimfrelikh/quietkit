import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// The one inline script we author — the theme bootstrap in Base.astro — is hashed here at
// config time, so the CSP follows the source automatically. Astro hashes its own inline
// scripts (island hydration) and styles itself; scripts/check-csp.mjs verifies the built
// pages afterwards. Structural directives that a <meta> CSP cannot carry (frame-ancestors)
// live in deploy/nginx.conf.
const base = readFileSync(fileURLToPath(new URL('./src/layouts/Base.astro', import.meta.url)), 'utf8');
// Anchored to a line start: a comment that merely mentions the tag mid-sentence must not
// be hashed instead of the script (it happened on 2026-10-01; check-csp caught it).
const inline = [...base.matchAll(/^\s*<script is:inline>([\s\S]*?)<\/script>/gm)].map((m) => m[1]);
if (inline.length !== 1) throw new Error(`Base.astro must contain exactly one <script is:inline>, found ${inline.length}`);
const bootstrapHash = `sha256-${createHash('sha256').update(inline[0]).digest('base64')}`;

// Static site: every tool page is known at build time, nginx serves the files directly.
// Server-side tools (class C) will live in a separate process behind /api/ — never here.
export default defineConfig({
  site: 'https://quietkit.frelikh.dev',
  output: 'static',
  trailingSlash: 'never',
  integrations: [svelte()],
  build: {
    // Keep every stylesheet an external <link>; inline <style> would need a hash per page.
    inlineStylesheets: 'never',
  },
  markdown: { syntaxHighlight: false },
  security: {
    csp: {
      algorithm: 'SHA-256',
      directives: [
        "default-src 'self'",
        "img-src 'self' data: blob:",
        "font-src 'self'",
        "connect-src 'self'",
        "worker-src 'self' blob:",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ],
      scriptDirective: { hashes: [bootstrapHash] },
    },
  },
  vite: {
    resolve: {
      alias: { '~': fileURLToPath(new URL('./src', import.meta.url)) },
    },
  },
});
