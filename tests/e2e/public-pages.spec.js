/**
 * Layout and document basics on public pages reached outside the Shopify admin.
 *
 * @tags @e2e
 */

import { test, expect } from "@playwright/test";

test("landing page has no horizontal overflow at 320px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("/");

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );

  expect(overflow).toBeLessThanOrEqual(0);
});

test("/auth/login has a document title and one h1", async ({ page }) => {
  await page.goto("/auth/login");

  await expect(page).toHaveTitle(/Log in/);
  await expect(page.locator("h1")).toHaveCount(1);
});
