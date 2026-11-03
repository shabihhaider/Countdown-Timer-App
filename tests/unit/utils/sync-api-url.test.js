// @vitest-environment node
/** SHOP-03: the storefront API URL refresh reports failure instead of hiding it. */
import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({ error: vi.fn() }));

vi.mock("../../../app/env.server", () => ({
  env: { SHOPIFY_APP_URL: "https://app.example.com" },
}));
vi.mock("../../../app/utils/logger.server", () => ({
  logger: { error: mocks.error, warn: vi.fn(), debug: vi.fn(), info: vi.fn() },
}));

const { syncApiUrlMetafield, SYNC_TIMEOUT_MS } = await import(
  "../../../app/utils/sync-api-url.server"
);

const reply = (body) => ({ json: async () => body });
const installReply = reply({
  data: { currentAppInstallation: { id: "gid://shopify/AppInstallation/1" } },
});
const okReply = reply({ data: { metafieldsSet: { metafields: [{ id: "1" }], userErrors: [] } } });

let shopCounter = 0;
const nextShop = () => `shop-${shopCounter++}.myshopify.com`;

describe("syncApiUrlMetafield", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  test("writes the app URL and reports success", async () => {
    const graphql = vi.fn().mockResolvedValueOnce(installReply).mockResolvedValueOnce(okReply);
    await expect(syncApiUrlMetafield({ graphql }, nextShop())).resolves.toEqual({ ok: true });
    const { variables } = graphql.mock.calls[1][1];
    expect(variables.metafields[0].value).toBe("https://app.example.com");
  });

  test("writes to the app installation, which no other app can overwrite", async () => {
    const graphql = vi.fn().mockResolvedValueOnce(installReply).mockResolvedValueOnce(okReply);
    await syncApiUrlMetafield({ graphql }, nextShop());
    const { variables } = graphql.mock.calls[1][1];
    expect(variables.metafields[0].ownerId).toBe("gid://shopify/AppInstallation/1");
  });

  test("skips the Admin API inside the cache window", async () => {
    const shop = nextShop();
    const graphql = vi.fn().mockResolvedValueOnce(installReply).mockResolvedValueOnce(okReply);
    await syncApiUrlMetafield({ graphql }, shop);
    await expect(syncApiUrlMetafield({ graphql }, shop)).resolves.toEqual({ ok: true });
    expect(graphql).toHaveBeenCalledTimes(2);
  });

  test("reports userErrors as a failure and does not cache", async () => {
    const shop = nextShop();
    const rejected = reply({
      data: { metafieldsSet: { userErrors: [{ field: ["x"], message: "denied" }] } },
    });
    const graphql = vi.fn().mockResolvedValueOnce(installReply).mockResolvedValueOnce(rejected);
    await expect(syncApiUrlMetafield({ graphql }, shop)).resolves.toEqual({
      ok: false,
      reason: "user_errors",
    });
    expect(mocks.error).toHaveBeenCalledTimes(1);

    graphql.mockResolvedValueOnce(installReply).mockResolvedValueOnce(okReply);
    await expect(syncApiUrlMetafield({ graphql }, shop)).resolves.toEqual({ ok: true });
  });

  test("reports a missing shop id", async () => {
    const graphql = vi.fn().mockResolvedValue(reply({ errors: [{ message: "denied" }] }));
    await expect(syncApiUrlMetafield({ graphql }, nextShop())).resolves.toEqual({
      ok: false,
      reason: "installation_id_missing",
    });
    expect(mocks.error).toHaveBeenCalledTimes(1);
  });

  test("reports a thrown request without rethrowing", async () => {
    const graphql = vi.fn().mockRejectedValue(new Error("network"));
    await expect(syncApiUrlMetafield({ graphql }, nextShop())).resolves.toEqual({
      ok: false,
      reason: "request_failed",
    });
    expect(mocks.error).toHaveBeenCalledTimes(1);
  });

  test("reports a thrown Response (reauth) without rethrowing", async () => {
    const graphql = vi.fn().mockRejectedValue(new Response(null, { status: 401 }));
    const result = await syncApiUrlMetafield({ graphql }, nextShop());
    expect(result.reason).toBe("request_failed");
  });

  test("gives up on a hung Admin API so the admin page still loads", async () => {
    vi.useFakeTimers();
    const graphql = vi.fn(() => new Promise(() => {}));
    const pending = syncApiUrlMetafield({ graphql }, nextShop());
    await vi.advanceTimersByTimeAsync(SYNC_TIMEOUT_MS + 1);
    await expect(pending).resolves.toEqual({ ok: false, reason: "timeout" });
  });
});
