import { env } from "../env.server";
import { logger } from "./logger.server";

const NAMESPACE = "countdown_timer";
const KEY = "api_url";

const cache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;

export async function syncApiUrlMetafield(admin, shop) {
  const appUrl = env.SHOPIFY_APP_URL;
  if (!appUrl) return;

  const cached = cache.get(shop);
  if (cached && cached.url === appUrl && Date.now() - cached.ts < CACHE_TTL_MS) {
    return;
  }

  try {
    const response = await admin.graphql(
      `#graphql
      query shopId {
        shop { id }
      }`
    );
    const shopData = await response.json();
    const shopGid = shopData?.data?.shop?.id;
    if (!shopGid) return;

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
      logger.warn({ shop, errors }, "sync-api-url: metafield userErrors");
    } else {
      cache.set(shop, { url: appUrl, ts: Date.now() });
      logger.debug({ shop, appUrl }, "sync-api-url: metafield synced");
    }
  } catch (error) {
    logger.warn({ shop, error: error.message }, "sync-api-url: failed (non-fatal)");
  }
}
