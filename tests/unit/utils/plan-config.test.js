import { BillingInterval } from "@shopify/shopify-api";
import { PLAN_PRO_CONFIG, PRO_BILLING_PLAN } from "../../../app/utils/plan-config";

describe("PRO_BILLING_PLAN", () => {
  it("is the subscription shape billing.request accepts", () => {
    expect(PRO_BILLING_PLAN).not.toHaveProperty("interval");
    expect(PRO_BILLING_PLAN.lineItems).toEqual([
      { amount: 6.99, currencyCode: "USD", interval: BillingInterval.Every30Days },
    ]);
    expect(PRO_BILLING_PLAN.trialDays).toBe(PLAN_PRO_CONFIG.trialDays);
  });
});
