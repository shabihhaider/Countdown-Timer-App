/**
 * Unit tests for server-side validation logic.
 * Tests the shop param regex and button link URL validation
 * used in apps.countdown.settings.jsx and apps.countdown.track.jsx.
 */

// Mirrors SHOP_PARAM_REGEX in apps.countdown.settings.jsx
const SHOP_PARAM_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/;

// Mirrors isValidButtonLink in app._index.jsx (uses regex with negative lookahead)
function isValidButtonLink(url) {
  if (!url) return false;
  return /^(\/(?!\/)|https:\/\/)/.test(url.trim());
}

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
      "-store.myshopify.com", // starts with hyphen
      ".myshopify.com", // starts with dot
      "store.myshopify.com/path", // has path
      "store.myshopify.com?q=1", // has query
      "https://store.myshopify.com", // has protocol
      "store .myshopify.com", // has space
      "store\n.myshopify.com", // has newline
      "../../../../etc/passwd", // path traversal attempt
      "<script>alert(1)</script>", // XSS attempt
      "javascript:alert(1)", // JS injection
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

  describe("invalid/dangerous links", () => {
    const invalid = [
      "",
      null,
      undefined,
      "javascript:alert(1)", // XSS
      "data:text/html,<script>", // data URI
      "http://example.com", // http only (not https)
      "ftp://example.com", // wrong protocol
      "//example.com", // protocol-relative
      "vbscript:alert(1)", // vbscript
      "file:///etc/passwd", // file URI
    ];

    invalid.forEach((url) => {
      it(`rejects ${JSON.stringify(url)}`, () => {
        expect(isValidButtonLink(url)).toBe(false);
      });
    });
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
