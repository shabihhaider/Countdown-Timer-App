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
  it("returns free plan with source check_failed when billing check fails", async () => {
    const mockBilling = {
      check: vi.fn().mockRejectedValue(new Error("billing unavailable")),
    };
    const result = await getPlanInfo(mockBilling);
    expect(result.isPro).toBe(false);
    expect(result.plan).toBe("Free");
    expect(result.limits.maxActiveCampaigns).toBe(1);
    expect(result.source).toBe("check_failed");
  });

  it("returns free plan when no active payment", async () => {
    const mockBilling = {
      check: vi.fn().mockResolvedValue({ hasActivePayment: false }),
    };
    const result = await getPlanInfo(mockBilling);
    expect(result.isPro).toBe(false);
    expect(result.plan).toBe("Free");
    expect(result.source).toBe("billing_check");
  });

  it("returns pro plan when active payment exists", async () => {
    const mockBilling = {
      check: vi.fn().mockResolvedValue({ hasActivePayment: true }),
    };
    const result = await getPlanInfo(mockBilling);
    expect(result.isPro).toBe(true);
    expect(result.plan).toBe("Pro");
    expect(result.limits.maxActiveCampaigns).toBe(Infinity);
    expect(result.source).toBe("billing_check");
  });

  it("exposes the active subscription id and test flag for in-app cancellation", async () => {
    const mockBilling = {
      check: vi.fn().mockResolvedValue({
        hasActivePayment: true,
        appSubscriptions: [{ id: "gid://shopify/AppSubscription/123", name: "Pro", test: true }],
      }),
    };
    const result = await getPlanInfo(mockBilling);
    expect(result.subscription).toEqual({
      id: "gid://shopify/AppSubscription/123",
      isTest: true,
    });
  });

  it("returns null subscription when there is no active payment", async () => {
    const mockBilling = {
      check: vi.fn().mockResolvedValue({ hasActivePayment: false, appSubscriptions: [] }),
    };
    const result = await getPlanInfo(mockBilling);
    expect(result.subscription).toBeNull();
  });

  it("returns null subscription when the billing check fails", async () => {
    const mockBilling = {
      check: vi.fn().mockRejectedValue(new Error("billing unavailable")),
    };
    const result = await getPlanInfo(mockBilling);
    expect(result.subscription).toBeNull();
  });
});

describe("FORCE_PRO_PLAN dev override", () => {
  afterEach(() => {
    delete process.env.FORCE_PRO_PLAN;
    vi.unstubAllEnvs();
  });

  it("grants Pro without a billing check when enabled outside production", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("FORCE_PRO_PLAN", "true");
    const mockBilling = { check: vi.fn() };
    const result = await getPlanInfo(mockBilling);
    expect(result.isPro).toBe(true);
    expect(result.plan).toBe("Pro");
    expect(result.source).toBe("dev_override");
    expect(mockBilling.check).not.toHaveBeenCalled();
  });

  it("is ignored in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("FORCE_PRO_PLAN", "true");
    const mockBilling = {
      check: vi.fn().mockResolvedValue({ hasActivePayment: false }),
    };
    const result = await getPlanInfo(mockBilling);
    expect(result.isPro).toBe(false);
    expect(mockBilling.check).toHaveBeenCalled();
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
    expect(result.reason).toContain("allows 1 active campaign");
    expect(result.reason).toContain("Upgrade to Pro");
  });

  it("allows creation on pro plan with many campaigns", async () => {
    const mockBilling = {
      check: vi.fn().mockResolvedValue({ hasActivePayment: true }),
    };
    const result = await canCreateCampaign(mockBilling, 50);
    expect(result.allowed).toBe(true);
  });
});
