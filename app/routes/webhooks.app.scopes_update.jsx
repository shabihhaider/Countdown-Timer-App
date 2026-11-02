import { authenticateWebhook } from "../utils/webhook-auth.server";
import db from "../db.server";
import { logger } from "../utils/logger.server";

export const action = async ({ request }) => {
  const { payload, session, topic, shop } = await authenticateWebhook(request);

  logger.info({ topic, shop }, "webhook.received");
  const current = payload?.current;
  if (!current) {
    // Malformed payload — acknowledge so Shopify doesn't retry something we can never process.
    logger.warn({ topic, shop }, "webhook.scopes_update — missing current scopes");
    return new Response();
  }

  if (session) {
    await db.session.update({
      where: {
        id: session.id,
      },
      data: {
        scope: current.toString(),
      },
    });
  }

  return new Response();
};
