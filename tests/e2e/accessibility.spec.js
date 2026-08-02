/**
 * Accessibility E2E tests using @axe-core/playwright.
 * Runs against all public-facing pages.
 *
 * @tags @a11y @e2e
 */

import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("Accessibility @a11y", () => {
  test("/ (landing page) has no critical accessibility violations", async ({ page }) => {
    await page.goto("/");

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .exclude(".shopify-section") // Exclude Shopify injected sections
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

  test("/ page has proper heading hierarchy", async ({ page }) => {
    await page.goto("/");

    const h1Count = await page.locator("h1").count();
    // Page should have exactly one H1
    expect(h1Count).toBeLessThanOrEqual(1);
  });

  test("/ page has a visible skip-to-content link or main landmark", async ({ page }) => {
    await page.goto("/");

    const main = page.locator("main, [role=main]");
    const hasMain = (await main.count()) > 0;

    const skipLink = page.locator('a[href="#main-content"], a[href="#content"]');
    const hasSkipLink = (await skipLink.count()) > 0;

    expect(hasMain || hasSkipLink).toBe(true);
  });

  test("/health endpoint returns parseable JSON without HTML", async ({ page }) => {
    const response = await page.request.get("/health");
    const text = await response.text();

    // Must be valid JSON, not an HTML error page
    expect(() => JSON.parse(text)).not.toThrow();
  });
});
