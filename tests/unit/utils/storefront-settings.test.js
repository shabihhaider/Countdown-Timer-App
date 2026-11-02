// @vitest-environment node
/** B7: traffic to a shop must not be able to take its timer down. */
import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  isRateLimited: vi.fn(),
  cache: new Map(),
  ttls: new Map(),
}));

vi.mock("../../../app/db.server", () => ({
  default: { campaign: { findMany: mocks.findMany } },
}));
vi.mock("../../../app/redis.server", () => ({
  isRateLimited: mocks.isRateLimited,
  readCache: async (key) => mocks.cache.get(key) ?? null,
  writeCache: async (key, value, ttlSeconds) => {
    mocks.ttls.set(key, ttlSeconds);
    mocks.cache.set(key, JSON.parse(JSON.stringify(value)));
  },
}));
vi.mock("../../../app/utils/logger.server", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

const { loadStorefrontSettings, FRESH_CACHE_MS } = await import(
  "../../../app/utils/storefront-settings.server"
);

const SHOP = "busy-store.myshopify.com";
const campaign = (over = {}) => ({
  id: 1,
  shop: SHOP,
  type: "bar",
  targetType: "all",
  timerType: "one_time",
  priority: 0,
  startDate: null,
  endDate: new Date(Date.now() + 3600_000),
  barMessage: "Sale",
  ...over,
});

const request = (query = `shop=${SHOP}`, headers = { "x-real-ip": "198.51.100.7" }) =>
  new Request(`http://local.test/apps/countdown/settings?${query}`, { headers });

describe("loadStorefrontSettings", () => {
  beforeEach(() => {
    mocks.cache.clear();
    mocks.findMany.mockReset().mockResolvedValue([campaign()]);
    mocks.isRateLimited.mockReset().mockResolvedValue(false);
  });

  test("returns the matching campaign with CDN-cacheable headers", async () => {
    const response = await loadStorefrontSettings(request());
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.settings.id).toBe(1);
    // Vercel's CDN caches on s-maxage: max-age alone only reaches the browser.
    expect(response.headers.get("cache-control")).toMatch(/s-maxage=\d+/);
    expect(response.headers.get("cache-control")).toMatch(/stale-while-revalidate=\d+/);
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
  });

  test("a visitor spike costs one database read and never a 429", async () => {
    const responses = [];
    for (let i = 0; i < 500; i++) {
      responses.push(await loadStorefrontSettings(request()));
    }
    expect(responses.every((r) => r.status === 200)).toBe(true);
    expect(mocks.findMany).toHaveBeenCalledTimes(1);
  });

  test("varying product params cannot bypass the database cache", async () => {
    mocks.findMany.mockResolvedValue([campaign({ type: "product_timer" })]);
    for (let i = 0; i < 50; i++) {
      await loadStorefrontSettings(request(`shop=${SHOP}&type=product_timer&product=p${i}`));
    }
    expect(mocks.findMany).toHaveBeenCalledTimes(1);
  });

  test("no per-shop limit key exists for callers to exhaust", async () => {
    await loadStorefrontSettings(request());
    const keys = mocks.isRateLimited.mock.calls.map(([key]) => key);
    expect(keys.filter((key) => key.startsWith("shop:"))).toEqual([]);
  });

  test("the per-IP limit still answers 429, uncached, with Retry-After", async () => {
    mocks.isRateLimited.mockResolvedValue(true);
    const response = await loadStorefrontSettings(request());
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("60");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  test("a verified app proxy request skips the per-IP limit", async () => {
    mocks.isRateLimited.mockResolvedValue(true);
    const response = await loadStorefrontSettings(request(), { isVerifiedProxy: true });
    expect(response.status).toBe(200);
  });

  test("serves stale data when the database fails", async () => {
    await loadStorefrontSettings(request());
    const key = [...mocks.cache.keys()][0];
    mocks.cache.set(key, { ...mocks.cache.get(key), fetchedAt: Date.now() - FRESH_CACHE_MS - 1 });
    mocks.findMany.mockRejectedValue(new Error("db down"));

    const response = await loadStorefrontSettings(request());
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.settings.id).toBe(1);
    expect(mocks.findMany).toHaveBeenCalledTimes(2);
  });

  test("a shop with no campaigns is cached only for the fresh window", async () => {
    mocks.findMany.mockResolvedValue([]);
    await loadStorefrontSettings(request());
    const [key] = mocks.cache.keys();
    expect(mocks.ttls.get(key)).toBe(FRESH_CACHE_MS / 1000);
  });

  test("a shop with campaigns keeps its last-good copy for an hour", async () => {
    await loadStorefrontSettings(request());
    const [key] = mocks.cache.keys();
    expect(mocks.ttls.get(key)).toBe(3600);
  });

  test("refreshes the cache once the fresh window has passed", async () => {
    await loadStorefrontSettings(request());
    const key = [...mocks.cache.keys()][0];
    mocks.cache.set(key, { ...mocks.cache.get(key), fetchedAt: Date.now() - FRESH_CACHE_MS - 1 });
    await loadStorefrontSettings(request());
    expect(mocks.findMany).toHaveBeenCalledTimes(2);
  });

  test("an expired one-time campaign is not served from the cache", async () => {
    await loadStorefrontSettings(request());
    const key = [...mocks.cache.keys()][0];
    const entry = mocks.cache.get(key);
    entry.campaigns[0].endDate = new Date(Date.now() - 1000).toISOString();

    const body = await (await loadStorefrontSettings(request())).json();
    expect(body.success).toBe(false);
  });

  test("answers 503, uncached, when nothing is available at all", async () => {
    mocks.findMany.mockRejectedValue(new Error("db down"));
    const response = await loadStorefrontSettings(request());
    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("retry-after")).toBeTruthy();
  });

  test.each([
    ["missing", ""],
    ["foreign domain", "shop=evil.com"],
    ["suffix attack", "shop=x.myshopify.com.evil.com"],
    ["over-long", `shop=${"a".repeat(300)}.myshopify.com`],
  ])("rejects a %s shop without touching the database", async (_name, query) => {
    const response = await loadStorefrontSettings(request(query));
    expect(response.status).toBe(400);
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  test("an unknown type returns no campaign without touching the database", async () => {
    const response = await loadStorefrontSettings(request(`shop=${SHOP}&type=${"x".repeat(5000)}`));
    expect(response.status).toBe(200);
    expect((await response.json()).success).toBe(false);
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  test("shop case variants share one cache entry", async () => {
    await loadStorefrontSettings(request(`shop=${SHOP}`));
    await loadStorefrontSettings(
      request(`shop=${SHOP.toUpperCase().replace("MYSHOPIFY.COM", "myshopify.com")}`)
    );
    expect(mocks.findMany).toHaveBeenCalledTimes(1);
  });

  test("answers OPTIONS without a limiter or database call", async () => {
    const options = new Request("http://local.test/s", { method: "OPTIONS" });
    const response = await loadStorefrontSettings(options);
    expect(response.status).toBe(204);
    expect(mocks.isRateLimited).not.toHaveBeenCalled();
  });
});
