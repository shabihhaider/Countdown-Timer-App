import { redirect } from "@remix-run/node";

export const loader = async ({ request }) => {
  const url = new URL(request.url);

  // Always redirect to /app. With unstable_newEmbeddedAuthStrategy, Shopify
  // loads the app iframe at / without query parameters, and App Bridge
  // (session token exchange) only initializes on /app routes via AppProvider.
  // Keeping the landing page at / would show a login form instead of the app.
  //
  // The /app route handles all auth scenarios:
  //   - Embedded (admin iframe): App Bridge + session token exchange
  //   - Direct access: bounces through Shopify OAuth
  //
  // The public landing page will be restored when redesigned (#13).
  const params = url.searchParams.toString();
  throw redirect(params ? `/app?${params}` : "/app");
};

// Remix requires a default export even though the loader always redirects
export default function Index() {
  return null;
}
