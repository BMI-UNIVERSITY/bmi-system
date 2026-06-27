/**
 * BMI UMS — Playwright E2E Configuration
 *
 * Stack: 100% Open Source | Privacy-First | Self-Hosted
 * Runner: @playwright/test (Apache-2.0) — https://github.com/microsoft/playwright
 *
 * Tests run against a locally-served frontend (http://localhost:3000) with the
 * backend API proxied through Vite.  In CI the frontend is built and served by
 * `vite preview` while a D1 Worker handles the backend API.
 *
 * Usage:
 *   npx playwright test                   # run all e2e tests
 *   npx playwright test --headed          # watch in browser
 *   npx playwright test --project=chromium
 */
import { defineConfig, devices } from "@playwright/test";

const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  /* Run each test in its own isolated context */
  fullyParallel: false,
  /* Retry once on CI to absorb timing flakes */
  retries: process.env.CI ? 1 : 0,
  /* Limit workers to 1 on CI */
  workers: process.env.CI ? 1 : undefined,
  /* Pretty reporter locally; compact on CI */
  reporter: process.env.CI ? "github" : "list",

  use: {
    baseURL: BASE_URL,
    /* Keep a trace on failure for CI debugging */
    trace: "on-first-retry",
    /* Screenshot on failure */
    screenshot: "only-on-failure",
    /* Global timeout per action */
    actionTimeout: 10_000,
  },

  /* Test against the three major open-source browser engines */
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
  ],

  /* Automatically start the preview server when running locally */
  webServer: process.env.CI
    ? undefined // CI manages the server externally
    : {
        command: "npm run preview -- --port 3000",
        url: BASE_URL,
        reuseExistingServer: true,
        timeout: 30_000,
      },
});
