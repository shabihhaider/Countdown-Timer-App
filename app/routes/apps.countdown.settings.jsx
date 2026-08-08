import { json } from "@remix-run/node";
import db from "../db.server";
import { isRateLimited } from "../redis.server";

const SHOP_PARAM_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Cache-Control": "public, max-age=60, stale-while-revalidate=30",
};

export const loader = async ({ request }) => {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  // Per-IP rate limit (60 req/min)
  if (await isRateLimited(`ip:${ip}`)) {
    return json(
      { success: false, error: "Too many requests" },
      { status: 429, headers: { "Retry-After": "60", "Cache-Control": "no-store" } }
    );
  }

  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");

  if (!shop) {
    return json({ success: false, error: "Shop parameter is required" }, { status: 400 });
  }

  if (!SHOP_PARAM_REGEX.test(shop)) {
    return json({ success: false, error: "Invalid shop parameter" }, { status: 400 });
  }

  // Per-shop rate limit (120 req/min — prevents shop enumeration)
  if (await isRateLimited(`shop:${shop}`, 120, 60)) {
    return json(
      { success: false, error: "Too many requests" },
      { status: 429, headers: { "Retry-After": "60", "Cache-Control": "no-store" } }
    );
  }

  try {
    // 1. Try new Campaign model first (new installs)
    const campaign = await db.campaign.findFirst({
      where: { shop, isActive: true },
      orderBy: { createdAt: "desc" },
    });

    if (campaign) {
      // Only serve campaigns that have started (or have no start date)
      const now = new Date();
      if (campaign.startDate && campaign.startDate > now) {
        return json(
          { success: false, message: "No active campaign found" },
          { headers: CORS_HEADERS }
        );
      }

      const settings = {
        barMessage: campaign.barMessage,
        buttonText: campaign.buttonText,
        buttonUrl: campaign.buttonUrl,
        timerType: campaign.timerType,
        endDate: campaign.endDate?.toISOString() ?? null,
        dailyResetTime: campaign.dailyResetTime,
        evergreenMinutes: campaign.evergreenMinutes,
        timezone: campaign.timezone,
        barColor: campaign.backgroundColor,
        textColor: campaign.textColor,
        buttonTextColor: campaign.buttonTextColor,
        buttonBgColor: campaign.buttonBackgroundColor,
        barPosition: campaign.position,
        endAction: campaign.endAction,
        customEndMessage: campaign.customEndMessage,
      };
      return json({ success: true, settings }, { headers: CORS_HEADERS });
    }

    return json({ success: false, message: "No active campaign found" }, { headers: CORS_HEADERS });
  } catch {
    return json(
      { success: false, error: "Failed to load settings" },
      { status: 500, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }
};
