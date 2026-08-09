import { authenticate } from "../shopify.server";

/**
 * Shopify mandatory GDPR webhook: customers/redact
 *
 * Fired when a merchant requests deletion of a customer's data.
 * Since our app does NOT collect or store any customer PII
 * (no visitor tracking, no personal data, no cookies with PII),
 * we acknowledge the request and return 200.
 *
 * See: https://shopify.dev/docs/apps/webhooks/configuration/mandatory-webhooks
 */
export const action = async ({ request }) => {
  const { topic, shop } = await authenticate.webhook(request);
  console.log(`[Webhook] ${topic} received for ${shop} — no customer data to redact`);

  return new Response(null, { status: 200 });
};
