// @vitest-environment node
/** B4: shop/redact must not erase a shop the app is installed on again. */
import { SessionNotFoundError } from "@shopify/shopify-app-remix/server";
import { describe, expect, test, vi } from "vitest";
import { isAppInstalled } from "../../../app/utils/install-check.server";

const SHOP = "returning-store.myshopify.com";

const adminReturning = (body) => ({
  admin: { graphql: vi.fn().mockResolvedValue(new Response(JSON.stringify(body))) },
});

const adminThrowing = (error) => ({ admin: { graphql: vi.fn().mockRejectedValue(error) } });

describe("isAppInstalled", () => {
  test("a working offline token means the app is installed", async () => {
    const getAdmin = vi
      .fn()
      .mockResolvedValue(adminReturning({ data: { shop: { id: "gid://shopify/Shop/1" } } }));
    await expect(isAppInstalled(getAdmin, SHOP)).resolves.toBe(true);
    expect(getAdmin).toHaveBeenCalledWith(SHOP);
  });

  test("no stored session means the app is not installed", async () => {
    const getAdmin = vi.fn().mockRejectedValue(new SessionNotFoundError("none"));
    await expect(isAppInstalled(getAdmin, SHOP)).resolves.toBe(false);
  });

  test.each([401, 402, 403, 404, 423])(
    "a %i reply (revoked token, closed or frozen shop) means not installed",
    async (code) => {
      const failure = Object.assign(new Error(`HTTP ${code}`), { response: { code } });
      const getAdmin = vi.fn().mockResolvedValue(adminThrowing(failure));
      await expect(isAppInstalled(getAdmin, SHOP)).resolves.toBe(false);
    }
  );

  test.each([429, 500, 502])("a %i reply is not an answer and is rethrown", async (code) => {
    const failure = Object.assign(new Error(`HTTP ${code}`), { response: { code } });
    const getAdmin = vi.fn().mockResolvedValue(adminThrowing(failure));
    await expect(isAppInstalled(getAdmin, SHOP)).rejects.toThrow(`HTTP ${code}`);
  });

  test("the Admin API call is bounded by a timeout", async () => {
    const reply = adminReturning({ data: { shop: { id: "gid://shopify/Shop/1" } } });
    await isAppInstalled(vi.fn().mockResolvedValue(reply), SHOP);
    const options = reply.admin.graphql.mock.calls[0][1];
    expect(options.signal).toBeInstanceOf(AbortSignal);
  });

  test("a response without a shop id is not an answer", async () => {
    const getAdmin = vi.fn().mockResolvedValue(adminReturning({ errors: [{ message: "x" }] }));
    await expect(isAppInstalled(getAdmin, SHOP)).rejects.toThrow("no shop id");
  });
});
