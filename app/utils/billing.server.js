/**
 * Billing utilities — plan checking, feature gating, and limits.
 * Server-only (uses authenticate.admin billing helpers).
 */

import { PLAN_PRO } from "../shopify.server";
import { logger } from "./logger.server";

/** Free plan limits */
const FREE_LIMITS = {
  maxActiveCampaigns: 1,
  analyticsClicksEnabled: false,
  analyticsCtrEnabled: false,
};

/** Pro plan limits */
const PRO_LIMITS = {
  maxActiveCampaigns: Infinity,
  analyticsClicksEnabled: true,
  analyticsCtrEnabled: true,
};

/** Pooled connections and the per-shop lock can both queue parallel writes. */
const LIMIT_TX_MAX_WAIT_MS = 5000;
const LIMIT_TX_TIMEOUT_MS = 10000;

const TEST_CHARGE_LOOKUP_ATTEMPTS = 2;

function limitReason(limits) {
  const noun = limits.maxActiveCampaigns === 1 ? "campaign" : "campaigns";
  return `Your plan allows ${limits.maxActiveCampaigns} active ${noun}. Upgrade to Pro for unlimited campaigns.`;
}

/**
 * Check if the current shop has an active Pro subscription.
 *
 * `source` reports how the answer was produced so callers can decide whether it
 * may be persisted (plan caching): only "billing_check" reflects real Shopify
 * state — "dev_override" and "check_failed" must never be written to the DB.
 *
 * @param {object} billing - The billing object from authenticate.admin()
 * @returns {Promise<{ isPro: boolean, plan: string, limits: typeof FREE_LIMITS, source: "billing_check" | "dev_override" | "check_failed" }>}
 */
export async function getPlanInfo(billing) {
  // ── Dev override: set FORCE_PRO_PLAN=true in .env to test Pro features while
  // the app is unpublished (unpublished apps can't use the Billing API at all).
  // Hard-gated to non-production so it can never grant free Pro to real merchants.
  if (process.env.NODE_ENV !== "production" && process.env.FORCE_PRO_PLAN === "true") {
    return {
      isPro: true,
      plan: "Pro",
      limits: PRO_LIMITS,
      source: "dev_override",
      subscription: null,
    };
  }

  try {
    // isTest: true means test subscriptions COUNT as valid (real ones always do).
    // Required so dev stores — including Shopify app reviewers — get Pro access
    // after approving a test charge.
    const { hasActivePayment, appSubscriptions } = await billing.check({
      plans: [PLAN_PRO],
      isTest: true,
    });

    // Expose the active subscription so the billing page can offer in-app
    // cancellation (App Store requirement: downgrade without reinstalling).
    const activeSubscription = appSubscriptions?.[0] ?? null;

    return {
      isPro: hasActivePayment,
      plan: hasActivePayment ? "Pro" : "Free",
      limits: hasActivePayment ? PRO_LIMITS : FREE_LIMITS,
      source: "billing_check",
      subscription: activeSubscription
        ? { id: activeSubscription.id, isTest: Boolean(activeSubscription.test) }
        : null,
    };
  } catch (error) {
    // The SDK throws a Response to redirect through re-authentication; swallowing
    // it would show a paying merchant the Free plan.
    if (error instanceof Response) throw error;

    // If billing check fails, default to free plan
    logger.warn({ error: error?.message }, "billing.check_failed");
    return {
      isPro: false,
      plan: "Free",
      limits: FREE_LIMITS,
      source: "check_failed",
      subscription: null,
    };
  }
}

/**
 * Check if the shop can create a new active campaign.
 *
 * @param {object} billing - The billing object from authenticate.admin()
 * @param {number} currentActiveCampaigns - Number of currently active campaigns
 * @returns {Promise<{ allowed: boolean, reason?: string, isPro: boolean }>}
 */
export async function canCreateCampaign(billing, currentActiveCampaigns) {
  const { isPro, limits } = await getPlanInfo(billing);

  if (currentActiveCampaigns >= limits.maxActiveCampaigns) {
    return { allowed: false, reason: limitReason(limits), isPro, limits };
  }

  return { allowed: true, isPro, limits };
}

/**
 * Perform a write that adds an active campaign without being able to pass the
 * plan limit. canCreateCampaign alone is check-then-write, so parallel requests
 * all pass it; the transaction lock makes them count one at a time. The lock
 * releases at commit, so it works through a transaction-mode connection pooler.
 *
 * @template T
 * @param {import("@prisma/client").PrismaClient} db
 * @param {string} shop
 * @param {typeof FREE_LIMITS} limits - from canCreateCampaign, resolved before the
 *   transaction because the billing check is a network call
 * @param {(tx: import("@prisma/client").Prisma.TransactionClient) => Promise<T>} write
 * @returns {Promise<{ allowed: true, result: T } | { allowed: false, reason: string }>}
 */
export async function writeWithinCampaignLimit(db, shop, limits, write) {
  if (limits.maxActiveCampaigns === Infinity) {
    return { allowed: true, result: await write(db) };
  }

  return db.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${shop}))`;
      const active = await tx.campaign.count({ where: { shop, isActive: true } });
      if (active >= limits.maxActiveCampaigns) {
        return { allowed: false, reason: limitReason(limits) };
      }
      return { allowed: true, result: await write(tx) };
    },
    { maxWait: LIMIT_TX_MAX_WAIT_MS, timeout: LIMIT_TX_TIMEOUT_MS }
  );
}

/**
 * Bring a Free shop back within its limit after a downgrade. Pauses, never
 * deletes: the merchant can resume them, and upgrading makes that possible again.
 *
 * Only call with a live billing_check result. Webhooks cannot decide this: a plan
 * change can deliver CANCELLED for the old charge before ACTIVE for the new one,
 * which would pause a paying merchant's campaigns.
 *
 * @param {import("@prisma/client").PrismaClient} db
 * @param {string} shop
 * @returns {Promise<number>} how many campaigns were paused
 */
export async function enforceFreeCampaignLimit(db, shop) {
  const active = await db.campaign.findMany({
    where: { shop, isActive: true },
    select: { id: true },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
  });
  const excessIds = active.slice(FREE_LIMITS.maxActiveCampaigns).map(({ id }) => id);
  if (excessIds.length === 0) return 0;

  await db.campaign.updateMany({
    where: { id: { in: excessIds }, shop },
    data: { isActive: false },
  });
  logger.info({ shop, paused: excessIds.length }, "billing.free_limit_enforced");
  return excessIds.length;
}

async function isPartnerDevelopmentShop(admin) {
  const response = await admin.graphql(
    `#graphql
    query shopPlan {
      shop { plan { partnerDevelopment } }
    }`
  );
  const data = await response.json();
  const partnerDevelopment = data?.data?.shop?.plan?.partnerDevelopment;
  if (typeof partnerDevelopment !== "boolean") {
    throw new Error("shop plan missing from Admin API response");
  }
  return partnerDevelopment;
}

/**
 * Whether a charge must be a test charge. Development stores can only approve
 * test charges, and Shopify reviewers test on dev stores.
 *
 * If the lookup keeps failing the answer stays false: Shopify rejects a real
 * charge on a dev store, which is visible and retryable, while a test charge on
 * a paying store would hand out Pro for free.
 *
 * @param {{ graphql: Function }} admin
 * @returns {Promise<boolean>}
 */
export async function isTestCharge(admin) {
  if (process.env.NODE_ENV !== "production") return true;

  let lastError;
  for (let attempt = 0; attempt < TEST_CHARGE_LOOKUP_ATTEMPTS; attempt++) {
    try {
      return await isPartnerDevelopmentShop(admin);
    } catch (error) {
      if (error instanceof Response) throw error;
      lastError = error;
    }
  }

  logger.error({ error: lastError?.message }, "billing.test_charge_lookup_failed");
  return false;
}
