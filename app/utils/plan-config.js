/**
 * Pro plan pricing — single source of truth, side-effect free so standalone
 * scripts (e.g. scripts/backfill-shops.js) can import it without initializing
 * the Shopify app. `interval` is the string value of BillingInterval.Every30Days.
 *
 * Webhook payloads carry no price, so subscription persistence reads it here.
 */
export const PLAN_PRO_CONFIG = {
  planName: "Pro",
  amount: 6.99,
  currencyCode: "USD",
  interval: "EVERY_30_DAYS",
  trialDays: 14,
};
