import { json } from "@remix-run/node";
import db from "../db.server";
import { isRateLimited } from "../redis.server";
import { logger } from "./logger.server";
import { getClientIp } from "./client-ip.server";

const SHOP_PARAM_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/;
const VALID_EVENTS = new Set(["impression", "click", "close"]);

/** The widget's payload is under 200 bytes. */
const MAX_BODY_BYTES = 2048;
const MAX_DISCARD_BYTES = 32 * 1024 * 1024;
const MAX_POSTGRES_INT = 2147483647;
/** One visitor does not click or close one campaign more often than this per minute. */
const MAX_ACTIONS_PER_MINUTE = 5;
/** Per event class, so a flood of one cannot starve the other. */
const MAX_SHOP_EVENTS_PER_MINUTE = 300;

const CORS = { "Access-Control-Allow-Origin": "*" };

// Tracking errors must never break the storefront, and a non-200 could make the
// storefront JS retry, so anything dropped is still answered with 200.
const acknowledge = () => json({ success: true }, { status: 200, headers: CORS });

/**
 * Null when the body is over MAX_BODY_BYTES. An oversized body is read to its end
 * but never kept: stopping mid-upload resets the socket and the client loses the
 * 413. Past MAX_DISCARD_BYTES that stops being worth it, and the upload is cut off.
 */
async function readCappedBody(request) {
  if (!request.body) return "";

  const reader = request.body.getReader();
  const chunks = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_DISCARD_BYTES) {
      await reader.cancel();
      return null;
    }
    if (size <= MAX_BODY_BYTES) chunks.push(value);
  }
  return size > MAX_BODY_BYTES ? null : Buffer.concat(chunks).toString("utf8");
}

const isValidCampaignId = (id) => Number.isInteger(id) && id > 0 && id <= MAX_POSTGRES_INT;

/**
 * A supplied id is either the shop's own active campaign or nothing: falling back
 * would credit a stale or forged event to a different campaign.
 */
async function findCampaign(shop, campaignId, type) {
  if (campaignId !== null && campaignId !== undefined) {
    if (!isValidCampaignId(campaignId)) return null;
    return db.campaign.findFirst({ where: { id: campaignId, shop, isActive: true } });
  }

  const typeFilter = type === "bar" || type === "product_timer" ? { type } : {};
  return db.campaign.findFirst({
    where: { shop, isActive: true, ...typeFilter },
    orderBy: { createdAt: "desc" },
  });
}

async function incrementAnalytics(campaignId, event) {
  // UTC day bucket for daily aggregation
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const increment = {
    impressions: event === "impression" ? 1 : 0,
    clicks: event === "click" ? 1 : 0,
    closes: event === "close" ? 1 : 0,
  };

  await db.campaignAnalytics.upsert({
    where: { campaignId_date: { campaignId, date: today } },
    update: {
      impressions: { increment: increment.impressions },
      clicks: { increment: increment.clicks },
      closes: { increment: increment.closes },
      updatedAt: new Date(),
    },
    create: { campaignId, date: today, ...increment },
  });
}

/**
 * Record a storefront analytics event. The endpoint is anonymous by design (the
 * widget has nothing to sign with), so limits bound forged events without
 * preventing them.
 *
 * @param {Request} request
 * @param {{ isVerifiedProxy?: boolean }} [options] - isVerifiedProxy: the request
 *   carried a valid app proxy signature, so it shares Shopify's IPs.
 * @returns {Promise<Response>}
 */
export async function recordStorefrontEvent(request, { isVerifiedProxy = false } = {}) {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405, headers: CORS });
  }

  const ip = getClientIp(request);

  // Per-IP rate limit (20 req/min for tracking — a single visitor shouldn't fire more)
  if (!isVerifiedProxy && (await isRateLimited(`track:${ip}`, 20, 60))) return acknowledge();

  const body = await readCappedBody(request);
  if (body === null) {
    return json({ error: "Payload too large" }, { status: 413, headers: CORS });
  }

  let payload;
  try {
    payload = JSON.parse(body);
  } catch {
    return json({ error: "Invalid JSON" }, { status: 400, headers: CORS });
  }

  const { shop, event, campaignId, type } = payload || {};

  if (typeof shop !== "string" || !SHOP_PARAM_REGEX.test(shop)) {
    return json({ error: "Invalid shop" }, { status: 400, headers: CORS });
  }

  if (typeof event !== "string" || !VALID_EVENTS.has(event)) {
    return json({ error: "Invalid event" }, { status: 400, headers: CORS });
  }

  // The signature covers the query, not this body, so the body cannot pick the shop.
  if (isVerifiedProxy && shop !== new URL(request.url).searchParams.get("shop")) {
    return json({ error: "Invalid shop" }, { status: 400, headers: CORS });
  }

  // Per-shop rate limit — the primary abuse ceiling. The per-IP limit above can be
  // evaded by rotating addresses, so a per-shop cap bounds analytics pollution and
  // DB write volume regardless of source. Forged events can still spend this budget:
  // nothing here can tell them from real ones.
  const isAction = event !== "impression";
  const budget = isAction ? "action" : "impression";
  if (await isRateLimited(`track_shop:${shop}:${budget}`, MAX_SHOP_EVENTS_PER_MINUTE, 60)) {
    return acknowledge();
  }

  try {
    const campaign = await findCampaign(shop, campaignId, type);
    if (!campaign) return acknowledge();

    // All visitors behind the app proxy share Shopify's address, so an address
    // says nothing about who clicked; the shop budget above still applies.
    if (
      isAction &&
      !isVerifiedProxy &&
      (await isRateLimited(
        `track_action:${ip}:${campaign.id}:${event}`,
        MAX_ACTIONS_PER_MINUTE,
        60
      ))
    ) {
      return acknowledge();
    }

    await incrementAnalytics(campaign.id, event);
  } catch (error) {
    logger.warn({ shop, event, error: error.message }, "storefront.track — event dropped");
  }

  return acknowledge();
}
