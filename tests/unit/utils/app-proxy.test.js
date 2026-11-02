// @vitest-environment node
/** SEC-06: signed app proxy requests, checked against the Shopify SDK's own validator. */
import { createHmac } from "node:crypto";
import "@shopify/shopify-api/adapters/node";
import { ApiVersion, shopifyApi } from "@shopify/shopify-api";
import { describe, expect, test } from "vitest";
import { isValidAppProxyRequest } from "../../../app/utils/app-proxy.server";

const SECRET = "fake_audit_secret";
const SHOP = "busy-store.myshopify.com";

function signedUrl(params, secret = SECRET) {
  const message = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("");
  const signature = createHmac("sha256", secret).update(message).digest("hex");
  const query = new URLSearchParams({ ...params, signature });
  return `http://local.test/settings?${query}`;
}

const validParams = (over = {}) => ({
  shop: SHOP,
  path_prefix: "/apps/countdown",
  timestamp: String(Math.floor(Date.now() / 1000)),
  type: "bar",
  ...over,
});

const check = (url) => isValidAppProxyRequest(new Request(url), SECRET);

describe("isValidAppProxyRequest", () => {
  test("accepts a correct signature", () => {
    expect(check(signedUrl(validParams()))).toBe(true);
  });

  test("agrees with the Shopify SDK validator", async () => {
    const api = shopifyApi({
      apiKey: "k",
      apiSecretKey: SECRET,
      apiVersion: ApiVersion.July26,
      hostName: "local.test",
      isEmbeddedApp: true,
      scopes: [],
    });
    const url = signedUrl(validParams({ logged_in_customer_id: "" }));
    const query = new URL(url).searchParams;
    await expect(api.utils.validateHmac(query, { signator: "appProxy" })).resolves.toBe(true);
    expect(check(url)).toBe(true);
  });

  test("rejects a missing signature", () => {
    const query = new URLSearchParams(validParams());
    expect(check(`http://local.test/settings?${query}`)).toBe(false);
  });

  test("rejects the wrong secret", () => {
    expect(check(signedUrl(validParams(), "other-secret"))).toBe(false);
  });

  test("rejects a tampered parameter", () => {
    const url = signedUrl(validParams()).replace("busy-store", "victim-store");
    expect(check(url)).toBe(false);
  });

  test("rejects a replay outside the time window", () => {
    const stale = String(Math.floor(Date.now() / 1000) - 3600);
    expect(check(signedUrl(validParams({ timestamp: stale })))).toBe(false);
  });

  test("rejects a repeated shop parameter", () => {
    expect(check(`${signedUrl(validParams())}&shop=victim.myshopify.com`)).toBe(false);
  });

  test("rejects a malformed signature without throwing", () => {
    const query = new URLSearchParams({ ...validParams(), signature: "zz" });
    expect(check(`http://local.test/settings?${query}`)).toBe(false);
  });
});
