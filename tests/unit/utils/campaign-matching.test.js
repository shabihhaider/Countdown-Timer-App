import { describe, it, expect } from "vitest";
import {
  parseTargetList,
  campaignMatchesProduct,
  findMatchingCampaign,
} from "../../../app/utils/campaign-matching.server";

const baseCampaign = (overrides = {}) => ({
  id: 1,
  targetType: "all",
  targetProductIds: "[]",
  targetCollectionIds: "[]",
  targetTags: "[]",
  priority: 0,
  timerType: "one_time",
  startDate: null,
  endDate: new Date(Date.now() + 86400000),
  ...overrides,
});

describe("parseTargetList", () => {
  it("parses a JSON array and lowercases entries", () => {
    expect(parseTargetList('["Sale", "CLEARANCE"]')).toEqual(["sale", "clearance"]);
  });

  it("returns empty array for invalid JSON", () => {
    expect(parseTargetList("not json")).toEqual([]);
  });

  it("returns empty array for null/undefined", () => {
    expect(parseTargetList(null)).toEqual([]);
    expect(parseTargetList(undefined)).toEqual([]);
  });

  it("returns empty array when JSON is not an array", () => {
    expect(parseTargetList('{"a":1}')).toEqual([]);
  });

  it("filters out non-string entries", () => {
    expect(parseTargetList('["ok", 42, null]')).toEqual(["ok"]);
  });
});

describe("campaignMatchesProduct", () => {
  const ctx = {
    productHandle: "blue-shirt",
    collectionHandles: ["summer", "sale-items"],
    productTags: ["sale", "new-arrival"],
  };

  it("matches targetType all for any product", () => {
    expect(campaignMatchesProduct(baseCampaign(), ctx)).toBe(true);
  });

  it("matches specific_products by handle case-insensitively", () => {
    const c = baseCampaign({
      targetType: "specific_products",
      targetProductIds: '["Blue-Shirt"]',
    });
    expect(campaignMatchesProduct(c, ctx)).toBe(true);
  });

  it("rejects specific_products when handle not listed", () => {
    const c = baseCampaign({
      targetType: "specific_products",
      targetProductIds: '["red-shirt"]',
    });
    expect(campaignMatchesProduct(c, ctx)).toBe(false);
  });

  it("matches specific_collections when ANY product collection is targeted", () => {
    const c = baseCampaign({
      targetType: "specific_collections",
      targetCollectionIds: '["sale-items"]',
    });
    expect(campaignMatchesProduct(c, ctx)).toBe(true);
  });

  it("rejects specific_collections when product is in none of the targeted collections", () => {
    const c = baseCampaign({
      targetType: "specific_collections",
      targetCollectionIds: '["winter"]',
    });
    expect(campaignMatchesProduct(c, ctx)).toBe(false);
  });

  it("matches tagged_products when a product tag overlaps", () => {
    const c = baseCampaign({
      targetType: "tagged_products",
      targetTags: '["SALE"]',
    });
    expect(campaignMatchesProduct(c, ctx)).toBe(true);
  });

  it("rejects tagged_products when no tags overlap", () => {
    const c = baseCampaign({
      targetType: "tagged_products",
      targetTags: '["clearance"]',
    });
    expect(campaignMatchesProduct(c, ctx)).toBe(false);
  });

  it("rejects tagged_products with an empty configured tag list (never match-all)", () => {
    const c = baseCampaign({ targetType: "tagged_products", targetTags: "[]" });
    expect(campaignMatchesProduct(c, ctx)).toBe(false);
  });

  it("rejects tagged_products when the product has no tags", () => {
    const c = baseCampaign({
      targetType: "tagged_products",
      targetTags: '["sale"]',
    });
    expect(campaignMatchesProduct(c, { ...ctx, productTags: [] })).toBe(false);
  });
});

describe("findMatchingCampaign", () => {
  it("returns null when there are no campaigns", () => {
    expect(findMatchingCampaign([], {})).toBeNull();
  });

  it("excludes campaigns that have not started yet", () => {
    const future = baseCampaign({ startDate: new Date(Date.now() + 3600000) });
    expect(findMatchingCampaign([future], {})).toBeNull();
  });

  it("excludes expired one_time campaigns", () => {
    const expired = baseCampaign({ endDate: new Date(Date.now() - 1000) });
    expect(findMatchingCampaign([expired], {})).toBeNull();
  });

  it("keeps evergreen campaigns even with a past endDate", () => {
    const evergreen = baseCampaign({
      timerType: "evergreen",
      endDate: new Date(Date.now() - 1000),
    });
    expect(findMatchingCampaign([evergreen], {})).toBe(evergreen);
  });

  it("picks the highest-priority matching campaign for a product", () => {
    const low = baseCampaign({ id: 1, priority: 1 });
    const high = baseCampaign({ id: 2, priority: 5 });
    const result = findMatchingCampaign([low, high], {
      productHandle: "any-product",
    });
    expect(result.id).toBe(2);
  });

  it("prefers a tag-targeted campaign over site-wide by priority", () => {
    const siteWide = baseCampaign({ id: 1, priority: 0 });
    const tagged = baseCampaign({
      id: 2,
      priority: 3,
      targetType: "tagged_products",
      targetTags: '["sale"]',
    });
    const result = findMatchingCampaign([siteWide, tagged], {
      productHandle: "blue-shirt",
      productTags: ["sale"],
    });
    expect(result.id).toBe(2);
  });

  it("returns null for product context when nothing matches", () => {
    const c = baseCampaign({
      targetType: "specific_products",
      targetProductIds: '["other"]',
    });
    expect(findMatchingCampaign([c], { productHandle: "blue-shirt" })).toBeNull();
  });

  it("only serves site-wide campaigns when there is no product context", () => {
    const productOnly = baseCampaign({
      id: 1,
      targetType: "specific_products",
      targetProductIds: '["x"]',
    });
    const siteWide = baseCampaign({ id: 2 });
    const result = findMatchingCampaign([productOnly, siteWide], {});
    expect(result.id).toBe(2);
  });
});
