/** shop/redact: cached campaigns must go with the rows they were read from. */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { action } from "../../../app/routes/webhooks.shop.redact";

const mocks = vi.hoisted(() => {
  const deleteMany = () => ({ deleteMany: vi.fn().mockResolvedValue({ count: 0 }) });
  return {
    webhook: vi.fn(),
    isAppInstalled: vi.fn(),
    redactShop: vi.fn(),
    deleteCache: vi.fn(),
    db: {
      campaignAnalytics: deleteMany(),
      campaign: deleteMany(),
      onboardingState: deleteMany(),
      session: deleteMany(),
      setting: deleteMany(),
    },
  };
});

vi.mock("../../../app/shopify.server", () => ({
  authenticate: { webhook: mocks.webhook },
  unauthenticated: { admin: vi.fn() },
}));
vi.mock("../../../app/utils/install-check.server", () => ({
  isAppInstalled: mocks.isAppInstalled,
}));
vi.mock("../../../app/db.server", () => ({ default: mocks.db }));
vi.mock("../../../app/redis.server", () => ({
  deleteCache: mocks.deleteCache,
  isRateLimited: vi.fn(),
  readCache: vi.fn(),
  writeCache: vi.fn(),
}));
vi.mock("../../../app/utils/shop-lifecycle.server", () => ({ redactShop: mocks.redactShop }));

const SHOP = "test-store.myshopify.com";
const request = () => new Request("http://localhost/webhooks/shop/redact", { method: "POST" });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.webhook.mockResolvedValue({ shop: SHOP, topic: "SHOP_REDACT" });
  mocks.deleteCache.mockResolvedValue(undefined);
  mocks.redactShop.mockResolvedValue(undefined);
  mocks.isAppInstalled.mockResolvedValue(false);
});

describe("shop/redact", () => {
  it("purges every cached campaign type after deleting the rows", async () => {
    const response = await action({ request: request() });

    expect(response.status).toBe(200);
    expect(mocks.deleteCache).toHaveBeenCalledWith(`campaigns:${SHOP}:bar`);
    expect(mocks.deleteCache).toHaveBeenCalledWith(`campaigns:${SHOP}:product_timer`);
    expect(mocks.db.campaign.deleteMany.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.deleteCache.mock.invocationCallOrder[0]
    );
  });

  it("returns 500 so Shopify redelivers when the purge fails", async () => {
    mocks.deleteCache.mockRejectedValue(new Error("redis down"));

    const response = await action({ request: request() });

    expect(response.status).toBe(500);
    expect(mocks.redactShop).not.toHaveBeenCalled();
  });

  it("leaves a shop alone when the app is installed on it again", async () => {
    mocks.isAppInstalled.mockResolvedValue(true);

    const response = await action({ request: request() });

    expect(response.status).toBe(200);
    expect(mocks.db.campaign.deleteMany).not.toHaveBeenCalled();
    expect(mocks.db.session.deleteMany).not.toHaveBeenCalled();
    expect(mocks.redactShop).not.toHaveBeenCalled();
  });

  it("returns 500 without deleting when the install check cannot answer", async () => {
    mocks.isAppInstalled.mockRejectedValue(new Error("network"));

    const response = await action({ request: request() });

    expect(response.status).toBe(500);
    expect(mocks.db.campaign.deleteMany).not.toHaveBeenCalled();
    expect(mocks.redactShop).not.toHaveBeenCalled();
  });
});
