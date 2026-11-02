import { authenticate } from "../shopify.server";
import { logger } from "./logger.server";

/**
 * authenticate.webhook, except that signed input it cannot parse is acknowledged.
 *
 * The library checks the HMAC first, then throws raw errors for truncated JSON
 * and an invalid shop header. As a 500 those would be retried, and a retry can
 * never succeed. Anything else stays a throw: a session store outage must fail,
 * so that Shopify redelivers.
 *
 * @param {Request} request
 * @returns {ReturnType<typeof authenticate.webhook>}
 */
export async function authenticateWebhook(request) {
  try {
    return await authenticate.webhook(request);
  } catch (error) {
    // By class name: @shopify/shopify-api is not a direct dependency, and this
    // error's `name` property is the inherited "Error".
    const reason = error?.constructor?.name;
    if (reason === "SyntaxError" || reason === "InvalidShopError") {
      logger.warn({ reason }, "webhook.malformed — acknowledged, not processed");
      throw new Response(null, { status: 200 });
    }
    throw error;
  }
}
