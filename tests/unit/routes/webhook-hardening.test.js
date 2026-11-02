/**
 * Route-level tests for webhook edge cases: stale redelivery, malformed signed
 * payloads (must be acknowledged, never retried forever), and /health honesty
 * when rate limited.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { InvalidShopError } from "@shopify/shopify-api";
import { action as uninstalled } from "../../../app/routes/webhooks.app.uninstalled";
import { action as scopesUpdate } from "../../../app/routes/webhooks.app.scopes_update";
import { action as subscriptionsUpdate } from "../../../app/routes/webhooks.app.subscriptions_update";
import { action as dataRequest } from "../../../app/routes/webhooks.customers.data_request";
import { action as customersRedact } from "../../../app/routes/webhooks.customers.redact";
import { loader as health } from "../../../app/routes/health";

const mocks = vi.hoisted(() => ({
  webhook: vi.fn(),
  isRateLimited: vi.fn(),
  db: {
    shop: { findUnique: vi.fn(), updateMany: vi.fn() },
    session: { update: vi.fn(), deleteMany: vi.fn() },
    subscription: { findUnique: vi.fn(), upsert: vi.fn(), updateMany: vi.fn() },
    appEvent: { create: vi.fn(), findFirst: vi.fn() },
    campaign: { count: vi.fn(), deleteMany: vi.fn() },
    campaignAnalytics: { aggregate: vi.fn(), deleteMany: vi.fn() },
    onboardingState: { findUnique: vi.fn(), deleteMany: vi.fn() },
    setting: { deleteMany: vi.fn() },
    $queryRaw: vi.fn(),
  },
}));

vi.mock("../../../app/shopify.server", () => ({ authenticate: { webhook: mocks.webhook } }));
vi.mock("../../../app/db.server", () => ({ default: mocks.db }));
vi.mock("../../../app/redis.server", () => ({ isRateLimited: mocks.isRateLimited }));

const SHOP = "test-store.myshopify.com";

function webhookRequest(headers = {}) {
  return new Request("http://localhost/webhooks", { method: "POST", headers });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.db.campaign.count.mockResolvedValue(0);
  mocks.db.campaignAnalytics.aggregate.mockResolvedValue({ _sum: {} });
  mocks.db.onboardingState.findUnique.mockResolvedValue(null);
  mocks.db.shop.updateMany.mockResolvedValue({ count: 1 });
});

describe("app/uninstalled stale delivery", () => {
  const installedAt = new Date("2026-10-31T12:00:00Z");

  beforeEach(() => {
    mocks.webhook.mockResolvedValue({ shop: SHOP, topic: "APP_UNINSTALLED" });
    mocks.db.shop.findUnique.mockResolvedValue({ id: 1, status: "active", installedAt });
  });

  it("keeps a reinstalled shop's data when the delivery predates the reinstall", async () => {
    const response = await uninstalled({
      request: webhookRequest({ "x-shopify-triggered-at": "2026-10-31T11:00:00Z" }),
    });

    expect(response.status).toBe(200);
    expect(mocks.db.campaign.deleteMany).not.toHaveBeenCalled();
    expect(mocks.db.session.deleteMany).not.toHaveBeenCalled();
    expect(mocks.db.shop.updateMany).not.toHaveBeenCalled();
  });

  it("deletes data when the uninstall happened after the latest install", async () => {
    await uninstalled({
      request: webhookRequest({ "x-shopify-triggered-at": "2026-10-31T13:00:00Z" }),
    });

    expect(mocks.db.campaign.deleteMany).toHaveBeenCalled();
    expect(mocks.db.shop.updateMany).toHaveBeenCalled();
  });

  it("deletes data when the trigger timestamp is absent or unparseable", async () => {
    await uninstalled({ request: webhookRequest() });
    await uninstalled({ request: webhookRequest({ "x-shopify-triggered-at": "not-a-date" }) });

    expect(mocks.db.campaign.deleteMany).toHaveBeenCalledTimes(2);
  });
});

describe("malformed signed webhooks are acknowledged", () => {
  it("app/scopes_update without current", async () => {
    mocks.webhook.mockResolvedValue({
      shop: SHOP,
      topic: "APP_SCOPES_UPDATE",
      payload: {},
      session: { id: "offline_x" },
    });

    const response = await scopesUpdate({ request: webhookRequest() });

    expect(response.status).toBe(200);
    expect(mocks.db.session.update).not.toHaveBeenCalled();
  });

  it.each([
    ["empty app_subscription", {}],
    ["no status", { admin_graphql_api_id: "gid://shopify/AppSubscription/1" }],
    [
      "invalid updated_at",
      {
        admin_graphql_api_id: "gid://shopify/AppSubscription/1",
        status: "ACTIVE",
        updated_at: "not-a-date",
      },
    ],
  ])("app_subscriptions/update with %s", async (_name, appSubscription) => {
    mocks.webhook.mockResolvedValue({
      shop: SHOP,
      topic: "APP_SUBSCRIPTIONS_UPDATE",
      payload: { app_subscription: appSubscription },
    });

    const response = await subscriptionsUpdate({ request: webhookRequest() });

    expect(response.status).toBe(200);
    expect(mocks.db.subscription.upsert).not.toHaveBeenCalled();
  });
});

describe("signed input the library cannot parse", () => {
  const routes = [
    ["app/uninstalled", uninstalled],
    ["app/scopes_update", scopesUpdate],
    ["app_subscriptions/update", subscriptionsUpdate],
    ["customers/data_request", dataRequest],
    ["customers/redact", customersRedact],
  ];

  it.each(routes)("%s acknowledges truncated JSON instead of a 500", async (_topic, action) => {
    mocks.webhook.mockRejectedValue(new SyntaxError("Unexpected end of JSON input"));

    await expect(action({ request: webhookRequest() })).rejects.toMatchObject({ status: 200 });
  });

  it.each(routes)("%s acknowledges an invalid shop header", async (_topic, action) => {
    mocks.webhook.mockRejectedValue(new InvalidShopError("Received invalid shop argument"));

    await expect(action({ request: webhookRequest() })).rejects.toMatchObject({ status: 200 });
  });

  it.each(routes)("%s still fails on a system error, so Shopify retries", async (_t, action) => {
    const outage = new Error("session store down");
    mocks.webhook.mockRejectedValue(outage);

    await expect(action({ request: webhookRequest() })).rejects.toBe(outage);
  });

  it("passes the library's own rejection through", async () => {
    const unauthorized = new Response(null, { status: 401 });
    mocks.webhook.mockRejectedValue(unauthorized);

    await expect(uninstalled({ request: webhookRequest() })).rejects.toBe(unauthorized);
  });
});

describe("GET /health", () => {
  const request = new Request("http://localhost/health");

  it("does not report ok when rate limited", async () => {
    mocks.isRateLimited.mockResolvedValue(true);

    const response = await health({ request });

    expect(response.status).toBe(429);
    expect((await response.json()).status).toBe("rate_limited");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(mocks.db.$queryRaw).not.toHaveBeenCalled();
  });

  it("still reports a database outage when not limited", async () => {
    mocks.isRateLimited.mockResolvedValue(false);
    mocks.db.$queryRaw.mockRejectedValue(new Error("down"));

    expect((await health({ request })).status).toBe(503);
  });
});
