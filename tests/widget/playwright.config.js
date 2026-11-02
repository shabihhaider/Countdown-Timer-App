import { defineConfig, devices } from "@playwright/test";

const PORT = process.env.WIDGET_FIXTURE_PORT || 3199;

// Separate from playwright.config.js: this suite needs only the fixture page, no app or database.
export default defineConfig({
  testDir: ".",
  testMatch: /.*\.spec\.ts/,
  workers: 1,
  retries: 0,
  timeout: 30000,
  outputDir: "../../test-results/widget",
  reporter: [["list"]],
  use: { ...devices["Desktop Chrome"], baseURL: `http://localhost:${PORT}` },
  webServer: {
    command: "node tests/widget/fixture-server.cjs",
    cwd: "../..",
    url: `http://localhost:${PORT}/__tracks`,
    reuseExistingServer: false,
  },
});
