import { SessionNotFoundError } from "@shopify/shopify-app-remix/server";

/**
 * Statuses that say the token can no longer act for the shop: revoked (401),
 * shop frozen or closed (402, 423), forbidden (403), shop gone (404).
 */
const NOT_INSTALLED_STATUSES = new Set([401, 402, 403, 404, 423]);
const CHECK_TIMEOUT_MS = 5000;

/**
 * Ask Shopify whether the app is installed on this shop right now. shop/redact
 * arrives 48 hours after an uninstall, so a merchant who reinstalled in that
 * window still receives it; erasing them then deletes a live install.
 *
 * An offline token only works while the app is installed: uninstalling revokes
 * it, and app/uninstalled deletes the stored session. Only a definite "no" lets
 * the erasure go ahead; a 429, 5xx, timeout or malformed reply is rethrown so
 * the caller returns 500 and Shopify redelivers.
 *
 * Admin API 2026-07, no access scope needed (`shop { id }`).
 *
 * @param {(shop: string) => Promise<{ admin: { graphql: Function } }>} getAdmin - unauthenticated.admin
 * @param {string} shop
 * @returns {Promise<boolean>}
 */
export async function isAppInstalled(getAdmin, shop) {
  try {
    const { admin } = await getAdmin(shop);
    const response = await admin.graphql(
      `#graphql
      query ShopRedactInstallCheck {
        shop { id }
      }`,
      { signal: AbortSignal.timeout(CHECK_TIMEOUT_MS) }
    );
    const body = await response.json();
    if (!body?.data?.shop?.id) throw new Error("install check returned no shop id");
    return true;
  } catch (error) {
    if (error instanceof SessionNotFoundError) return false;
    if (NOT_INSTALLED_STATUSES.has(error?.response?.code)) return false;
    throw error;
  }
}
