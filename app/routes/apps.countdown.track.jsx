import { json } from "@remix-run/node";
import db from "../db.server";
import { isRateLimited } from "../redis.server";

const SHOP_PARAM_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/;
const VALID_EVENTS = new Set(["impression", "click", "close", "copy"]);

// Track analytics events fired from the storefront countdown bar widget.
// Called via navigator.sendBeacon or fetch POST.
export const action = async ({ request }) => {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  // Per-IP rate limit (20 req/min for tracking — a single visitor shouldn't fire more)
  if (await isRateLimited(`track:${ip}`, 20, 60)) {
    // Return 200 so sendBeacon doesn't retry — tracking errors must not break the storefront
    return json({ success: true }, { status: 200 });
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { shop, event } = payload || {};

  if (!shop || !SHOP_PARAM_REGEX.test(shop)) {
    return json({ error: "Invalid shop" }, { status: 400 });
  }

  if (!event || !VALID_EVENTS.has(event)) {
    return json({ error: "Invalid event" }, { status: 400 });
  }

  try {
    // Find the active campaign for this shop
    const campaign = await db.campaign.findFirst({
      where: { shop, isActive: true },
      orderBy: { createdAt: "desc" },
    });

    if (!campaign) {
      // No active campaign — nothing to track
      return json({ success: true }, { status: 200 });
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
    return json({ success: true }, { status: 200 });
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
