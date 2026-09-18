import { authenticate } from "../shopify.server";
import { PLAN_PRO_CONFIG } from "../utils/plan-config";
import db from "../db.server";
import { logger } from "../utils/logger.server";
import { applySubscriptionUpdate } from "../utils/shop-lifecycle.server";

export const action = async ({ request }) => {
  const webhookId = request.headers.get("x-shopify-webhook-id");
  const { shop, topic, payload } = await authenticate.webhook(request);

  logger.info({ topic, shop, webhookId }, "webhook.received");

  const appSubscription = payload?.app_subscription;
  if (!appSubscription) {
    // Malformed payload — acknowledge so Shopify doesn't retry something we can never process.
    logger.warn(
      { topic, shop, webhookId },
      "webhook.subscriptions_update — missing app_subscription"
    );
    return new Response();
  }

  try {
    await applySubscriptionUpdate(db, shop, appSubscription, PLAN_PRO_CONFIG, webhookId);
    logger.info(
      { topic, shop, status: appSubscription.status, webhookId },
      "webhook.subscriptions_update — applied"
    );
  } catch (error) {
    logger.error(
      { topic, shop, webhookId, error: error.message },
      "webhook.subscriptions_update — failed"
    );
    // Non-200 makes Shopify retry; applySubscriptionUpdate is idempotent on webhookId.
    return new Response(null, { status: 500 });
  }

  return new Response();
};
