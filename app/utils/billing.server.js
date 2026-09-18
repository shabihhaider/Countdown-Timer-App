/**
 * Billing utilities — plan checking, feature gating, and limits.
 * Server-only (uses authenticate.admin billing helpers).
 */

import { PLAN_PRO } from "../shopify.server";

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
  } catch {
    // If billing check fails, default to free plan
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
    return {
      allowed: false,
      reason: `Your plan allows ${limits.maxActiveCampaigns} active ${limits.maxActiveCampaigns === 1 ? "campaign" : "campaigns"}. Upgrade to Pro for unlimited campaigns.`,
      isPro,
    };
  }

  return { allowed: true, isPro };
}
