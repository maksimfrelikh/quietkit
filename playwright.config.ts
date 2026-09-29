import { defineConfig, devices } from '@playwright/test';

// Runs INSIDE the Playwright Docker image (npm run e2e), so the browsers and their
// rendering are identical on the Mac and on laptop-server — the frelikh screenshot gate
// taught us that host-rendered baselines only pass on the machine that made them.
// Port 4330: 4321 (Astro's default) is the live frelikh service on laptop-server.
// E2E_BASE_URL=https://quietkit.frelikh.dev npm run e2e — runs the same tests against a live
// deploy (no local server started). Used to confirm hydration + CSP in production.
const live = process.env.E2E_BASE_URL;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: live ?? 'http://127.0.0.1:4330',
    trace: 'retain-on-failure',
  },
  webServer: live ? undefined : {
    command: 'npx astro preview --port 4330 --host 127.0.0.1',
    url: 'http://127.0.0.1:4330/',
    reuseExistingServer: false,
    timeout: 60_000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile-safari', use: { ...devices['iPhone 13'] } },
  ],
});
