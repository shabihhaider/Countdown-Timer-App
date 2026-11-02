/**
 * E2E tests for rate limiting on public API endpoints.
 *
 * @tags @e2e
 */

import { test, expect } from "@playwright/test";

test.describe("Rate limiting", () => {
  test("settings endpoint returns valid response or 429 with retry-after", async ({ request }) => {
    // Use a unique shop param to avoid collision with other tests
    const shop = `rate-test-${Date.now()}.myshopify.com`;
    const url = `/apps/countdown/settings?shop=${shop}`;

    const res = await request.get(url);

    // Should either succeed or be rate limited — never a 500
    expect([200, 429]).toContain(res.status());

    if (res.status() === 429) {
      const retryAfter = res.headers()["retry-after"];
      expect(retryAfter).toBeDefined();
      expect(parseInt(retryAfter)).toBeGreaterThan(0);
    }
  });

  test("exceeding rate limit returns 429 with retry-after header", async ({ request }) => {
    // Use a unique shop to get a fresh rate limit window
    const shop = `rate-exhaust-${Date.now()}.myshopify.com`;
    const url = `/apps/countdown/settings?shop=${shop}`;

    // Fire requests until we get rate limited or hit 120 attempts
    let rateLimitedResponse = null;
    for (let i = 0; i < 120; i++) {
      const res = await request.get(url);
      if (res.status() === 429) {
        rateLimitedResponse = res;
        break;
      }
    }

    // The per-IP limit is 60 a minute, so 120 requests must reach it.
    expect(rateLimitedResponse, "no 429 in 120 requests").not.toBeNull();
    const retryAfter = rateLimitedResponse.headers()["retry-after"];
    expect(retryAfter).toBeDefined();
    expect(parseInt(retryAfter)).toBeGreaterThan(0);
    expect(rateLimitedResponse.headers()["cache-control"]).toBe("no-store");
  });
});
