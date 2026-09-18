/**
 * One-off, idempotent backfill: creates Shop lifecycle rows for every shop that
 * already has a session, and syncs current subscription state from Shopify.
 *
 * Usage: node scripts/backfill-shops.js
 *
 * Safe to re-run — ensureShopRecord/applySubscriptionUpdate are idempotent.
 */

import { PrismaClient } from "@prisma/client";
import { ensureShopRecord, applySubscriptionUpdate } from "../app/utils/shop-lifecycle.server.js";
import { PLAN_PRO_CONFIG } from "../app/utils/plan-config.js";

const API_VERSION = "2026-07";
const REQUEST_SPACING_MS = 500;

const db = new PrismaClient();

const ACTIVE_SUBSCRIPTIONS_QUERY = `
  query BackfillActiveSubscriptions {
    currentAppInstallation {
      activeSubscriptions {
        id
        name
        status
        test
        createdAt
        currentPeriodEnd
        trialDays
      }
    }
  }
`;

/** @param {number} ms */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Map a GraphQL AppSubscription to the webhook-payload shape
 * applySubscriptionUpdate expects.
 */
function toWebhookShape(sub) {
  const createdAt = sub.createdAt ? new Date(sub.createdAt) : null;
  const trialEndsOn =
    createdAt && sub.trialDays > 0
      ? new Date(createdAt.getTime() + sub.trialDays * 24 * 60 * 60 * 1000)
      : null;
  return {
    admin_graphql_api_id: sub.id,
    name: sub.name,
    status: sub.status,
    test: sub.test,
    updated_at: null, // GraphQL doesn't expose it; null skips the staleness guard
    trial_ends_on: trialEndsOn ? trialEndsOn.toISOString() : null,
    current_period_end: sub.currentPeriodEnd,
  };
}

async function fetchActiveSubscriptions(shop, accessToken) {
  const response = await fetch(`https://${shop}/admin/api/${API_VERSION}/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": accessToken,
    },
    body: JSON.stringify({ query: ACTIVE_SUBSCRIPTIONS_QUERY }),
  });

  if (response.status === 401 || response.status === 403) {
    return { ok: false, reason: `auth_${response.status}` };
  }
  if (!response.ok) {
    return { ok: false, reason: `http_${response.status}` };
  }

  const json = await response.json();
  if (json.errors?.length) {
    return { ok: false, reason: json.errors[0]?.message || "graphql_error" };
  }
  return { ok: true, subscriptions: json.data?.currentAppInstallation?.activeSubscriptions ?? [] };
}

async function main() {
  const sessions = await db.session.findMany({
    where: { isOnline: false },
    select: { shop: true, accessToken: true },
    distinct: ["shop"],
  });
  console.log(`Backfilling ${sessions.length} shop(s)…`);

  let subscriptionsSynced = 0;
  let skipped = 0;

  for (const { shop, accessToken } of sessions) {
    const record = await ensureShopRecord(db, shop);

    // Best-effort install date: OnboardingState.createdAt (first dashboard load)
    // is the earliest signal we have for pre-existing installs.
    const onboarding = await db.onboardingState.findUnique({ where: { shop } });
    if (onboarding && onboarding.createdAt < record.firstInstalledAt) {
      await db.shop.update({
        where: { id: record.id },
        data: {
          firstInstalledAt: onboarding.createdAt,
          installedAt: onboarding.createdAt,
        },
      });
    }

    if (!accessToken) {
      skipped += 1;
      continue;
    }

    const result = await fetchActiveSubscriptions(shop, accessToken);
    if (!result.ok) {
      console.warn(`  ${shop}: subscription fetch skipped (${result.reason})`);
      skipped += 1;
    } else {
      for (const sub of result.subscriptions) {
        await applySubscriptionUpdate(db, shop, toWebhookShape(sub), PLAN_PRO_CONFIG, null);
        subscriptionsSynced += 1;
      }
    }

    await sleep(REQUEST_SPACING_MS);
  }

  console.log(
    `Done. Shops ensured: ${sessions.length}, subscriptions synced: ${subscriptionsSynced}, skipped: ${skipped}.`
  );
}

main()
  .catch((error) => {
    console.error("Backfill failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
