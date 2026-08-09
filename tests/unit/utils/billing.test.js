/**
 * Tests for billing utility functions.
 * Note: getPlanInfo and canCreateCampaign require a Shopify billing
 * object that we can't easily mock in unit tests. We test the module
 * exports and default behavior.
 */

// Mock the shopify.server module since billing.server.js imports from it
import { getPlanInfo, canCreateCampaign } from "../../../app/utils/billing.server";

vi.mock("../../../app/shopify.server", () => ({
  PLAN_PRO: "Pro",
}));

describe("getPlanInfo", () => {
  it("returns free plan when billing check fails", async () => {
    const mockBilling = {
      check: vi.fn().mockRejectedValue(new Error("billing unavailable")),
    };
    const result = await getPlanInfo(mockBilling);
    expect(result.isPro).toBe(false);
    expect(result.plan).toBe("Free");
    expect(result.limits.maxActiveCampaigns).toBe(1);
  });

  it("returns free plan when no active payment", async () => {
    const mockBilling = {
      check: vi.fn().mockResolvedValue({ hasActivePayment: false }),
    };
    const result = await getPlanInfo(mockBilling);
    expect(result.isPro).toBe(false);
    expect(result.plan).toBe("Free");
  });

  it("returns pro plan when active payment exists", async () => {
    const mockBilling = {
      check: vi.fn().mockResolvedValue({ hasActivePayment: true }),
    };
    const result = await getPlanInfo(mockBilling);
    expect(result.isPro).toBe(true);
    expect(result.plan).toBe("Pro");
    expect(result.limits.maxActiveCampaigns).toBe(Infinity);
  });
});

describe("canCreateCampaign", () => {
  it("allows creation on free plan with 0 active campaigns", async () => {
    const mockBilling = {
      check: vi.fn().mockResolvedValue({ hasActivePayment: false }),
    };
    const result = await canCreateCampaign(mockBilling, 0);
    expect(result.allowed).toBe(true);
  });

  it("blocks creation on free plan with 1 active campaign", async () => {
    const mockBilling = {
      check: vi.fn().mockResolvedValue({ hasActivePayment: false }),
    };
    const result = await canCreateCampaign(mockBilling, 1);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("Free plan");
  });

  it("allows creation on pro plan with many campaigns", async () => {
    const mockBilling = {
      check: vi.fn().mockResolvedValue({ hasActivePayment: true }),
    };
    const result = await canCreateCampaign(mockBilling, 50);
    expect(result.allowed).toBe(true);
  });
});
