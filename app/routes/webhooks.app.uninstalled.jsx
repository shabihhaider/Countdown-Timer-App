import { authenticate } from "../shopify.server";
import db from "../db.server";
import { logger } from "../utils/logger.server";
import { collectUninstallAggregates, recordUninstall } from "../utils/shop-lifecycle.server";

export const action = async ({ request }) => {
  const { shop, topic } = await authenticate.webhook(request);

  logger.info({ topic, shop }, "webhook.received");

  // Delete all shop data immediately on uninstall.
  // shop.redact fires 48h later as a GDPR guarantee, but cleaning up now
  // prevents stale-data collisions on reinstall.
  try {
    // Snapshot anonymous lifetime aggregates BEFORE deletion — they become the
    // app_uninstalled event payload (Shop/Subscription/AppEvent rows survive
    // as a soft-closed lifecycle record; shop/redact anonymizes them later).
    const aggregates = await collectUninstallAggregates(db, shop);

    await db.campaignAnalytics.deleteMany({
      where: { campaign: { shop } },
    });
    await db.campaign.deleteMany({ where: { shop } });
    await db.onboardingState.deleteMany({ where: { shop } });
    await db.session.deleteMany({ where: { shop } });
    await db.setting.deleteMany({ where: { shop } });

    await recordUninstall(db, shop, aggregates);
    logger.info({ topic, shop }, "webhook.uninstalled — all shop data deleted");
  } catch (error) {
    logger.error({ topic, shop, error: error.message }, "webhook.uninstalled — cleanup failed");
    // Non-200 makes Shopify retry — shop/redact fires 48h later as the final guarantee.
    // recordUninstall is idempotent, so a retry after partial success is safe.
    return new Response(null, { status: 500 });
  }

  return new Response();
};
