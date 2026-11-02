/**
 * Shop lifecycle persistence — install/uninstall tracking, plan caching,
 * subscription sync, and GDPR redaction.
 *
 * These records deliberately SURVIVE uninstall (soft-close) and are anonymized
 * — never deleted — on shop/redact, so internal tooling keeps churn/revenue
 * history without retaining personal data.
 */

// Explicit .js extension so plain-Node scripts (scripts/backfill-shops.js) can
// import this module without a bundler; Vite resolves it identically.
import { randomUUID } from "node:crypto";
import { logger } from "./logger.server.js";

/** Shop.status values */
export const SHOP_STATUS = {
  ACTIVE: "active",
  UNINSTALLED: "uninstalled",
  REDACTED: "redacted",
};

/** AppEvent.type values */
export const APP_EVENT = {
  INSTALLED: "app_installed",
  REINSTALLED: "app_reinstalled",
  /** OAuth completed for a shop already active: possibly a reinstall we cannot see yet */
  AUTHORIZED: "app_authorized",
  UNINSTALLED: "app_uninstalled",
  SUBSCRIPTION_UPDATED: "subscription_updated",
  PLAN_CHANGED: "plan_changed",
  SHOP_REDACTED: "shop_redacted",
};

/** Subscription statuses that count as an active paid plan */
const ACTIVE_SUBSCRIPTION_STATUS = "ACTIVE";

/** Statuses of a charge the merchant has not decided on yet: not a cancellation */
const UNDECIDED_SUBSCRIPTION_STATUSES = new Set(["PENDING", "ACCEPTED"]);

/**
 * Order of a subscription's states, for two events carrying the same timestamp.
 * Terminal statuses rank highest so a late ACTIVE cannot undo a cancellation.
 */
const SUBSCRIPTION_STATUS_RANK = new Map([
  ["PENDING", 0],
  ["ACCEPTED", 0],
  ["ACTIVE", 1],
  ["FROZEN", 2],
]);
const TERMINAL_STATUS_RANK = 3;

const subscriptionStatusRank = (status) =>
  SUBSCRIPTION_STATUS_RANK.get(status) ?? TERMINAL_STATUS_RANK;

/**
 * Whether an update must be dropped as out of order. updated_at has one-second
 * resolution, so a real transition can tie with the state already held.
 *
 * @param {{ status: string, shopifyUpdatedAt: Date | null } | null} existing
 * @param {string} status
 * @param {Date | null} shopifyUpdatedAt
 * @returns {boolean}
 */
function isStaleSubscriptionUpdate(existing, status, shopifyUpdatedAt) {
  if (!existing?.shopifyUpdatedAt || !shopifyUpdatedAt) return false;
  const heldMs = existing.shopifyUpdatedAt.getTime();
  const updateMs = shopifyUpdatedAt.getTime();
  if (updateMs !== heldMs) return updateMs < heldMs;
  return subscriptionStatusRank(status) <= subscriptionStatusRank(existing.status);
}

/** Prisma unique-constraint violation code (used for webhookId dedupe) */
const PRISMA_UNIQUE_VIOLATION = "P2002";

/**
 * Ensure a Shop row exists for this domain, handling fresh installs and
 * reinstalls. Idempotent — safe to call on every auth/app load.
 *
 * @param {import("@prisma/client").PrismaClient} db
 * @param {string} shopDomain
 * @returns {Promise<import("@prisma/client").Shop>}
 */
export async function ensureShopRecord(db, shopDomain) {
  const existing = await db.shop.findUnique({ where: { domain: shopDomain } });

  if (!existing) {
    const shop = await db.shop.create({
      data: { domain: shopDomain, status: SHOP_STATUS.ACTIVE },
    });
    await db.appEvent.create({
      data: { shopId: shop.id, shopDomain, type: APP_EVENT.INSTALLED },
    });
    logger.info({ shop: shopDomain }, "lifecycle.installed");
    return shop;
  }

  if (existing.status === SHOP_STATUS.UNINSTALLED) {
    const shop = await db.shop.update({
      where: { id: existing.id },
      data: {
        status: SHOP_STATUS.ACTIVE,
        installedAt: new Date(),
        uninstalledAt: null,
        installCount: { increment: 1 },
      },
    });
    await db.appEvent.create({
      data: { shopId: shop.id, shopDomain, type: APP_EVENT.REINSTALLED },
    });
    logger.info({ shop: shopDomain }, "lifecycle.reinstalled");
    return shop;
  }

  return existing;
}

/**
 * ensureShopRecord for a completed OAuth. When the shop is already active this may
 * be a reinstall whose app/uninstalled has not been processed yet, so the moment is
 * recorded for isStaleUninstallDelivery. An event, not installedAt: a routine
 * re-authorization is not an install, and reporting reads installedAt.
 *
 * @param {import("@prisma/client").PrismaClient} db
 * @param {string} shopDomain
 * @returns {Promise<import("@prisma/client").Shop>}
 */
export async function recordAuthorization(db, shopDomain) {
  const existing = await db.shop.findUnique({ where: { domain: shopDomain } });
  const shop = await ensureShopRecord(db, shopDomain);
  if (existing?.status === SHOP_STATUS.ACTIVE) {
    await db.appEvent.create({
      data: { shopId: shop.id, shopDomain, type: APP_EVENT.AUTHORIZED },
    });
  }
  return shop;
}

/**
 * Update the cached plan on the Shop row, recording a plan_changed event when
 * the value actually changes. Callers must only pass results from a REAL plan
 * source — never the FORCE_PRO_PLAN dev override or a failed billing check.
 *
 * @param {import("@prisma/client").PrismaClient} db
 * @param {string} shopDomain
 * @param {string} plan - "Free" | "Pro"
 * @param {"webhook" | "billing_check" | "backfill"} source
 * @returns {Promise<void>}
 */
export async function syncPlanCache(db, shopDomain, plan, source) {
  const shop = await db.shop.findUnique({ where: { domain: shopDomain } });
  if (!shop || shop.plan === plan) return;

  await db.shop.update({
    where: { id: shop.id },
    data: { plan, planSource: source, planUpdatedAt: new Date() },
  });
  await db.appEvent.create({
    data: {
      shopId: shop.id,
      shopDomain,
      type: APP_EVENT.PLAN_CHANGED,
      payload: { fromPlan: shop.plan, toPlan: plan, source },
    },
  });
  logger.info(
    { shop: shopDomain, fromPlan: shop.plan, toPlan: plan, source },
    "lifecycle.plan_changed"
  );
}

/**
 * Whether a subscription payload can ever be applied. A signed payload that
 * fails this is permanent, so the webhook acknowledges it instead of retrying.
 *
 * @param {object | null | undefined} appSubscription - payload.app_subscription
 * @returns {boolean}
 */
export function isApplicableSubscriptionPayload(appSubscription) {
  if (!appSubscription) return false;
  if (!(appSubscription.admin_graphql_api_id || appSubscription.id)) return false;
  if (!appSubscription.status) return false;
  const updatedAt = appSubscription.updated_at;
  return !updatedAt || !Number.isNaN(new Date(updatedAt).getTime());
}

/**
 * Record a subscription event, using the webhookId unique index to spot redelivery.
 *
 * @param {import("@prisma/client").PrismaClient} db
 * @param {object} event - AppEvent create data
 * @returns {Promise<boolean>} false when this webhook was already recorded
 */
async function recordSubscriptionEvent(db, event) {
  try {
    await db.appEvent.create({ data: event });
    return true;
  } catch (error) {
    if (error?.code === PRISMA_UNIQUE_VIOLATION) {
      // Duplicate webhook delivery — subscription state is idempotent, so just stop.
      logger.info(
        { shop: event.shopDomain, webhookId: event.webhookId },
        "lifecycle.webhook_duplicate_ignored"
      );
      return false;
    }
    throw error;
  }
}

/**
 * Plan a shop is on after a subscription change. Merchants can hold several
 * subscription rows, so an event for one of them cannot decide the plan alone.
 *
 * @param {import("@prisma/client").PrismaClient} db
 * @param {number} shopId
 * @param {string | null} activatedPlanName - plan name when this event activated it
 * @returns {Promise<string>}
 */
async function resolveCachedPlan(db, shopId, activatedPlanName) {
  if (activatedPlanName) return activatedPlanName;
  const stillActive = await db.subscription.findFirst({
    where: { shopId, status: ACTIVE_SUBSCRIPTION_STATUS },
    orderBy: { shopifyUpdatedAt: "desc" },
  });
  return stillActive?.planName ?? "Free";
}

/**
 * Apply an app_subscriptions/update webhook payload (or backfill equivalent).
 * Idempotent on webhookId; drops stale out-of-order updates via updated_at.
 *
 * Never installs or reinstalls a shop: only a real auth/app load may do that.
 * Webhooks arrive late and unordered, so a delivery after uninstall must not
 * reactivate the shop, and one after shop/redact (when the domain no longer
 * matches any row) must not write the domain back. The next app load recovers
 * the plan through the billing check if a shop row is missing here.
 *
 * @param {import("@prisma/client").PrismaClient} db
 * @param {string} shopDomain
 * @param {object} appSubscription - payload.app_subscription from Shopify
 * @param {object} planConfig - { amount, currencyCode, interval, trialDays } from code-defined billing config
 * @param {string | null} webhookId - X-Shopify-Webhook-Id header (null for backfill)
 * @returns {Promise<void>}
 */
export async function applySubscriptionUpdate(
  db,
  shopDomain,
  appSubscription,
  planConfig,
  webhookId
) {
  const shop = await db.shop.findUnique({ where: { domain: shopDomain } });
  if (!shop) {
    // Domain deliberately omitted: this may be a shop that was just redacted.
    logger.warn({ webhookId }, "lifecycle.subscription_unknown_shop_skipped");
    return;
  }

  const gid = appSubscription.admin_graphql_api_id || appSubscription.id;
  const status = String(appSubscription.status || "").toUpperCase();
  const isShopUninstalled = shop.status === SHOP_STATUS.UNINSTALLED;

  // Uninstalling cancels the charge, so ACTIVE here can only be a stale delivery.
  if (isShopUninstalled && status === ACTIVE_SUBSCRIPTION_STATUS) {
    logger.info({ shop: shopDomain, gid, status }, "lifecycle.subscription_uninstalled_skipped");
    return;
  }

  const shopifyUpdatedAt = appSubscription.updated_at ? new Date(appSubscription.updated_at) : null;

  const existing = await db.subscription.findUnique({
    where: { shopifySubscriptionId: gid },
  });

  // Out-of-order guard: never apply an update older than what we already hold.
  if (isStaleSubscriptionUpdate(existing, status, shopifyUpdatedAt)) {
    logger.info({ shop: shopDomain, gid, status }, "lifecycle.subscription_stale_skipped");
    return;
  }

  const isActive = status === ACTIVE_SUBSCRIPTION_STATUS;
  const becameActive = isActive && existing?.status !== ACTIVE_SUBSCRIPTION_STATUS;
  const becameInactive =
    !isActive &&
    !UNDECIDED_SUBSCRIPTION_STATUSES.has(status) &&
    (!existing || existing.status === ACTIVE_SUBSCRIPTION_STATUS);

  const data = {
    shopId: shop.id,
    planName: appSubscription.name || planConfig.planName,
    status,
    price: planConfig.amount,
    currencyCode: planConfig.currencyCode,
    interval: planConfig.interval,
    trialDays: planConfig.trialDays,
    trialEndsAt: appSubscription.trial_ends_on ? new Date(appSubscription.trial_ends_on) : null,
    currentPeriodEnd: appSubscription.current_period_end
      ? new Date(appSubscription.current_period_end)
      : null,
    isTest: Boolean(appSubscription.test),
    shopifyUpdatedAt,
    ...(becameActive ? { activatedAt: new Date(), cancelledAt: null } : {}),
    ...(becameInactive ? { cancelledAt: new Date() } : {}),
  };

  await db.subscription.upsert({
    where: { shopifySubscriptionId: gid },
    create: { ...data, shopifySubscriptionId: gid },
    update: data,
  });

  const isFirstDelivery = await recordSubscriptionEvent(db, {
    shopId: shop.id,
    shopDomain,
    type: APP_EVENT.SUBSCRIPTION_UPDATED,
    payload: { gid, status, planName: data.planName, isTest: data.isTest },
    webhookId,
  });
  if (!isFirstDelivery || isShopUninstalled) return;

  const plan = await resolveCachedPlan(db, shop.id, isActive ? data.planName : null);
  await syncPlanCache(db, shopDomain, plan, "webhook");
}

/** How often the app-load safety net re-syncs a shop (webhooks cover real time) */
const LIFECYCLE_SYNC_INTERVAL_MS = 6 * 60 * 60 * 1000;

/**
 * App-load safety net: ensures the Shop row exists (token-exchange auth can
 * bypass afterAuth) and passively backfills the plan cache. Throttled to one
 * sync per shop per 6h via the row's updatedAt — webhooks remain the
 * real-time source of truth.
 *
 * @param {import("@prisma/client").PrismaClient} db
 * @param {string} shopDomain
 * @param {() => Promise<{ plan: string, source: string }>} getPlan - lazy plan lookup (only called when a sync runs)
 * @returns {Promise<void>}
 */
export async function maybeSyncShopLifecycle(db, shopDomain, getPlan) {
  const shop = await db.shop.findUnique({ where: { domain: shopDomain } });
  const isFresh =
    shop &&
    shop.status === SHOP_STATUS.ACTIVE &&
    Date.now() - shop.updatedAt.getTime() < LIFECYCLE_SYNC_INTERVAL_MS;
  if (isFresh) return;

  const ensured = await ensureShopRecord(db, shopDomain);
  const planInfo = await getPlan();
  if (planInfo.source === "billing_check") {
    await syncPlanCache(db, shopDomain, planInfo.plan, "billing_check");
  }
  // Touch updatedAt so the 6h throttle window restarts even when nothing changed.
  await db.shop.update({ where: { id: ensured.id }, data: { updatedAt: new Date() } });
}

/**
 * Snapshot anonymous lifetime aggregates for a shop BEFORE its rows are deleted
 * on uninstall. Counts only — safe to retain after GDPR redaction.
 *
 * @param {import("@prisma/client").PrismaClient} db
 * @param {string} shopDomain
 * @returns {Promise<{ campaignCount: number, totalImpressions: number, totalClicks: number, totalCloses: number, hadCompletedOnboarding: boolean }>}
 */
export async function collectUninstallAggregates(db, shopDomain) {
  const [campaignCount, analytics, onboarding] = await Promise.all([
    db.campaign.count({ where: { shop: shopDomain } }),
    db.campaignAnalytics.aggregate({
      where: { campaign: { shop: shopDomain } },
      _sum: { impressions: true, clicks: true, closes: true },
    }),
    db.onboardingState.findUnique({ where: { shop: shopDomain } }),
  ]);

  return {
    campaignCount,
    totalImpressions: analytics._sum.impressions ?? 0,
    totalClicks: analytics._sum.clicks ?? 0,
    totalCloses: analytics._sum.closes ?? 0,
    hadCompletedOnboarding: Boolean(onboarding?.completedAt),
  };
}

/**
 * Whether an app/uninstalled delivery belongs to an install older than the
 * current one. Shopify redelivers and does not guarantee order, so a late copy
 * must not wipe a merchant who has since reinstalled.
 *
 * A reinstall before the uninstall is processed leaves the row active with the
 * old installedAt, so the latest authorization is compared as well.
 *
 * @param {{ status: string, installedAt: Date } | null} shop
 * @param {string | null} triggeredAt - X-Shopify-Triggered-At header
 * @param {Date | null} [lastAuthorizedAt] - latest APP_EVENT.AUTHORIZED time
 * @returns {boolean}
 */
export function isStaleUninstallDelivery(shop, triggeredAt, lastAuthorizedAt = null) {
  if (!shop || shop.status !== SHOP_STATUS.ACTIVE || !triggeredAt) return false;
  const triggeredMs = new Date(triggeredAt).getTime();
  if (Number.isNaN(triggeredMs)) return false;
  const latestAuthMs = Math.max(shop.installedAt.getTime(), lastAuthorizedAt?.getTime() ?? 0);
  return triggeredMs < latestAuthMs;
}

/**
 * @param {import("@prisma/client").PrismaClient} db
 * @param {number} shopId
 * @returns {Promise<Date | null>}
 */
export async function findLastAuthorizedAt(db, shopId) {
  const event = await db.appEvent.findFirst({
    where: { shopId, type: APP_EVENT.AUTHORIZED },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  return event?.createdAt ?? null;
}

/**
 * Soft-close the Shop row on app/uninstalled. Idempotent — a webhook retry
 * against an already-uninstalled shop is a no-op. The conditional update makes
 * parallel duplicates safe: only the delivery that wins records the event.
 *
 * @param {import("@prisma/client").PrismaClient} db
 * @param {string} shopDomain
 * @param {object} aggregates - from collectUninstallAggregates()
 * @returns {Promise<void>}
 */
export async function recordUninstall(db, shopDomain, aggregates) {
  const shop = await db.shop.findUnique({ where: { domain: shopDomain } });
  if (!shop || shop.status === SHOP_STATUS.UNINSTALLED) return;

  const { count } = await db.shop.updateMany({
    where: { id: shop.id, status: { not: SHOP_STATUS.UNINSTALLED } },
    data: {
      status: SHOP_STATUS.UNINSTALLED,
      uninstalledAt: new Date(),
      plan: "Free",
      planSource: "webhook",
      planUpdatedAt: new Date(),
    },
  });
  if (count === 0) return;

  await db.subscription.updateMany({
    where: { shopId: shop.id, status: ACTIVE_SUBSCRIPTION_STATUS },
    data: { status: "CANCELLED", cancelledAt: new Date() },
  });
  await db.appEvent.create({
    data: {
      shopId: shop.id,
      shopDomain,
      type: APP_EVENT.UNINSTALLED,
      payload: aggregates,
    },
  });
  logger.info({ shop: shopDomain }, "lifecycle.uninstalled");
}

/**
 * GDPR shop/redact: anonymize the Shop row and its event trail. Uses a random
 * token (not a hash — myshopify domains are enumerable, so hashing is only
 * pseudonymization). No mapping to the original domain is kept anywhere.
 *
 * @param {import("@prisma/client").PrismaClient} db
 * @param {string} shopDomain
 * @returns {Promise<void>}
 */
export async function redactShop(db, shopDomain) {
  const shop = await db.shop.findUnique({ where: { domain: shopDomain } });
  if (!shop) return;

  const token = `redacted-${randomUUID()}`;

  // All or nothing: a redelivery finds the shop only by its real domain, and the
  // portal erases only on the event written last. A partial run would return
  // early on redelivery and the portal would never hear about the shop.
  await db.$transaction(async (tx) => {
    const subscriptions = await tx.subscription.findMany({
      where: { shopId: shop.id },
      select: { id: true },
    });
    for (const subscription of subscriptions) {
      await tx.subscription.update({
        where: { id: subscription.id },
        data: { shopifySubscriptionId: `redacted-${randomUUID()}` },
      });
    }

    await tx.shop.update({
      where: { id: shop.id },
      data: {
        domain: token,
        name: null,
        email: null,
        status: SHOP_STATUS.REDACTED,
        redactedAt: new Date(),
      },
    });
    // Scrub the denormalized domain on the full event trail. Payloads hold only
    // anonymous counts/plan names, so they are safe to keep.
    await tx.appEvent.updateMany({
      where: { shopId: shop.id },
      data: { shopDomain: token, webhookId: null },
    });
    await tx.appEvent.create({
      data: { shopId: shop.id, shopDomain: token, type: APP_EVENT.SHOP_REDACTED },
    });
  });
  logger.info({ shopId: shop.id }, "lifecycle.redacted");
}
