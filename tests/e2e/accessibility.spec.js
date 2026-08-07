/**
 * Accessibility E2E tests using @axe-core/playwright.
 * Runs against all public-facing pages.
 *
 * @tags @a11y @e2e
 */

import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("Accessibility @a11y", () => {
  test("/ redirects to /app (no landing page)", async ({ page }) => {
    // The root route always redirects to /app for embedded auth compatibility.
    // In CI (no Shopify session), this will redirect further to /auth/login.
    const response = await page.request.get("/", { maxRedirects: 0 });
    expect(response.status()).toBe(302);
    expect(response.headers()["location"]).toContain("/app");
  });

  test("/privacy has no critical accessibility violations", async ({ page }) => {
    await page.goto("/privacy");

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    const critical = results.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious"
    );

    if (critical.length > 0) {
      console.error(
        "Critical accessibility violations:",
        JSON.stringify(
          critical.map((v) => ({ id: v.id, impact: v.impact, description: v.description })),
          null,
          2
        )
      );
    }

    expect(critical).toHaveLength(0);
  });

  test("/terms has no critical accessibility violations", async ({ page }) => {
    await page.goto("/terms");

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    const critical = results.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious"
    );

    if (critical.length > 0) {
      console.error(
        "Critical accessibility violations:",
        JSON.stringify(
          critical.map((v) => ({ id: v.id, impact: v.impact, description: v.description })),
          null,
          2
        )
      );
    }

    expect(critical).toHaveLength(0);
  });

  test("/health endpoint returns parseable JSON without HTML", async ({ page }) => {
    const response = await page.request.get("/health");
    const text = await response.text();

    // Must be valid JSON, not an HTML error page
    expect(() => JSON.parse(text)).not.toThrow();
  });
});
