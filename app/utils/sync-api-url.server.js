import { env } from "../env.server";
import { logger } from "./logger.server";

const NAMESPACE = "countdown_timer";
const KEY = "api_url";

const cache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;

/** Callers await this on an admin page load, so a slow Admin API must not hold it up. */
export const SYNC_TIMEOUT_MS = 4000;

async function writeApiUrl(admin, shop, appUrl) {
  const response = await admin.graphql(
    `#graphql
    query shopId {
      shop { id }
    }`
  );
  const shopData = await response.json();
  const shopGid = shopData?.data?.shop?.id;
  if (!shopGid) return { ok: false, reason: "shop_id_missing" };

  const mutResponse = await admin.graphql(
    `#graphql
    mutation setApiUrl($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        metafields { id }
        userErrors { field message }
      }
    }`,
    {
      variables: {
        metafields: [
          {
            namespace: NAMESPACE,
            key: KEY,
            type: "single_line_text_field",
            value: appUrl,
            ownerId: shopGid,
          },
        ],
      },
    }
  );

  const data = await mutResponse.json();
  const errors = data?.data?.metafieldsSet?.userErrors;
  if (errors?.length) {
    logger.error({ shop, errors }, "sync-api-url: metafield userErrors");
    return { ok: false, reason: "user_errors" };
  }

  cache.set(shop, { url: appUrl, ts: Date.now() });
  logger.debug({ shop, appUrl }, "sync-api-url: metafield synced");
  return { ok: true };
}

function timeoutAfter(ms) {
  let timer;
  const promise = new Promise((resolve) => {
    timer = setTimeout(() => resolve({ ok: false, reason: "timeout" }), ms);
  });
  return { promise, cancel: () => clearTimeout(timer) };
}

/**
 * Publish the app URL to the shop metafield the storefront widget reads. Never
 * throws: a failure here must not block auth or the admin, but the caller gets
 * the reason so it can be shown.
 *
 * @param {{ graphql: Function }} admin
 * @param {string} shop
 * @returns {Promise<{ ok: true } | { ok: false, reason: string }>}
 */
export async function syncApiUrlMetafield(admin, shop) {
  const appUrl = env.SHOPIFY_APP_URL;
  if (!appUrl) return { ok: false, reason: "app_url_missing" };

  const cached = cache.get(shop);
  if (cached && cached.url === appUrl && Date.now() - cached.ts < CACHE_TTL_MS) {
    return { ok: true };
  }

  const timeout = timeoutAfter(SYNC_TIMEOUT_MS);
  try {
    const result = await Promise.race([writeApiUrl(admin, shop, appUrl), timeout.promise]);
    if (!result.ok && result.reason !== "user_errors") {
      logger.error({ shop, reason: result.reason }, "sync-api-url: failed");
    }
    return result;
  } catch (error) {
    // A thrown Response (reauth) has no message; other loaders handle the redirect.
    logger.error({ shop, error: error?.message ?? error?.status }, "sync-api-url: failed");
    return { ok: false, reason: "request_failed" };
  } finally {
    timeout.cancel();
  }
}
