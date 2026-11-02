// @vitest-environment node
/**
 * SHOP-02 / F-W3 / B17: the app proxy strips /apps/countdown, so the widget's
 * relative fallback arrives as /settings and /track. Signed requests only.
 */
import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, test, vi } from "vitest";

const SECRET = "fake_audit_secret";

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  findFirst: vi.fn(),
  upsert: vi.fn(),
  isRateLimited: vi.fn(),
}));

vi.mock("../../../app/env.server", () => ({ env: { SHOPIFY_API_SECRET: "fake_audit_secret" } }));
vi.mock("../../../app/db.server", () => ({
  default: {
    campaign: { findMany: mocks.findMany, findFirst: mocks.findFirst },
    campaignAnalytics: { upsert: mocks.upsert },
  },
}));
vi.mock("../../../app/redis.server", () => ({
  isRateLimited: mocks.isRateLimited,
  readCache: async () => null,
  writeCache: async () => {},
}));

const { loader: settings } = await import("../../../app/routes/settings");
const { action: track, loader: trackLoader } = await import("../../../app/routes/track");

const SHOP = "busy-store.myshopify.com";

function signedQuery(extra = {}) {
  const params = {
    shop: SHOP,
    path_prefix: "/apps/countdown",
    timestamp: String(Math.floor(Date.now() / 1000)),
    ...extra,
  };
  const message = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("");
  const signature = createHmac("sha256", SECRET).update(message).digest("hex");
  return new URLSearchParams({ ...params, signature });
}

describe("app proxy fallback routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isRateLimited.mockResolvedValue(false);
    mocks.findMany.mockResolvedValue([]);
    mocks.findFirst.mockResolvedValue({ id: 7 });
    mocks.upsert.mockResolvedValue({});
  });

  test("/settings answers a signed request", async () => {
    const request = new Request(`http://local.test/settings?${signedQuery({ type: "bar" })}`);
    const response = await settings({ request });
    expect(response.status).toBe(200);
    expect(mocks.findMany).toHaveBeenCalledTimes(1);
  });

  test("/settings ignores the per-IP limit for signed requests", async () => {
    mocks.isRateLimited.mockResolvedValue(true);
    const request = new Request(`http://local.test/settings?${signedQuery()}`);
    expect((await settings({ request })).status).toBe(200);
  });

  test("/settings refuses an unsigned request", async () => {
    const request = new Request(`http://local.test/settings?shop=${SHOP}`);
    const response = await settings({ request });
    expect(response.status).toBe(401);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  test("/track records a signed event", async () => {
    const request = new Request(`http://local.test/track?${signedQuery()}`, {
      method: "POST",
      body: JSON.stringify({ shop: SHOP, event: "impression", campaignId: 7 }),
    });
    expect((await track({ request })).status).toBe(200);
    expect(mocks.upsert).toHaveBeenCalledTimes(1);
  });

  test("/track refuses an event for a shop other than the signed one", async () => {
    const request = new Request(`http://local.test/track?${signedQuery()}`, {
      method: "POST",
      body: JSON.stringify({ shop: "victim.myshopify.com", event: "click", campaignId: 7 }),
    });
    expect((await track({ request })).status).toBe(400);
    expect(mocks.upsert).not.toHaveBeenCalled();
  });

  test("/track answers GET with 405, not a server error", async () => {
    expect((await trackLoader()).status).toBe(405);
  });

  test("/track refuses an unsigned event", async () => {
    const request = new Request("http://local.test/track", {
      method: "POST",
      body: JSON.stringify({ shop: SHOP, event: "click", campaignId: 7 }),
    });
    expect((await track({ request })).status).toBe(401);
    expect(mocks.upsert).not.toHaveBeenCalled();
  });
});
