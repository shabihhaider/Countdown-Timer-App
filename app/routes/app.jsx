import { Link, Outlet, useLoaderData, useRouteError } from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { NavMenu } from "@shopify/app-bridge-react";
import { Banner, Box } from "@shopify/polaris";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { syncApiUrlMetafield } from "../utils/sync-api-url.server";
import { getPlanInfo } from "../utils/billing.server";
import { maybeSyncShopLifecycle } from "../utils/shop-lifecycle.server";
import { logger } from "../utils/logger.server";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export const loader = async ({ request }) => {
  const { admin, session, billing } = await authenticate.admin(request);
  // Awaited: on serverless, work left running after the response may never finish.
  const apiUrlSync = await syncApiUrlMetafield(admin, session.shop);
  // Fire-and-forget: lifecycle tracking must never slow or break the merchant UI.
  maybeSyncShopLifecycle(db, session.shop, () => getPlanInfo(billing)).catch((error) => {
    logger.error({ shop: session.shop, error: error.message }, "lifecycle.app_load_sync_failed");
  });
  return { apiKey: process.env.SHOPIFY_API_KEY || "", isApiUrlSynced: apiUrlSync.ok };
};

export default function App() {
  const { apiKey, isApiUrlSynced } = useLoaderData();

  return (
    <AppProvider isEmbeddedApp apiKey={apiKey}>
      <NavMenu>
        <Link to="/app" rel="home">
          Home
        </Link>
        <Link to="/app/campaigns">Campaigns</Link>
        <Link to="/app/analytics">Analytics</Link>
        <Link to="/app/billing">Plan</Link>
        <Link to="/app/onboarding">Setup Guide</Link>
        <Link to="/app/help">Help</Link>
      </NavMenu>
      {!isApiUrlSynced && (
        <Box padding="400">
          <Banner tone="warning" title="Your storefront timers may not be up to date">
            We could not update your store's connection to this app. Reload this page to try again.
            If this message stays, contact support.
          </Banner>
        </Box>
      )}
      <Outlet />
    </AppProvider>
  );
}

// Shopify needs Remix to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
