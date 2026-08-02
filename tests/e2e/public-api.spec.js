/**
 * E2E tests for public API endpoints (no auth required).
 * Tests /apps/countdown/settings and /apps/countdown/track.
 *
 * @tags @smoke @e2e
 */

import { test, expect } from "@playwright/test";

test.describe("GET /apps/countdown/settings @smoke", () => {
  test("returns 400 when shop param is missing", async ({ request }) => {
    const response = await request.get("/apps/countdown/settings");
    expect(response.status()).toBe(400);

    const body = await response.json();
    expect(body.success).toBe(false);
  });

  test("returns 400 when shop param is invalid", async ({ request }) => {
    const response = await request.get("/apps/countdown/settings?shop=not-a-shopify-store");
    expect(response.status()).toBe(400);

    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain("Invalid shop");
  });

  test("returns 400 for XSS injection in shop param", async ({ request }) => {
    const response = await request.get("/apps/countdown/settings?shop=<script>alert(1)</script>");
    expect(response.status()).toBe(400);
  });

  test("returns success response for valid shop with no campaign", async ({ request }) => {
    const response = await request.get("/apps/countdown/settings?shop=test-store.myshopify.com");

    // Should be 200 (no campaign found is a valid state, not an error)
    expect(response.status()).toBe(200);

    const body = await response.json();
    // Either success: true (has campaign) or success: false (no campaign)
    expect(typeof body.success).toBe("boolean");
  });

  test("returns CORS header allowing all origins", async ({ request }) => {
    const response = await request.get("/apps/countdown/settings?shop=test-store.myshopify.com");
    const acao = response.headers()["access-control-allow-origin"];
    expect(acao).toBe("*");
  });

  test("rejects path traversal in shop param", async ({ request }) => {
    const response = await request.get("/apps/countdown/settings?shop=../../../../etc/passwd");
    expect(response.status()).toBe(400);
  });
});

test.describe("POST /apps/countdown/track @smoke", () => {
  test("returns 204 for GET requests (CORS preflight handler)", async ({ request }) => {
    const response = await request.get("/apps/countdown/track");
    expect(response.status()).toBe(204);
  });

  test("returns 400 for invalid shop in POST body", async ({ request }) => {
    const response = await request.post("/apps/countdown/track", {
      data: { shop: "not-valid", event: "impression" },
    });
    expect(response.status()).toBe(400);
  });

  test("returns 400 for invalid event type", async ({ request }) => {
    const response = await request.post("/apps/countdown/track", {
      data: { shop: "test.myshopify.com", event: "purchase" },
    });
    expect(response.status()).toBe(400);
  });

  test("accepts valid tracking event and returns 200", async ({ request }) => {
    const response = await request.post("/apps/countdown/track", {
      data: {
        shop: "test-store.myshopify.com",
        event: "impression",
      },
    });
    // Returns 200 regardless (tracking errors must not break storefront)
    expect(response.status()).toBe(200);
  });

  test("handles CORS preflight (OPTIONS)", async ({ request }) => {
    const response = await request.fetch("/apps/countdown/track", {
      method: "OPTIONS",
    });
    expect([200, 204]).toContain(response.status());
  });
});
