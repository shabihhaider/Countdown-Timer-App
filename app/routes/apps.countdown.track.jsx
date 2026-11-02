import { recordStorefrontEvent } from "../utils/storefront-track.server";

// Called by the storefront widget via navigator.sendBeacon or fetch POST.
export const action = async ({ request }) => recordStorefrontEvent(request);

// Handle CORS preflight from storefront
export const loader = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
};
