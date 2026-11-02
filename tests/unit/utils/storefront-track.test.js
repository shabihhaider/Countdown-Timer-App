// @vitest-environment node
/** B13: tracking must bound body size and not credit events to the wrong campaign. */
import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findFirst: vi.fn(),
  upsert: vi.fn(),
  isRateLimited: vi.fn(),
  warn: vi.fn(),
}));

vi.mock("../../../app/db.server", () => ({
  default: {
    campaign: { findFirst: mocks.findFirst },
    campaignAnalytics: { upsert: mocks.upsert },
  },
}));
vi.mock("../../../app/redis.server", () => ({ isRateLimited: mocks.isRateLimited }));
vi.mock("../../../app/utils/logger.server", () => ({
  logger: { warn: mocks.warn, error: vi.fn(), info: vi.fn() },
}));

const { recordStorefrontEvent } = await import("../../../app/utils/storefront-track.server");

const SHOP = "busy-store.myshopify.com";

const post = (body, headers = { "x-real-ip": "198.51.100.7" }) =>
  new Request("http://local.test/apps/countdown/track", {
    method: "POST",
    headers,
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

describe("recordStorefrontEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isRateLimited.mockResolvedValue(false);
    mocks.findFirst.mockResolvedValue({ id: 7 });
    mocks.upsert.mockResolvedValue({});
  });

  test("records a valid event", async () => {
    const response = await recordStorefrontEvent(
      post({ shop: SHOP, event: "click", campaignId: 7 })
    );
    expect(response.status).toBe(200);
    expect(mocks.upsert).toHaveBeenCalledTimes(1);
  });

  test("rejects a body over the limit by Content-Length", async () => {
    const response = await recordStorefrontEvent(
      post({ shop: SHOP, event: "click", pad: "x".repeat(5000) })
    );
    expect(response.status).toBe(413);
    expect(response.headers.get("connection")).toBeNull();
    expect(mocks.upsert).not.toHaveBeenCalled();
  });

  test("stops reading an upload past the discard ceiling", async () => {
    let pulls = 0;
    const chunk = new Uint8Array(1024 * 1024);
    const body = new ReadableStream({
      pull(controller) {
        pulls += 1;
        controller.enqueue(chunk);
      },
    });
    const request = new Request("http://local.test/apps/countdown/track", {
      method: "POST",
      body,
      duplex: "half",
    });
    expect((await recordStorefrontEvent(request)).status).toBe(413);
    expect(pulls).toBeLessThan(40);
  });

  test("rejects an oversized stream with no Content-Length", async () => {
    const stream = new ReadableStream({
      pull(controller) {
        controller.enqueue(new Uint8Array(1024));
      },
    });
    const request = new Request("http://local.test/t", {
      method: "POST",
      body: stream,
      duplex: "half",
    });
    expect((await recordStorefrontEvent(request)).status).toBe(413);
  });

  test("rejects a non-string shop", async () => {
    const response = await recordStorefrontEvent(post({ shop: [SHOP], event: "click" }));
    expect(response.status).toBe(400);
  });

  test("never falls back to another campaign for an unknown campaignId", async () => {
    mocks.findFirst.mockResolvedValue(null);
    const response = await recordStorefrontEvent(
      post({ shop: SHOP, event: "click", campaignId: 999 })
    );
    expect(response.status).toBe(200);
    expect(mocks.findFirst).toHaveBeenCalledTimes(1);
    expect(mocks.upsert).not.toHaveBeenCalled();
  });

  test.each([["abc"], [1.5], [2 ** 40], [-1], [{ a: 1 }]])(
    "ignores malformed campaignId %s without a database read",
    async (campaignId) => {
      const response = await recordStorefrontEvent(
        post({ shop: SHOP, event: "click", campaignId })
      );
      expect(response.status).toBe(200);
      expect(mocks.findFirst).not.toHaveBeenCalled();
    }
  );

  test("still resolves the campaign when the widget sent no id", async () => {
    await recordStorefrontEvent(post({ shop: SHOP, event: "impression", campaignId: null }));
    expect(mocks.upsert).toHaveBeenCalledTimes(1);
  });

  test("caps clicks per visitor and campaign", async () => {
    mocks.isRateLimited.mockImplementation(async (key) => key.startsWith("track_action:"));
    const response = await recordStorefrontEvent(
      post({ shop: SHOP, event: "click", campaignId: 7 })
    );
    expect(response.status).toBe(200);
    expect(mocks.upsert).not.toHaveBeenCalled();
  });

  test("the per-action cap does not apply to impressions", async () => {
    mocks.isRateLimited.mockImplementation(async (key) => key.startsWith("track_action:"));
    await recordStorefrontEvent(post({ shop: SHOP, event: "impression", campaignId: 7 }));
    expect(mocks.upsert).toHaveBeenCalledTimes(1);
  });

  test("a spoofed X-Forwarded-For prefix keeps the same limit bucket", async () => {
    await recordStorefrontEvent(
      post({ shop: SHOP, event: "click" }, { "x-forwarded-for": "6.6.6.6, 198.51.100.7" })
    );
    expect(mocks.isRateLimited.mock.calls[0][0]).toBe("track:198.51.100.7");
  });

  test("a verified proxy request skips the per-IP limit but not the per-shop limit", async () => {
    const request = new Request(`http://local.test/track?shop=${SHOP}`, {
      method: "POST",
      body: JSON.stringify({ shop: SHOP, event: "impression" }),
    });
    await recordStorefrontEvent(request, { isVerifiedProxy: true });
    const keys = mocks.isRateLimited.mock.calls.map(([key]) => key);
    expect(keys).toEqual([`track_shop:${SHOP}:impression`]);
  });

  test("a flood of impressions does not use up the budget for clicks", async () => {
    mocks.isRateLimited.mockImplementation(async (key) => key.endsWith(":impression"));
    await recordStorefrontEvent(post({ shop: SHOP, event: "impression", campaignId: 7 }));
    expect(mocks.upsert).not.toHaveBeenCalled();

    await recordStorefrontEvent(post({ shop: SHOP, event: "click", campaignId: 7 }));
    expect(mocks.upsert).toHaveBeenCalledTimes(1);
  });

  test("clicks and closes share one budget, keeping the write ceiling fixed", async () => {
    await recordStorefrontEvent(post({ shop: SHOP, event: "click", campaignId: 7 }));
    await recordStorefrontEvent(post({ shop: SHOP, event: "close", campaignId: 7 }));
    const keys = mocks.isRateLimited.mock.calls.map(([key]) => key);
    expect(keys.filter((key) => key === `track_shop:${SHOP}:action`)).toHaveLength(2);
  });

  test("verified proxy clicks are not capped by the address all visitors share", async () => {
    mocks.isRateLimited.mockImplementation(async (key) => key.startsWith("track_action:"));
    const request = new Request(`http://local.test/track?shop=${SHOP}`, {
      method: "POST",
      headers: { "x-real-ip": "198.51.100.7" },
      body: JSON.stringify({ shop: SHOP, event: "click", campaignId: 7 }),
    });
    await recordStorefrontEvent(request, { isVerifiedProxy: true });
    expect(mocks.upsert).toHaveBeenCalledTimes(1);
  });

  test("logs a database failure and still answers 200", async () => {
    mocks.upsert.mockRejectedValue(new Error("db down"));
    const response = await recordStorefrontEvent(
      post({ shop: SHOP, event: "click", campaignId: 7 })
    );
    expect(response.status).toBe(200);
    expect(mocks.warn).toHaveBeenCalledTimes(1);
  });
});
