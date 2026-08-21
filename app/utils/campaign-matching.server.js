/**
 * Storefront campaign matching — decides which active campaign a visitor sees.
 *
 * Used by the public settings endpoint (apps.countdown.settings.jsx).
 * All matching is case-insensitive; campaign target lists are stored as
 * JSON string arrays on the Campaign model.
 */

/** Parse a JSON string array from a campaign field, lowercased. */
export function parseTargetList(jsonStr) {
  try {
    const parsed = JSON.parse(jsonStr || "[]");
    return Array.isArray(parsed)
      ? parsed.filter((v) => typeof v === "string").map((v) => v.toLowerCase())
      : [];
  } catch {
    return [];
  }
}

/**
 * Does a campaign's product targeting match the current product context?
 * @param {object} c - Campaign record
 * @param {{ productHandle: string, collectionHandles: string[], productTags: string[] }} ctx
 * @returns {boolean}
 */
export function campaignMatchesProduct(c, { productHandle, collectionHandles, productTags }) {
  if (c.targetType === "specific_products") {
    const ids = parseTargetList(c.targetProductIds);
    return ids.includes(productHandle.toLowerCase());
  }
  if (c.targetType === "specific_collections") {
    const ids = parseTargetList(c.targetCollectionIds);
    return collectionHandles.some((handle) => ids.includes(handle));
  }
  if (c.targetType === "tagged_products") {
    const tags = parseTargetList(c.targetTags);
    // No configured tags → treat as no match rather than matching everything
    if (!tags.length) return false;
    return productTags.some((tag) => tags.includes(tag));
  }
  return c.targetType === "all";
}

/**
 * Pick the winning campaign for a storefront request.
 * Scheduling (startDate / one-time endDate) is enforced here as well so an
 * expired campaign is never served even if still flagged active.
 *
 * @param {object[]} campaigns - Active campaigns of the requested type
 * @param {{ productHandle?: string|null, collectionHandles?: string[], productTags?: string[] }} ctx
 * @returns {object|null}
 */
export function findMatchingCampaign(
  campaigns,
  { productHandle = null, collectionHandles = [], productTags = [] } = {}
) {
  const now = new Date();

  const active = campaigns.filter((c) => {
    if (c.startDate && c.startDate > now) return false;
    if (c.timerType === "one_time" && c.endDate && c.endDate <= now) return false;
    return true;
  });

  if (!active.length) return null;

  if (productHandle) {
    const productCampaigns = active
      .filter((c) => campaignMatchesProduct(c, { productHandle, collectionHandles, productTags }))
      .sort((a, b) => b.priority - a.priority);
    return productCampaigns[0] || null;
  }

  // No product context (e.g. announcement bar): only site-wide campaigns apply
  const sorted = active
    .filter((c) => c.targetType === "all")
    .sort((a, b) => b.priority - a.priority);
  return sorted[0] || null;
}
