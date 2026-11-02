import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "../env.server";

const SIGNATURE_MAX_AGE_SECONDS = 90;
const SINGLE_VALUE_PARAMS = ["shop", "signature", "timestamp"];

/**
 * Verify an app proxy signature (shopify.dev: "Authenticate app proxies"): sorted
 * `key=value` pairs, repeated keys comma-joined, no separator, HMAC-SHA256 hex.
 *
 * The SDK's authenticate.public.appProxy also loads the offline session, which
 * adds a database read to a public path, and its validator is not exported, so
 * this is verified here. tests/unit/utils/app-proxy.test.js checks it against
 * the SDK validator.
 *
 * @param {Request} request
 * @param {string} [secret]
 * @returns {boolean}
 */
export function isValidAppProxyRequest(request, secret = env.SHOPIFY_API_SECRET) {
  const { searchParams } = new URL(request.url);
  const signature = searchParams.get("signature");
  if (!signature || !secret) return false;
  if (SINGLE_VALUE_PARAMS.some((name) => searchParams.getAll(name).length !== 1)) return false;

  const ageSeconds = Math.abs(Date.now() / 1000 - Number(searchParams.get("timestamp")));
  if (!(ageSeconds <= SIGNATURE_MAX_AGE_SECONDS)) return false;

  const keys = [...new Set(searchParams.keys())].filter((key) => key !== "signature").sort();
  const message = keys.map((key) => `${key}=${searchParams.getAll(key).join(",")}`).join("");

  const expected = createHmac("sha256", secret).update(message).digest();
  const received = Buffer.from(signature, "hex");
  return received.length === expected.length && timingSafeEqual(received, expected);
}
