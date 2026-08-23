import { json } from "@remix-run/node";
import db from "../db.server";
import { isRateLimited } from "../redis.server";
import { logger } from "../utils/logger.server";
import { findMatchingCampaign } from "../utils/campaign-matching.server";

const SHOP_PARAM_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Cache-Control": "public, max-age=10, stale-while-revalidate=20",
};

function campaignToSettings(campaign) {
  return {
    id: campaign.id,
    barMessage: campaign.barMessage,
    buttonText: campaign.buttonText,
    buttonUrl: campaign.buttonUrl,
    discountCode: campaign.discountCode,
    timerType: campaign.timerType,
    endDate: campaign.endDate?.toISOString() ?? null,
    dailyResetTime: campaign.dailyResetTime,
    evergreenMinutes: campaign.evergreenMinutes,
    timezone: campaign.timezone,
    barIcon: campaign.barIcon,
    fontFamily: campaign.fontFamily,
    animationStyle: campaign.animationStyle,
    backgroundStyle: campaign.backgroundStyle,
    barColor: campaign.backgroundColor,
    pageTargeting: campaign.pageTargeting,
    textColor: campaign.textColor,
    buttonTextColor: campaign.buttonTextColor,
    buttonBgColor: campaign.buttonBackgroundColor,
    barPosition: campaign.position,
    endAction: campaign.endAction,
    customEndMessage: campaign.customEndMessage,
    targetType: campaign.targetType,
    productStyle: campaign.productStyle,
    accentColor: campaign.accentColor,
    labelText: campaign.labelText,
  };
}

export const loader = async ({ request }) => {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  if (await isRateLimited(`ip:${ip}`)) {
    return json(
      { success: false, error: "Too many requests" },
      {
        status: 429,
        headers: { ...CORS_HEADERS, "Retry-After": "60", "Cache-Control": "no-store" },
      }
    );
  }

  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");

  if (!shop) {
    return json(
      { success: false, error: "Shop parameter is required" },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  if (!SHOP_PARAM_REGEX.test(shop)) {
    return json(
      { success: false, error: "Invalid shop parameter" },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  if (await isRateLimited(`shop:${shop}`, 120, 60)) {
    return json(
      { success: false, error: "Too many requests" },
      {
        status: 429,
        headers: { ...CORS_HEADERS, "Retry-After": "60", "Cache-Control": "no-store" },
      }
    );
  }

  const campaignType = url.searchParams.get("type") || "bar";
  const productHandle = url.searchParams.get("product") || null;

  // CSV lists from the theme block (bounded to keep the public endpoint abuse-safe).
  // Legacy "collection" single-value param is folded in for older cached markup.
  const parseCsvParam = (name, max) =>
    (url.searchParams.get(name) || "")
      .split(",")
      .map((v) => v.trim().toLowerCase())
      .filter(Boolean)
      .slice(0, max);
  const collectionHandles = [
    ...parseCsvParam("collections", 50),
    ...parseCsvParam("collection", 1),
  ];
  const productTags = parseCsvParam("tags", 100);
  try {
    const campaigns = await db.campaign.findMany({
      where: { shop, isActive: true, type: campaignType },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    });

    if (!campaigns.length) {
      return json(
        { success: false, message: "No active campaign found" },
        { headers: CORS_HEADERS }
      );
    }

    const matched = findMatchingCampaign(campaigns, {
      productHandle,
      collectionHandles,
      productTags,
    });

    if (!matched) {
      return json(
        { success: false, message: "No active campaign found" },
        { headers: CORS_HEADERS }
      );
    }

    const settings = campaignToSettings(matched);
    return json({ success: true, settings }, { headers: CORS_HEADERS });
  } catch (error) {
    logger.error({ error: error.message, shop }, "storefront.settings — load failed");
    return json(
      { success: false, error: "Failed to load settings" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
};
