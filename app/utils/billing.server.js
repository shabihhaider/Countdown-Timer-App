/**
 * Billing utilities — plan checking, feature gating, and limits.
 * Server-only (uses authenticate.admin billing helpers).
 */

import { PLAN_PRO } from "../shopify.server";

/** Free plan limits */
const FREE_LIMITS = {
  maxActiveCampaigns: 1,
  analyticsClicksEnabled: false,
  analyticsCtREnabled: false,
};

/** Pro plan limits */
const PRO_LIMITS = {
  maxActiveCampaigns: Infinity,
  analyticsClicksEnabled: true,
  analyticsCtREnabled: true,
};

/**
 * Check if the current shop has an active Pro subscription.
 *
 * @param {object} billing - The billing object from authenticate.admin()
 * @returns {Promise<{ isPro: boolean, limits: typeof FREE_LIMITS }>}
 */
export async function getPlanInfo(billing) {
  try {
    const { hasActivePayment } = await billing.check({
      plans: [PLAN_PRO],
      isTest: process.env.NODE_ENV !== "production",
    });

    return {
      isPro: hasActivePayment,
      plan: hasActivePayment ? "Pro" : "Free",
      limits: hasActivePayment ? PRO_LIMITS : FREE_LIMITS,
    };
  } catch {
    // If billing check fails, default to free plan
    return {
      isPro: false,
      plan: "Free",
      limits: FREE_LIMITS,
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
      reason: `Free plan allows ${limits.maxActiveCampaigns} active campaign. Upgrade to Pro for unlimited campaigns.`,
      isPro,
    };
  }

  return { allowed: true, isPro };
}
