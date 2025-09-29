import { json } from "@remix-run/node";
import db from "../db.server";

/**
 * App Proxy endpoint for storefront requests:
 * Responds to GET https://{shop}/apps/countdown/settings?shop={shop}
 * Make sure your App Proxy in Partners is:
 *   Subpath prefix: apps
 *   Subpath: countdown
 *   Proxy URL (on your app): /apps/countdown
 * This file path maps to /apps/countdown/settings in Remix.
 */
export const loader = async ({ request }) => {
  try {
    const url = new URL(request.url);
    // Prefer explicit ?shop=…; fall back to proxy header if needed
    const shop = url.searchParams.get("shop") ||
                 request.headers.get("X-Shopify-Shop-Domain");

    if (!shop) {
      return json({ success: false, error: "Shop parameter required" }, { status: 400 });
    }

    const saved = await db.setting.findUnique({ where: { shop } });
    if (saved?.value) {
      const settings = JSON.parse(saved.value);
      return json({ success: true, settings }, {
        headers: {
          // Cache lightly to reduce load, safe for public settings
          "Cache-Control": "public, max-age=60"
        }
      });
    }

    return json({ success: false, message: "No settings found" });
  } catch (e) {
    console.error("Proxy settings error:", e);
    return json({ success: false, error: e.message }, { status: 500 });
  }
};
