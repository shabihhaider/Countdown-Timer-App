import { json } from "@remix-run/node";
import { isValidAppProxyRequest } from "../utils/app-proxy.server";
import { loadStorefrontSettings } from "../utils/storefront-settings.server";

// App proxy target for the widget's relative fallback. shopify.app.toml proxies
// /apps/countdown/* to the app root, so /apps/countdown/settings arrives here.
// Only Shopify can reach this legitimately, so unlike the direct route it can
// require a signature: an unsigned caller had a 404 here before this route existed.
export const loader = async ({ request }) => {
  if (!isValidAppProxyRequest(request)) {
    return json(
      { success: false, error: "Invalid signature" },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }
  return loadStorefrontSettings(request, { isVerifiedProxy: true });
};
