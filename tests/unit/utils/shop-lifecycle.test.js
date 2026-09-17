/**
 * Tests for shop lifecycle persistence — install/reinstall tracking, plan
 * caching, subscription sync (idempotency + out-of-order guards), uninstall
 * soft-close, and GDPR redaction.
 */

import {
  ensureShopRecord,
  syncPlanCache,
  applySubscriptionUpdate,
  collectUninstallAggregates,
  recordUninstall,
  redactShop,
  maybeSyncShopLifecycle,
  SHOP_STATUS,
  APP_EVENT,
} from "../../../app/utils/shop-lifecycle.server";

const PLAN_CONFIG = {
  planName: "Pro",
  amount: 6.99,
  currencyCode: "USD",
  interval: "EVERY_30_DAYS",
  trialDays: 14,
};

const SHOP_DOMAIN = "test-store.myshopify.com";

function createMockDb() {
  return {
    shop: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    subscription: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      updateMany: vi.fn(),
    },
    appEvent: {
      create: vi.fn().mockResolvedValue({}),
      updateMany: vi.fn(),
    },
    campaign: { count: vi.fn() },
    campaignAnalytics: { aggregate: vi.fn() },
    onboardingState: { findUnique: vi.fn() },
  };
}

function activeShop(overrides = {}) {
  return {
    id: 1,
    domain: SHOP_DOMAIN,
    status: SHOP_STATUS.ACTIVE,
    plan: "Free",
    installCount: 1,
    updatedAt: new Date(),
    firstInstalledAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

describe("ensureShopRecord", () => {
  it("creates the shop and an app_installed event on first install", async () => {
    const db = createMockDb();
    db.shop.findUnique.mockResolvedValue(null);
    db.shop.create.mockResolvedValue(activeShop());

    const result = await ensureShopRecord(db, SHOP_DOMAIN);

    expect(db.shop.create).toHaveBeenCalledWith({
      data: { domain: SHOP_DOMAIN, status: SHOP_STATUS.ACTIVE },
    });
    expect(db.appEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ type: APP_EVENT.INSTALLED, shopDomain: SHOP_DOMAIN }),
    });
    expect(result.domain).toBe(SHOP_DOMAIN);
  });

  it("reactivates an uninstalled shop and increments installCount", async () => {
    const db = createMockDb();
    db.shop.findUnique.mockResolvedValue(activeShop({ status: SHOP_STATUS.UNINSTALLED }));
    db.shop.update.mockResolvedValue(activeShop({ installCount: 2 }));

    await ensureShopRecord(db, SHOP_DOMAIN);

    expect(db.shop.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: expect.objectContaining({
        status: SHOP_STATUS.ACTIVE,
        uninstalledAt: null,
        installCount: { increment: 1 },
      }),
    });
    expect(db.appEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ type: APP_EVENT.REINSTALLED }),
    });
  });

  it("is a no-op for an already-active shop", async () => {
    const db = createMockDb();
    db.shop.findUnique.mockResolvedValue(activeShop());

    const result = await ensureShopRecord(db, SHOP_DOMAIN);

    expect(db.shop.create).not.toHaveBeenCalled();
    expect(db.shop.update).not.toHaveBeenCalled();
    expect(db.appEvent.create).not.toHaveBeenCalled();
    expect(result.status).toBe(SHOP_STATUS.ACTIVE);
  });
});

describe("syncPlanCache", () => {
  it("does nothing when the plan is unchanged", async () => {
    const db = createMockDb();
    db.shop.findUnique.mockResolvedValue(activeShop({ plan: "Pro" }));

    await syncPlanCache(db, SHOP_DOMAIN, "Pro", "webhook");

    expect(db.shop.update).not.toHaveBeenCalled();
    expect(db.appEvent.create).not.toHaveBeenCalled();
  });

  it("does nothing when the shop does not exist", async () => {
    const db = createMockDb();
    db.shop.findUnique.mockResolvedValue(null);

    await syncPlanCache(db, SHOP_DOMAIN, "Pro", "webhook");

    expect(db.shop.update).not.toHaveBeenCalled();
  });

  it("updates the cache and records plan_changed when the plan changes", async () => {
    const db = createMockDb();
    db.shop.findUnique.mockResolvedValue(activeShop({ plan: "Free" }));

    await syncPlanCache(db, SHOP_DOMAIN, "Pro", "billing_check");

    expect(db.shop.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: expect.objectContaining({ plan: "Pro", planSource: "billing_check" }),
    });
    expect(db.appEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: APP_EVENT.PLAN_CHANGED,
        payload: { fromPlan: "Free", toPlan: "Pro", source: "billing_check" },
      }),
    });
  });
});

describe("applySubscriptionUpdate", () => {
  const GID = "gid://shopify/AppSubscription/123";

  function subscriptionPayload(overrides = {}) {
    return {
      admin_graphql_api_id: GID,
      name: "Pro",
      status: "active",
      test: false,
      updated_at: "2026-09-01T10:00:00Z",
      trial_ends_on: null,
      current_period_end: "2026-10-01T10:00:00Z",
      ...overrides,
    };
  }

  it("upserts the subscription, records an event, and caches the plan", async () => {
    const db = createMockDb();
    db.shop.findUnique
      .mockResolvedValueOnce(activeShop()) // ensureShopRecord
      .mockResolvedValueOnce(activeShop({ plan: "Free" })); // syncPlanCache
    db.subscription.findUnique.mockResolvedValue(null);
    db.subscription.upsert.mockResolvedValue({});

    await applySubscriptionUpdate(db, SHOP_DOMAIN, subscriptionPayload(), PLAN_CONFIG, "wh-1");

    expect(db.subscription.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { shopifySubscriptionId: GID },
        create: expect.objectContaining({
          status: "ACTIVE",
          price: PLAN_CONFIG.amount,
          activatedAt: expect.any(Date),
        }),
      })
    );
    expect(db.appEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ type: APP_EVENT.SUBSCRIPTION_UPDATED, webhookId: "wh-1" }),
    });
    // Plan cache moved to Pro
    expect(db.shop.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ plan: "Pro" }) })
    );
  });

  it("skips stale out-of-order updates", async () => {
    const db = createMockDb();
    db.shop.findUnique.mockResolvedValue(activeShop());
    db.subscription.findUnique.mockResolvedValue({
      status: "ACTIVE",
      shopifyUpdatedAt: new Date("2026-09-02T00:00:00Z"),
    });

    await applySubscriptionUpdate(
      db,
      SHOP_DOMAIN,
      subscriptionPayload({ updated_at: "2026-09-01T00:00:00Z", status: "cancelled" }),
      PLAN_CONFIG,
      "wh-2"
    );

    expect(db.subscription.upsert).not.toHaveBeenCalled();
    expect(db.appEvent.create).not.toHaveBeenCalled();
  });

  it("stops silently on a duplicate webhookId (unique violation)", async () => {
    const db = createMockDb();
    db.shop.findUnique.mockResolvedValue(activeShop());
    db.subscription.findUnique.mockResolvedValue(null);
    db.subscription.upsert.mockResolvedValue({});
    const uniqueError = Object.assign(new Error("unique"), { code: "P2002" });
    db.appEvent.create.mockRejectedValue(uniqueError);

    await expect(
      applySubscriptionUpdate(db, SHOP_DOMAIN, subscriptionPayload(), PLAN_CONFIG, "wh-dup")
    ).resolves.toBeUndefined();

    // Plan cache is NOT re-synced after a duplicate
    expect(db.shop.update).not.toHaveBeenCalled();
  });

  it("sets cancelledAt and downgrades the plan cache when a subscription cancels", async () => {
    const db = createMockDb();
    db.shop.findUnique
      .mockResolvedValueOnce(activeShop({ plan: "Pro" }))
      .mockResolvedValueOnce(activeShop({ plan: "Pro" }));
    db.subscription.findUnique.mockResolvedValue({
      status: "ACTIVE",
      shopifyUpdatedAt: new Date("2026-09-01T00:00:00Z"),
    });
    db.subscription.upsert.mockResolvedValue({});

    await applySubscriptionUpdate(
      db,
      SHOP_DOMAIN,
      subscriptionPayload({ status: "cancelled", updated_at: "2026-09-05T00:00:00Z" }),
      PLAN_CONFIG,
      "wh-3"
    );

    expect(db.subscription.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ status: "CANCELLED", cancelledAt: expect.any(Date) }),
      })
    );
    expect(db.shop.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ plan: "Free" }) })
    );
  });
});

describe("collectUninstallAggregates", () => {
  it("returns counts with null-safe sums", async () => {
    const db = createMockDb();
    db.campaign.count.mockResolvedValue(3);
    db.campaignAnalytics.aggregate.mockResolvedValue({
      _sum: { impressions: 1200, clicks: null, closes: 5 },
    });
    db.onboardingState.findUnique.mockResolvedValue({ completedAt: new Date() });

    const result = await collectUninstallAggregates(db, SHOP_DOMAIN);

    expect(result).toEqual({
      campaignCount: 3,
      totalImpressions: 1200,
      totalClicks: 0,
      totalCloses: 5,
      hadCompletedOnboarding: true,
    });
  });
});

describe("recordUninstall", () => {
  const AGGREGATES = { campaignCount: 1, totalImpressions: 10 };

  it("soft-closes the shop, cancels active subscriptions, and records the event", async () => {
    const db = createMockDb();
    db.shop.findUnique.mockResolvedValue(activeShop({ plan: "Pro" }));

    await recordUninstall(db, SHOP_DOMAIN, AGGREGATES);

    expect(db.shop.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: expect.objectContaining({
        status: SHOP_STATUS.UNINSTALLED,
        uninstalledAt: expect.any(Date),
        plan: "Free",
      }),
    });
    expect(db.subscription.updateMany).toHaveBeenCalledWith({
      where: { shopId: 1, status: "ACTIVE" },
      data: expect.objectContaining({ status: "CANCELLED" }),
    });
    expect(db.appEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ type: APP_EVENT.UNINSTALLED, payload: AGGREGATES }),
    });
  });

  it("is idempotent for an already-uninstalled shop (webhook retry)", async () => {
    const db = createMockDb();
    db.shop.findUnique.mockResolvedValue(activeShop({ status: SHOP_STATUS.UNINSTALLED }));

    await recordUninstall(db, SHOP_DOMAIN, AGGREGATES);

    expect(db.shop.update).not.toHaveBeenCalled();
    expect(db.appEvent.create).not.toHaveBeenCalled();
  });
});

describe("redactShop", () => {
  it("anonymizes the domain with a random token and scrubs the event trail", async () => {
    const db = createMockDb();
    db.shop.findUnique.mockResolvedValue(activeShop());

    await redactShop(db, SHOP_DOMAIN);

    const updateArgs = db.shop.update.mock.calls[0][0];
    expect(updateArgs.data.domain).toMatch(/^redacted-[0-9a-f-]{36}$/);
    expect(updateArgs.data.name).toBeNull();
    expect(updateArgs.data.email).toBeNull();
    expect(updateArgs.data.status).toBe(SHOP_STATUS.REDACTED);

    expect(db.appEvent.updateMany).toHaveBeenCalledWith({
      where: { shopId: 1 },
      data: { shopDomain: updateArgs.data.domain },
    });
    expect(db.appEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ type: APP_EVENT.SHOP_REDACTED }),
    });
  });

  it("is a no-op when the shop is unknown (already redacted)", async () => {
    const db = createMockDb();
    db.shop.findUnique.mockResolvedValue(null);

    await redactShop(db, SHOP_DOMAIN);

    expect(db.shop.update).not.toHaveBeenCalled();
  });
});

describe("maybeSyncShopLifecycle", () => {
  it("skips entirely when the shop row is fresh", async () => {
    const db = createMockDb();
    db.shop.findUnique.mockResolvedValue(activeShop({ updatedAt: new Date() }));
    const getPlan = vi.fn();

    await maybeSyncShopLifecycle(db, SHOP_DOMAIN, getPlan);

    expect(getPlan).not.toHaveBeenCalled();
    expect(db.shop.update).not.toHaveBeenCalled();
  });

  it("syncs and caches the plan when stale and the check succeeded", async () => {
    const db = createMockDb();
    const stale = activeShop({ updatedAt: new Date(Date.now() - 7 * 60 * 60 * 1000) });
    // 1: staleness read, 2: ensureShopRecord, 3: syncPlanCache
    db.shop.findUnique
      .mockResolvedValueOnce(stale)
      .mockResolvedValueOnce(stale)
      .mockResolvedValueOnce(stale);
    const getPlan = vi.fn().mockResolvedValue({ plan: "Pro", source: "billing_check" });

    await maybeSyncShopLifecycle(db, SHOP_DOMAIN, getPlan);

    expect(getPlan).toHaveBeenCalled();
    // Plan cache write + throttle touch
    expect(db.shop.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ plan: "Pro" }) })
    );
  });

  it("never caches dev_override or check_failed plan results", async () => {
    const db = createMockDb();
    const stale = activeShop({ updatedAt: new Date(Date.now() - 7 * 60 * 60 * 1000) });
    db.shop.findUnique.mockResolvedValue(stale);
    const getPlan = vi.fn().mockResolvedValue({ plan: "Pro", source: "dev_override" });

    await maybeSyncShopLifecycle(db, SHOP_DOMAIN, getPlan);

    // Only the throttle touch — no plan write
    const planWrites = db.shop.update.mock.calls.filter((call) => call[0]?.data?.plan);
    expect(planWrites).toHaveLength(0);
  });
});
