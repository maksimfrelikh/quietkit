import { defineConfig, devices } from '@playwright/test';

// Runs INSIDE the Playwright Docker image (npm run e2e), so the browsers and their
// rendering are identical on the Mac and on laptop-server — the frelikh screenshot gate
// taught us that host-rendered baselines only pass on the machine that made them.
// Port 4330: 4321 (Astro's default) is the live frelikh service on laptop-server.
// E2E_BASE_URL=https://quietkit.frelikh.dev npm run e2e — runs the same tests against a live
// deploy (no local server started). Used to confirm hydration + CSP in production.
const live = process.env.E2E_BASE_URL || undefined;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'list',
  // Snapshots live next to the tests, named by test file and argument only: the gate and
  // visual projects each run in ONE browser, so the project name would only add noise.
  snapshotPathTemplate: '{testDir}/__snapshots__/{testFileName}/{arg}{ext}',
  expect: {
    toHaveScreenshot: { maxDiffPixels: 0, threshold: 0.05, animations: 'disabled', caret: 'hide' },
  },
  use: {
    baseURL: live ?? 'http://127.0.0.1:4330',
    trace: 'retain-on-failure',
    // Determinism for every project: no motion, 1x pixels.
    reducedMotion: 'reduce',
    deviceScaleFactor: 1,
  },
  webServer: live ? undefined : {
    command: 'npm run build:nocheck && npx astro preview --port 4330 --host 127.0.0.1',
    url: 'http://127.0.0.1:4330/',
    reuseExistingServer: false,
    timeout: 180_000,
  },
  projects: [
    // Behaviour: every browser in the matrix.
    { name: 'chromium', testMatch: /tools\.spec/, use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', testMatch: /tools\.spec/, use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', testMatch: /tools\.spec/, use: { ...devices['Desktop Safari'] } },
    { name: 'mobile-safari', testMatch: /tools\.spec/, use: { ...devices['iPhone 13'], deviceScaleFactor: 1 } },
    // Values: token, geometry and transition-state snapshots. Browser-independent, so once.
    { name: 'gate', testMatch: /gate\.spec/, use: { ...devices['Desktop Chrome'] } },
    // Pixels: composition and layout, desktop and phone.
    { name: 'visual-desktop', testMatch: /visual\.spec/, use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } } },
    { name: 'visual-mobile', testMatch: /visual\.spec/, use: { ...devices['iPhone 13'], deviceScaleFactor: 1 } },
  ],
});
