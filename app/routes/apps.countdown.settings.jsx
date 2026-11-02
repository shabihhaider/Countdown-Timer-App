import { loadStorefrontSettings } from "../utils/storefront-settings.server";

// Direct path: the widget calls this cross-origin, using the URL in the shop's
// api_url metafield. Unsigned because no proxy is involved (SEC-06).
export const loader = async ({ request }) => loadStorefrontSettings(request);
