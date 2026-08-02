/**
 * Screenshot capture tests for UI/UX visual review.
 * Uses explicit URLs and ignores HTTPS errors for Docker HTTP servers.
 */
import { test } from "@playwright/test";

const BASE = process.env.APP_URL || "http://localhost:3000";

// Override config: no video, ignore HTTPS errors, explicit viewport
test.use({
  ignoreHTTPSErrors: true,
  video: "off",
  viewport: { width: 1440, height: 900 },
  launchOptions: {
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--disable-http2",
    ],
  },
});

test.describe("UI Screenshots", () => {
  test("01 - Landing page", async ({ page }) => {
    await page.goto(BASE + "/", { waitUntil: "networkidle" });
    await page.screenshot({ path: "screenshots/01-landing-page.png", fullPage: true });
  });

  test("02 - Health endpoint (JSON)", async ({ page }) => {
    await page.goto(BASE + "/health", { waitUntil: "networkidle" });
    await page.screenshot({ path: "screenshots/02-health-endpoint.png", fullPage: true });
  });

  test("03 - Privacy Policy page", async ({ page }) => {
    await page.goto(BASE + "/privacy", { waitUntil: "networkidle" });
    await page.screenshot({ path: "screenshots/03-privacy-page.png", fullPage: true });
  });

  test("04 - Terms of Service page", async ({ page }) => {
    await page.goto(BASE + "/terms", { waitUntil: "networkidle" });
    await page.screenshot({ path: "screenshots/04-terms-page.png", fullPage: true });
  });

  test("05 - Settings API response", async ({ page }) => {
    await page.goto(BASE + "/apps/countdown/settings?shop=demo-store.myshopify.com", {
      waitUntil: "networkidle",
    });
    await page.screenshot({ path: "screenshots/05-settings-api.png", fullPage: true });
  });

  test("06 - Admin auth redirect", async ({ page }) => {
    await page
      .goto(BASE + "/app", { waitUntil: "domcontentloaded", timeout: 10000 })
      .catch(() => {});
    await page.waitForTimeout(2000);
    await page.screenshot({ path: "screenshots/06-admin-auth.png", fullPage: true });
  });

  test("07 - Landing page mobile (375px)", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(BASE + "/", { waitUntil: "networkidle" });
    await page.screenshot({ path: "screenshots/07-landing-mobile.png", fullPage: true });
  });
});
