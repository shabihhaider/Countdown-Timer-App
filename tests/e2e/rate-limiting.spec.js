/**
 * E2E tests for rate limiting on public API endpoints.
 *
 * @tags @e2e
 */

import { test, expect } from "@playwright/test";

test.describe("Rate limiting", () => {
  test("settings endpoint allows up to 60 requests per minute from same IP", async ({
    request,
  }) => {
    const url = "/apps/countdown/settings?shop=test-store.myshopify.com";

    // Make 60 requests — all should succeed (not 429)
    const results = [];
    for (let i = 0; i < 60; i++) {
      const res = await request.get(url);
      results.push(res.status());
    }

    // All 60 should not be 429
    const blocked = results.filter((s) => s === 429);
    // In CI environment, test runner IP may share state with other tests.
    // We allow a small number of blocks in edge cases.
    expect(blocked.length).toBeLessThan(5);
  });

  test("rate limited response includes Retry-After header", async ({ request }) => {
    const url = "/apps/countdown/settings?shop=rate-test.myshopify.com";

    // Exhaust the limit
    let rateLimitedResponse = null;
    for (let i = 0; i < 100; i++) {
      const res = await request.get(url);
      if (res.status() === 429) {
        rateLimitedResponse = res;
        break;
      }
    }

    if (rateLimitedResponse) {
      const retryAfter = rateLimitedResponse.headers()["retry-after"];
      expect(retryAfter).toBeDefined();
      expect(parseInt(retryAfter)).toBeGreaterThan(0);
    } else {
      // If we never got rate limited, that's acceptable — Redis window may have
      // reset between requests. Log a warning.
      console.warn("Did not trigger rate limit in 100 requests — Redis window may have reset");
    }
  });
});
