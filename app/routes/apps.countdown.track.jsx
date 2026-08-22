import { json } from "@remix-run/node";
import db from "../db.server";
import { isRateLimited } from "../redis.server";

const SHOP_PARAM_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/;
const VALID_EVENTS = new Set(["impression", "click", "close"]);

// Track analytics events fired from the storefront countdown bar widget.
// Called via navigator.sendBeacon or fetch POST.
export const action = async ({ request }) => {
  const CORS = { "Access-Control-Allow-Origin": "*" };

  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405, headers: CORS });
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  // Per-IP rate limit (20 req/min for tracking — a single visitor shouldn't fire more)
  if (await isRateLimited(`track:${ip}`, 20, 60)) {
    // Return 200 so sendBeacon doesn't retry — tracking errors must not break the storefront
    return json({ success: true }, { status: 200, headers: CORS });
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, { status: 400, headers: CORS });
  }

  const { shop, event, campaignId, type } = payload || {};

  if (!shop || !SHOP_PARAM_REGEX.test(shop)) {
    return json({ error: "Invalid shop" }, { status: 400, headers: CORS });
  }

  if (!event || !VALID_EVENTS.has(event)) {
    return json({ error: "Invalid event" }, { status: 400, headers: CORS });
  }

  // Per-shop rate limit — the primary abuse ceiling. The per-IP limit above can be
  // evaded by spoofing X-Forwarded-For on platforms that don't overwrite it, so a
  // per-shop cap bounds analytics pollution and DB write volume regardless of source.
  if (await isRateLimited(`track_shop:${shop}`, 300, 60)) {
    // 200 so sendBeacon doesn't retry — tracking must never break the storefront
    return json({ success: true }, { status: 200, headers: CORS });
  }

  try {
    let campaign;

    if (campaignId) {
      campaign = await db.campaign.findFirst({
        where: { id: campaignId, shop, isActive: true },
      });
    }

    if (!campaign) {
      const typeFilter = type === "bar" || type === "product_timer" ? { type } : {};
      campaign = await db.campaign.findFirst({
        where: { shop, isActive: true, ...typeFilter },
        orderBy: { createdAt: "desc" },
      });
    }

    if (!campaign) {
      // No active campaign — nothing to track
      return json({ success: true }, { status: 200, headers: CORS });
    }

    // UTC day bucket for daily aggregation
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const increment = {
      impressions: event === "impression" ? 1 : 0,
      clicks: event === "click" ? 1 : 0,
      closes: event === "close" ? 1 : 0,
    };

    await db.campaignAnalytics.upsert({
      where: {
        campaignId_date: { campaignId: campaign.id, date: today },
      },
      update: {
        impressions: { increment: increment.impressions },
        clicks: { increment: increment.clicks },
        closes: { increment: increment.closes },
        updatedAt: new Date(),
      },
      create: {
        campaignId: campaign.id,
        date: today,
        impressions: increment.impressions,
        clicks: increment.clicks,
        closes: increment.closes,
      },
    });

    return json(
      { success: true },
      {
        headers: { "Access-Control-Allow-Origin": "*" },
      }
    );
  } catch {
    // Tracking errors must never break the storefront — return 200 to avoid
    // the storefront JS retrying endlessly
    return json({ success: true }, { status: 200, headers: CORS });
  }
};

// Handle CORS preflight from storefront
export const loader = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
};
