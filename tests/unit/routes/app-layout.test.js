// @vitest-environment node
/** SHOP-03: the URL refresh is awaited on admin load and runs at install. */
import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  sync: vi.fn(),
  authenticateAdmin: vi.fn(),
  maybeSync: vi.fn(),
  recordAuthorization: vi.fn(),
  config: null,
}));

vi.mock("@shopify/polaris/build/esm/styles.css?url", () => ({ default: "styles.css" }));
vi.mock("@shopify/shopify-app-remix/adapters/node", () => ({}));
vi.mock("@shopify/shopify-app-remix/server", () => ({
  ApiVersion: { July26: "2026-07" },
  AppDistribution: { AppStore: "app_store" },
  BillingInterval: { Every30Days: "EVERY_30_DAYS" },
  boundary: { error: vi.fn(), headers: vi.fn() },
  shopifyApp: (config) => {
    mocks.config = config;
    return { authenticate: { admin: mocks.authenticateAdmin } };
  },
}));
vi.mock("@shopify/shopify-app-session-storage-prisma", () => ({
  PrismaSessionStorage: class {
    ready = Promise.resolve(true);
  },
}));
vi.mock("../../../app/db.server", () => ({ default: {} }));
vi.mock("../../../app/env.server", () => ({ env: { SHOPIFY_API_KEY: "k" } }));
vi.mock("../../../app/utils/sync-api-url.server", () => ({ syncApiUrlMetafield: mocks.sync }));
vi.mock("../../../app/utils/shop-lifecycle.server", () => ({
  maybeSyncShopLifecycle: mocks.maybeSync,
  recordAuthorization: mocks.recordAuthorization,
}));
vi.mock("../../../app/utils/billing.server", () => ({ getPlanInfo: vi.fn() }));
vi.mock("../../../app/utils/logger.server", () => ({ logger: { error: vi.fn() } }));

const { loader } = await import("../../../app/routes/app");
await import("../../../app/shopify.server");

const admin = { graphql: vi.fn() };
const session = { shop: "busy-store.myshopify.com" };

describe("storefront API URL refresh", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authenticateAdmin.mockResolvedValue({ admin, session, billing: {} });
    mocks.maybeSync.mockResolvedValue();
    mocks.recordAuthorization.mockResolvedValue({});
  });

  test("the admin loader waits for the refresh", async () => {
    let finish;
    mocks.sync.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    let settled = false;
    const pending = loader({ request: new Request("http://local.test/app") }).then((result) => {
      settled = true;
      return result;
    });
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(settled).toBe(false);
    finish({ ok: true });
    await expect(pending).resolves.toMatchObject({ isApiUrlSynced: true });
  });

  test("the admin loader reports a failed refresh", async () => {
    mocks.sync.mockResolvedValue({ ok: false, reason: "user_errors" });
    const result = await loader({ request: new Request("http://local.test/app") });
    expect(result.isApiUrlSynced).toBe(false);
  });

  test("install runs the refresh, so it does not depend on opening the admin", async () => {
    mocks.sync.mockResolvedValue({ ok: true });
    await mocks.config.hooks.afterAuth({ session, admin });
    expect(mocks.sync).toHaveBeenCalledWith(admin, session.shop);
  });

  test("a failed refresh does not stop lifecycle tracking at install", async () => {
    mocks.sync.mockResolvedValue({ ok: false, reason: "timeout" });
    await mocks.config.hooks.afterAuth({ session, admin });
    expect(mocks.recordAuthorization).toHaveBeenCalledTimes(1);
  });
});
