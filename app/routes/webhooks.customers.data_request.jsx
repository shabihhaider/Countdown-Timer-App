import { authenticate } from "../shopify.server";
import { logger } from "../utils/logger.server";

/**
 * Shopify mandatory GDPR webhook: customers/data_request
 *
 * Fired when a customer requests their data. Since our app does NOT
 * collect, store, or process any customer PII (we only store merchant
 * campaign settings and aggregate analytics — no visitor-level data),
 * we acknowledge the request and return 200.
 *
 * See: https://shopify.dev/docs/apps/webhooks/configuration/mandatory-webhooks
 */
export const action = async ({ request }) => {
  const { topic, shop } = await authenticate.webhook(request);
  logger.info({ topic, shop }, "webhook.gdpr.data_request");

  return new Response(null, { status: 200 });
};
