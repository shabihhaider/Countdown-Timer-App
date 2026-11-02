// @vitest-environment node
/** B14 and B3 residual: webhook ordering edge cases. */
import { beforeEach, describe, expect, test, vi } from "vitest";
import {
  APP_EVENT,
  applySubscriptionUpdate,
  isStaleUninstallDelivery,
  recordAuthorization,
} from "../../../app/utils/shop-lifecycle.server";

const SHOP = "busy-store.myshopify.com";
const CONFIG = { planName: "Pro", amount: 6.99, currencyCode: "USD", interval: "M", trialDays: 14 };
const SAME_SECOND = "2026-11-01T10:00:00Z";

function fakeDb(existingStatus) {
  return {
    shop: {
      findUnique: vi.fn().mockResolvedValue({ id: 1, status: "active", plan: "Pro" }),
      update: vi.fn().mockResolvedValue({}),
    },
    subscription: {
      findUnique: vi.fn().mockResolvedValue({
        status: existingStatus,
        shopifyUpdatedAt: new Date(SAME_SECOND),
      }),
      findFirst: vi.fn().mockResolvedValue(null),
      upsert: vi.fn().mockResolvedValue({}),
    },
    appEvent: { create: vi.fn().mockResolvedValue({}) },
  };
}

const payload = (status, updatedAt = SAME_SECOND) => ({
  admin_graphql_api_id: "gid://shopify/AppSubscription/1",
  status,
  updated_at: updatedAt,
  name: "Pro",
});

describe("subscription updates carrying the same second", () => {
  test("a cancellation after activation is applied", async () => {
    const db = fakeDb("ACTIVE");
    await applySubscriptionUpdate(db, SHOP, payload("CANCELLED"), CONFIG, "w2");
    expect(db.subscription.upsert).toHaveBeenCalledTimes(1);
    expect(db.subscription.upsert.mock.calls[0][0].update.status).toBe("CANCELLED");
  });

  test("activation after pending is applied", async () => {
    const db = fakeDb("PENDING");
    await applySubscriptionUpdate(db, SHOP, payload("ACTIVE"), CONFIG, "w2");
    expect(db.subscription.upsert).toHaveBeenCalledTimes(1);
  });

  test("activation delivered late cannot undo a same-second cancellation", async () => {
    const db = fakeDb("CANCELLED");
    await applySubscriptionUpdate(db, SHOP, payload("ACTIVE"), CONFIG, "w2");
    expect(db.subscription.upsert).not.toHaveBeenCalled();
  });

  test("a same-status duplicate is still skipped", async () => {
    const db = fakeDb("ACTIVE");
    await applySubscriptionUpdate(db, SHOP, payload("ACTIVE"), CONFIG, "w2");
    expect(db.subscription.upsert).not.toHaveBeenCalled();
  });

  test("an older update is still skipped", async () => {
    const db = fakeDb("ACTIVE");
    await applySubscriptionUpdate(
      db,
      SHOP,
      payload("CANCELLED", "2026-11-01T09:00:00Z"),
      CONFIG,
      "w"
    );
    expect(db.subscription.upsert).not.toHaveBeenCalled();
  });
});

describe("reinstall before the uninstall webhook is processed", () => {
  const installedAt = new Date("2026-10-01T00:00:00Z");
  const shop = { status: "active", installedAt };
  const uninstalledAt = "2026-11-01T10:00:00Z";
  const reauthorizedAt = new Date("2026-11-01T10:05:00Z");

  test("an uninstall older than the latest authorization is stale", () => {
    expect(isStaleUninstallDelivery(shop, uninstalledAt, reauthorizedAt)).toBe(true);
  });

  test("an uninstall newer than the latest authorization is real", () => {
    const later = "2026-11-01T11:00:00Z";
    expect(isStaleUninstallDelivery(shop, later, reauthorizedAt)).toBe(false);
  });

  test("without any authorization event the install time decides", () => {
    expect(isStaleUninstallDelivery(shop, uninstalledAt, null)).toBe(false);
  });
});

describe("recordAuthorization", () => {
  let db;

  beforeEach(() => {
    db = {
      shop: {
        findUnique: vi.fn(),
        create: vi.fn().mockResolvedValue({ id: 1 }),
        update: vi.fn().mockResolvedValue({ id: 1 }),
      },
      appEvent: { create: vi.fn().mockResolvedValue({}) },
    };
  });

  test("records an event when an active shop authorizes again", async () => {
    db.shop.findUnique.mockResolvedValue({ id: 1, status: "active" });
    await recordAuthorization(db, SHOP);
    expect(db.appEvent.create).toHaveBeenCalledTimes(1);
    expect(db.appEvent.create.mock.calls[0][0].data.type).toBe(APP_EVENT.AUTHORIZED);
  });

  test("a first install records only the install event", async () => {
    db.shop.findUnique.mockResolvedValue(null);
    await recordAuthorization(db, SHOP);
    expect(db.appEvent.create).toHaveBeenCalledTimes(1);
    expect(db.appEvent.create.mock.calls[0][0].data.type).toBe(APP_EVENT.INSTALLED);
  });

  test("a reinstall records only the reinstall event", async () => {
    db.shop.findUnique.mockResolvedValue({ id: 1, status: "uninstalled" });
    await recordAuthorization(db, SHOP);
    expect(db.appEvent.create).toHaveBeenCalledTimes(1);
    expect(db.appEvent.create.mock.calls[0][0].data.type).toBe(APP_EVENT.REINSTALLED);
  });
});
