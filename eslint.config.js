import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import svelte from 'eslint-plugin-svelte';
import astro from 'eslint-plugin-astro';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['dist/', '.astro/', 'node_modules/'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...svelte.configs['flat/recommended'],
  ...astro.configs.recommended,
  {
    // Runes modules (*.svelte.ts) go through the Svelte parser too and need the TS parser
    // inside it, or `export type` is a parsing error (seen 2026-10-01 on options.svelte.ts).
    files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
    languageOptions: { parserOptions: { parser: tseslint.parser } },
  },
  {
    files: ['src/**/*.{ts,svelte,astro}', 'scripts/**/*.mjs', '*.{js,mjs,ts}'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },
  {
    // Discipline rule 1 (docs/SPEC.md § 3.6): engine.ts is pure TS. No framework, no DOM,
    // no Node. This is what makes workers, the server executor and a framework swap possible.
    files: ['src/tools/*/engine.ts', 'src/tools/*/engine.*.ts', 'src/core/**/*.ts'],
    ignores: ['**/*.test.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          { group: ['svelte', 'svelte/*', 'react', 'react/*', 'react-dom'], message: 'engine.ts must not import a UI framework.' },
          { group: ['node:*', 'fs', 'path', 'os', 'child_process'], message: 'engine.ts must not import Node built-ins.' },
          { group: ['~/components/*', '~/layouts/*', '~/pages/*'], message: 'engine.ts must not import UI.' },
        ],
      }],
      'no-restricted-globals': ['error',
        { name: 'document', message: 'engine.ts has no DOM.' },
        { name: 'window', message: 'engine.ts has no DOM.' },
        { name: 'navigator', message: 'engine.ts has no DOM.' },
        { name: 'localStorage', message: 'engine.ts has no storage.' },
      ],
    },
  },
);
