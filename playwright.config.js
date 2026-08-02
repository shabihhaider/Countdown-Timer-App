import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration for E2E tests.
 *
 * In CI: APP_URL is set to http://app:3000 (Docker service name).
 * Locally: defaults to http://localhost:3000.
 *
 * Tests are tagged:
 *   @a11y  — accessibility tests (run with: make test:a11y)
 *   @smoke — fast smoke tests
 *   @e2e   — full E2E flows
 */
export default defineConfig({
  testDir: "./tests/e2e",

  // Run each spec file sequentially — Shopify auth state is shared
  fullyParallel: false,

  // Fail on .only in CI
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Single worker in CI to avoid port contention
  workers: process.env.CI ? 1 : undefined,

  reporter: [
    ["html", { outputFolder: "playwright-report", open: "never" }],
    ["json", { outputFile: "test-results/playwright-results.json" }],
    process.env.CI ? ["github"] : ["list"],
  ],

  use: {
    baseURL: process.env.APP_URL || "http://localhost:3000",

    // Capture trace on first retry — useful for CI debugging
    trace: "on-first-retry",

    // Screenshot on failure only
    screenshot: "only-on-failure",

    // Video on first retry
    video: "on-first-retry",

    // Navigation timeout
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },

  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: {
          // In Docker (Alpine), use system chromium via PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH env
          executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
          args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-accelerated-2d-canvas",
            "--disable-gpu",
          ],
        },
      },
    },
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 5"] },
    },
  ],

  outputDir: "test-results/",

  // Timeout for each test
  timeout: 30000,
});
