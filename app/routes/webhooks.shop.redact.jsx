import { authenticate } from "../shopify.server";
import db from "../db.server";

/**
 * Shopify mandatory GDPR webhook: shop/redact
 *
 * Fired 48 hours after a merchant uninstalls the app. Requires
 * deletion of ALL shop data. The app/uninstalled webhook already
 * handles immediate cleanup, but this is the final guarantee.
 *
 * See: https://shopify.dev/docs/apps/webhooks/configuration/mandatory-webhooks
 */
export const action = async ({ request }) => {
  const { topic, shop, payload } = await authenticate.webhook(request);
  console.log(`[Webhook] ${topic} received for ${shop} — deleting all shop data`);

  const shopDomain = payload?.shop_domain || shop;

  try {
    // Delete in order: analytics → campaigns → onboarding → sessions → settings
    await db.campaignAnalytics.deleteMany({
      where: { campaign: { shop: shopDomain } },
    });
    await db.campaign.deleteMany({ where: { shop: shopDomain } });
    await db.onboardingState.deleteMany({ where: { shop: shopDomain } });
    await db.session.deleteMany({ where: { shop: shopDomain } });
    await db.setting.deleteMany({ where: { shop: shopDomain } });

    console.log(`[Webhook] ${topic} — all data deleted for ${shopDomain}`);
  } catch (error) {
    console.error(`[Webhook] ${topic} — error deleting data for ${shopDomain}:`, error.message);
  }

  return new Response(null, { status: 200 });
};
