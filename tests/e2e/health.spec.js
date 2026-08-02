/**
 * E2E tests for the /health endpoint.
 *
 * @tags @smoke @e2e
 */

import { test, expect } from "@playwright/test";

test.describe("GET /health @smoke", () => {
  test("returns 200 with ok status", async ({ request }) => {
    const response = await request.get("/health");

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.status).toBe("ok");
    expect(body.timestamp).toBeDefined();

    // Verify timestamp is a valid ISO 8601 date
    const ts = new Date(body.timestamp);
    expect(isNaN(ts.getTime())).toBe(false);
  });

  test("sets Cache-Control: no-store", async ({ request }) => {
    const response = await request.get("/health");
    const cacheControl = response.headers()["cache-control"];
    expect(cacheControl).toContain("no-store");
  });
});
