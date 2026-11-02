import { describe, it, expect } from "vitest";
import { hasHtmlTag, validateCampaignForm } from "../../../app/utils/campaign.js";

describe("hasHtmlTag", () => {
  it.each([
    "<script>alert(1)</script>",
    "Sale <b>now</b>",
    "<img src=x onerror=alert(1)>",
    "</style>",
    "<!-- note -->",
  ])("rejects %s", (text) => {
    expect(hasHtmlTag(text)).toBe(true);
  });

  it.each(["Spend < $50 today", "2 < 3 > 1", "Flash Sale Ends In...", "Buy 1 <3", ""])(
    "accepts %s",
    (text) => {
      expect(hasHtmlTag(text)).toBe(false);
    }
  );
});

describe("validateCampaignForm rejects HTML in shopper-facing text", () => {
  const form = { type: "bar", barMessage: "Sale!", timerType: "daily", endAction: "hide" };

  it("flags a tag in the bar message", () => {
    const errors = validateCampaignForm({ ...form, barMessage: "<script>alert(1)</script>" });
    expect(errors.barMessage).toBeDefined();
  });

  it("flags a tag in the end message", () => {
    const errors = validateCampaignForm({
      ...form,
      endAction: "show_custom",
      customEndMessage: "<b>Over</b>",
    });
    expect(errors.customEndMessage).toBeDefined();
  });

  it("leaves plain text with a less-than sign alone", () => {
    const errors = validateCampaignForm({ ...form, barMessage: "Spend < $50 today" });
    expect(errors.barMessage).toBeUndefined();
  });
});
