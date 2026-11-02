import { json } from "@remix-run/node";
import { isValidAppProxyRequest } from "../utils/app-proxy.server";
import { recordStorefrontEvent } from "../utils/storefront-track.server";

export const loader = async () => json({ error: "Method not allowed" }, { status: 405 });

// App proxy target for the widget's relative fallback; see routes/settings.jsx.
export const action = async ({ request }) => {
  if (!isValidAppProxyRequest(request)) {
    return json({ error: "Invalid signature" }, { status: 401 });
  }
  return recordStorefrontEvent(request, { isVerifiedProxy: true });
};
