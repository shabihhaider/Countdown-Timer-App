import { json } from "@remix-run/node";
import db from "../db.server";
import { deleteCache, isRateLimited, readCache, writeCache } from "../redis.server";
import { logger } from "./logger.server";
import { getClientIp } from "./client-ip.server";
import { findMatchingCampaign } from "./campaign-matching.server";

const SHOP_PARAM_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/;
const MAX_SHOP_LENGTH = 100;
const CAMPAIGN_TYPES = new Set(["bar", "product_timer"]);

/** How long a shop's campaign list is reused before the database is read again */
export const FRESH_CACHE_MS = 10_000;
/** How long the last good list stays available to serve through a database outage */
const LAST_GOOD_TTL_SECONDS = 60 * 60;

const RATE_LIMIT_RETRY_SECONDS = 60;
const OUTAGE_RETRY_SECONDS = 30;

// Cross-origin scripts can only read Retry-After when it is exposed.
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Expose-Headers": "Retry-After",
};

// Vercel's CDN caches on s-maxage and ignores max-age, which only reaches the
// browser. The cache key includes the query string, so this also separates shops.
const CACHEABLE_HEADERS = {
  ...CORS,
  "Cache-Control": "public, max-age=10, s-maxage=30, stale-while-revalidate=60, stale-if-error=600",
};
const UNCACHED_HEADERS = { ...CORS, "Cache-Control": "no-store" };

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

/** Cached rows arrive as JSON; the matcher and serializer need real Dates. */
function reviveCampaign(campaign) {
  return {
    ...campaign,
    startDate: campaign.startDate ? new Date(campaign.startDate) : null,
    endDate: campaign.endDate ? new Date(campaign.endDate) : null,
  };
}

function campaignCacheKey(shop, type) {
  return `campaigns:${shop}:${type}`;
}

/** For shop/redact: cached campaigns hold merchant text and discount codes. */
export async function purgeCampaignCache(shop) {
  await Promise.all([...CAMPAIGN_TYPES].map((type) => deleteCache(campaignCacheKey(shop, type))));
}

/**
 * Active campaigns for a shop, read at most once per FRESH_CACHE_MS. The list is
 * cached rather than the response, so product and tag params cannot force a read.
 * This is what protects the database: there is deliberately no per-shop request
 * limit, because any such limit lets anyone switch off a shop's timer.
 */
async function getActiveCampaigns(shop, type) {
  const key = campaignCacheKey(shop, type);
  const cached = await readCache(key);
  if (cached && Date.now() - cached.fetchedAt < FRESH_CACHE_MS) {
    return cached.campaigns.map(reviveCampaign);
  }

  try {
    const campaigns = await db.campaign.findMany({
      where: { shop, isActive: true, type },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    });
    // An empty list is not worth keeping as last-good, and any valid-format
    // domain produces one, so unknown shops must not hold keys for an hour.
    const ttlSeconds = campaigns.length > 0 ? LAST_GOOD_TTL_SECONDS : FRESH_CACHE_MS / 1000;
    await writeCache(key, { fetchedAt: Date.now(), campaigns }, ttlSeconds);
    return campaigns;
  } catch (error) {
    if (!cached) throw error;
    logger.warn({ shop, error: error.message }, "storefront.settings — serving stale campaigns");
    return cached.campaigns.map(reviveCampaign);
  }
}

function parseCsvParam(url, name, max) {
  return (url.searchParams.get(name) || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, max);
}

const noCampaign = () =>
  json({ success: false, message: "No active campaign found" }, { headers: CACHEABLE_HEADERS });

/**
 * Public storefront settings lookup.
 *
 * @param {Request} request
 * @param {{ isVerifiedProxy?: boolean }} [options] - isVerifiedProxy: the request
 *   carried a valid app proxy signature. Such requests share Shopify's IPs, so a
 *   per-IP limit would treat all of a store's visitors as one caller.
 * @returns {Promise<Response>}
 */
export async function loadStorefrontSettings(request, { isVerifiedProxy = false } = {}) {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        ...CORS,
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  if (!isVerifiedProxy && (await isRateLimited(`ip:${getClientIp(request)}`))) {
    return json(
      { success: false, error: "Too many requests" },
      {
        status: 429,
        headers: { ...UNCACHED_HEADERS, "Retry-After": String(RATE_LIMIT_RETRY_SECONDS) },
      }
    );
  }

  const url = new URL(request.url);
  const shopParam = url.searchParams.get("shop");

  if (!shopParam) {
    return json(
      { success: false, error: "Shop parameter is required" },
      { status: 400, headers: CACHEABLE_HEADERS }
    );
  }

  if (shopParam.length > MAX_SHOP_LENGTH || !SHOP_PARAM_REGEX.test(shopParam)) {
    return json(
      { success: false, error: "Invalid shop parameter" },
      { status: 400, headers: CACHEABLE_HEADERS }
    );
  }

  const shop = shopParam.toLowerCase();
  const type = url.searchParams.get("type") || "bar";
  if (!CAMPAIGN_TYPES.has(type)) return noCampaign();

  try {
    const campaigns = await getActiveCampaigns(shop, type);
    const matched = findMatchingCampaign(campaigns, {
      productHandle: url.searchParams.get("product") || null,
      // CSV lists from the theme block, bounded to keep the public endpoint abuse-safe.
      // Legacy "collection" single-value param is folded in for older cached markup.
      collectionHandles: [
        ...parseCsvParam(url, "collections", 50),
        ...parseCsvParam(url, "collection", 1),
      ],
      productTags: parseCsvParam(url, "tags", 100),
    });

    if (!matched) return noCampaign();
    return json(
      { success: true, settings: campaignToSettings(matched) },
      { headers: CACHEABLE_HEADERS }
    );
  } catch (error) {
    logger.error({ error: error.message, shop }, "storefront.settings — load failed");
    return json(
      { success: false, error: "Failed to load settings" },
      {
        status: 503,
        headers: { ...UNCACHED_HEADERS, "Retry-After": String(OUTAGE_RETRY_SECONDS) },
      }
    );
  }
}
