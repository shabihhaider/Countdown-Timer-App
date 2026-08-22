import { authenticate } from "../shopify.server";
import db from "../db.server";
import { logger } from "../utils/logger.server";

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
  const { topic, shop } = await authenticate.webhook(request);
  logger.info({ topic, shop }, "webhook.gdpr.shop_redact — deleting all shop data");

  // Use only the HMAC-verified shop from authenticate.webhook — never trust payload
  const shopDomain = shop;

  try {
    // Delete in order: analytics → campaigns → onboarding → sessions → settings
    await db.campaignAnalytics.deleteMany({
      where: { campaign: { shop: shopDomain } },
    });
    await db.campaign.deleteMany({ where: { shop: shopDomain } });
    await db.onboardingState.deleteMany({ where: { shop: shopDomain } });
    await db.session.deleteMany({ where: { shop: shopDomain } });
    await db.setting.deleteMany({ where: { shop: shopDomain } });

    logger.info({ topic, shopDomain }, "webhook.gdpr.shop_redact — data deleted");
  } catch (error) {
    logger.error(
      { topic, shopDomain, error: error.message },
      "webhook.gdpr.shop_redact — delete failed"
    );
    // Non-200 makes Shopify retry the webhook — required to meet the 48h purge obligation
    return new Response(null, { status: 500 });
  }

  return new Response(null, { status: 200 });
};
