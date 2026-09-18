import "@shopify/shopify-app-remix/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  BillingInterval,
  shopifyApp,
} from "@shopify/shopify-app-remix/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import prisma from "./db.server";
import { env } from "./env.server";

import { PLAN_PRO_CONFIG } from "./utils/plan-config";

// Billing plan definitions
export const PLAN_FREE = "Free";
export const PLAN_PRO = PLAN_PRO_CONFIG.planName;

const shopify = shopifyApp({
  apiKey: env.SHOPIFY_API_KEY,
  apiSecretKey: env.SHOPIFY_API_SECRET || "",
  apiVersion: ApiVersion.July26,
  scopes: env.SCOPES?.split(","),
  appUrl: env.SHOPIFY_APP_URL || "",
  authPathPrefix: "/auth",
  sessionStorage: new PrismaSessionStorage(prisma),
  distribution: AppDistribution.AppStore,
  hooks: {
    afterAuth: async ({ session }) => {
      // Lifecycle tracking must never break auth — log and continue on failure.
      try {
        const { ensureShopRecord } = await import("./utils/shop-lifecycle.server");
        await ensureShopRecord(prisma, session.shop);
      } catch (error) {
        const { logger } = await import("./utils/logger.server");
        logger.error({ shop: session.shop, error: error.message }, "lifecycle.afterAuth_failed");
      }
    },
  },
  billing: {
    [PLAN_PRO]: {
      amount: PLAN_PRO_CONFIG.amount,
      currencyCode: PLAN_PRO_CONFIG.currencyCode,
      // Same string value as PLAN_PRO_CONFIG.interval — the SDK enum keeps type semantics
      interval: BillingInterval.Every30Days,
      trialDays: PLAN_PRO_CONFIG.trialDays,
    },
  },
  ...(env.SHOP_CUSTOM_DOMAIN ? { customShopDomains: [env.SHOP_CUSTOM_DOMAIN] } : {}),
});

export default shopify;
export const apiVersion = ApiVersion.July26;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const authenticate = shopify.authenticate;
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
export const sessionStorage = shopify.sessionStorage;
