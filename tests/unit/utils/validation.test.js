/**
 * Unit tests for server-side validation logic.
 * Tests the shop param regex, button link URL validation,
 * and campaign form validation.
 */

import { isValidButtonLink, isValidHex, validateCampaignForm } from "../../../app/utils/campaign";

// Mirrors SHOP_PARAM_REGEX in apps.countdown.settings.jsx
const SHOP_PARAM_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/;

// Mirrors VALID_EVENTS in apps.countdown.track.jsx
const VALID_EVENTS = new Set(["impression", "click", "close"]);

describe("SHOP_PARAM_REGEX", () => {
  describe("valid shop domains", () => {
    const valid = [
      "mystore.myshopify.com",
      "my-store.myshopify.com",
      "MYSTORE.myshopify.com",
      "store123.myshopify.com",
      "123store.myshopify.com",
      "a.myshopify.com",
      "my-awesome-store-2024.myshopify.com",
    ];

    valid.forEach((shop) => {
      it(`accepts "${shop}"`, () => {
        expect(SHOP_PARAM_REGEX.test(shop)).toBe(true);
      });
    });
  });

  describe("invalid shop domains", () => {
    const invalid = [
      "",
      "notashopifystore.com",
      "store.shopify.com",
      "-store.myshopify.com",
      ".myshopify.com",
      "store.myshopify.com/path",
      "store.myshopify.com?q=1",
      "https://store.myshopify.com",
      "store .myshopify.com",
      "store\n.myshopify.com",
      "../../../../etc/passwd",
      "<script>alert(1)</script>",
      "javascript:alert(1)",
    ];

    invalid.forEach((shop) => {
      it(`rejects "${shop.slice(0, 40)}"`, () => {
        expect(SHOP_PARAM_REGEX.test(shop)).toBe(false);
      });
    });
  });
});

describe("isValidButtonLink", () => {
  describe("valid links", () => {
    const valid = [
      "/collections/all",
      "/products/my-product",
      "/",
      "https://example.com",
      "https://mystore.myshopify.com/collections/sale",
      "https://example.com/path?q=1",
    ];

    valid.forEach((url) => {
      it(`accepts "${url}"`, () => {
        expect(isValidButtonLink(url)).toBe(true);
      });
    });
  });

  it("accepts empty string (optional field)", () => {
    expect(isValidButtonLink("")).toBe(true);
  });

  it("accepts null (optional field)", () => {
    expect(isValidButtonLink(null)).toBe(true);
  });

  it("accepts http:// links (merchants may use HTTP)", () => {
    expect(isValidButtonLink("http://example.com")).toBe(true);
  });

  describe("invalid/dangerous links", () => {
    const invalid = [
      "javascript:alert(1)",
      "data:text/html,<script>",
      "ftp://example.com",
      "//example.com",
      "vbscript:alert(1)",
      "file:///etc/passwd",
    ];

    invalid.forEach((url) => {
      it(`rejects "${url}"`, () => {
        expect(isValidButtonLink(url)).toBe(false);
      });
    });
  });
});

describe("isValidHex", () => {
  it("accepts valid 6-char hex with #", () => {
    expect(isValidHex("#288d40")).toBe(true);
    expect(isValidHex("#ffffff")).toBe(true);
    expect(isValidHex("#000000")).toBe(true);
    expect(isValidHex("#FF00AA")).toBe(true);
  });

  it("rejects invalid hex", () => {
    expect(isValidHex("288d40")).toBe(false);
    expect(isValidHex("#fff")).toBe(false);
    expect(isValidHex("#gggggg")).toBe(false);
    expect(isValidHex("")).toBe(false);
    expect(isValidHex("#12345")).toBe(false);
  });
});

describe("validateCampaignForm", () => {
  const validForm = {
    barMessage: "Flash Sale!",
    endDate: new Date(Date.now() + 86400000).toISOString(),
    buttonLink: "/collections/all",
    endAction: "hide",
    customEndMessage: "",
  };

  it("returns no errors for valid form", () => {
    expect(Object.keys(validateCampaignForm(validForm))).toHaveLength(0);
  });

  it("requires barMessage", () => {
    const errors = validateCampaignForm({ ...validForm, barMessage: "" });
    expect(errors.barMessage).toBeDefined();
  });

  it("rejects barMessage over 200 chars", () => {
    const errors = validateCampaignForm({ ...validForm, barMessage: "x".repeat(201) });
    expect(errors.barMessage).toContain("200");
  });

  it("requires endDate", () => {
    const errors = validateCampaignForm({ ...validForm, endDate: "" });
    expect(errors.endDate).toBeDefined();
  });

  it("rejects past endDate", () => {
    const errors = validateCampaignForm({
      ...validForm,
      endDate: "2020-01-01T00:00",
    });
    expect(errors.endDate).toContain("future");
  });

  it("rejects invalid endDate", () => {
    const errors = validateCampaignForm({ ...validForm, endDate: "not-a-date" });
    expect(errors.endDate).toContain("valid");
  });

  it("validates startDate is a valid date when provided", () => {
    const errors = validateCampaignForm({ ...validForm, startDate: "not-a-date" });
    expect(errors.startDate).toContain("valid");
  });

  it("rejects startDate after endDate", () => {
    const errors = validateCampaignForm({
      ...validForm,
      startDate: new Date(Date.now() + 172800000).toISOString(),
      endDate: new Date(Date.now() + 86400000).toISOString(),
    });
    expect(errors.startDate).toContain("before");
  });

  it("accepts valid startDate before endDate", () => {
    const errors = validateCampaignForm({
      ...validForm,
      startDate: new Date(Date.now() + 3600000).toISOString(),
      endDate: new Date(Date.now() + 86400000).toISOString(),
    });
    expect(errors.startDate).toBeUndefined();
  });

  it("accepts empty buttonLink", () => {
    const errors = validateCampaignForm({ ...validForm, buttonLink: "" });
    expect(errors.buttonLink).toBeUndefined();
  });

  it("requires customEndMessage when endAction is show_custom", () => {
    const errors = validateCampaignForm({
      ...validForm,
      endAction: "show_custom",
      customEndMessage: "",
    });
    expect(errors.customEndMessage).toBeDefined();
  });
});

describe("VALID_EVENTS", () => {
  it("accepts impression", () => {
    expect(VALID_EVENTS.has("impression")).toBe(true);
  });

  it("accepts click", () => {
    expect(VALID_EVENTS.has("click")).toBe(true);
  });

  it("accepts close", () => {
    expect(VALID_EVENTS.has("close")).toBe(true);
  });

  it("rejects unknown events", () => {
    expect(VALID_EVENTS.has("purchase")).toBe(false);
    expect(VALID_EVENTS.has("pageview")).toBe(false);
    expect(VALID_EVENTS.has("")).toBe(false);
    expect(VALID_EVENTS.has("__proto__")).toBe(false);
  });
});
