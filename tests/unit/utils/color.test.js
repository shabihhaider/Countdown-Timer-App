/**
 * Unit tests for HSB/Hex color conversion.
 * Tests hexToHsb and hsbToHex from app/utils/campaign.js
 */

import { hexToHsb, hsbToHex } from "../../../app/utils/campaign";

describe("hexToHsb", () => {
  it("converts pure black (#000000)", () => {
    const result = hexToHsb("#000000");
    expect(result.hue).toBe(0);
    expect(result.saturation).toBe(0);
    expect(result.brightness).toBe(0);
  });

  it("converts pure white (#ffffff)", () => {
    const result = hexToHsb("#ffffff");
    expect(result.hue).toBe(0);
    expect(result.saturation).toBe(0);
    expect(result.brightness).toBe(1);
  });

  it("converts pure red (#ff0000)", () => {
    const result = hexToHsb("#ff0000");
    expect(result.hue).toBe(0);
    expect(result.saturation).toBe(1);
    expect(result.brightness).toBe(1);
  });

  it("converts pure green (#00ff00)", () => {
    const result = hexToHsb("#00ff00");
    expect(result.hue).toBe(120);
    expect(result.saturation).toBe(1);
    expect(result.brightness).toBe(1);
  });

  it("converts pure blue (#0000ff)", () => {
    const result = hexToHsb("#0000ff");
    expect(result.hue).toBe(240);
    expect(result.saturation).toBe(1);
    expect(result.brightness).toBe(1);
  });

  it("converts Shopify default green (#288d40)", () => {
    const result = hexToHsb("#288d40");
    expect(result.hue).toBeGreaterThan(100);
    expect(result.hue).toBeLessThan(150);
    expect(result.saturation).toBeGreaterThan(0.5);
    expect(result.brightness).toBeGreaterThan(0.4);
  });

  it("handles 3-char shorthand hex (#fff)", () => {
    const result = hexToHsb("#fff");
    expect(result.brightness).toBe(1);
    expect(result.saturation).toBe(0);
  });

  it("handles hex without # prefix", () => {
    const resultWith = hexToHsb("#288d40");
    const resultWithout = hexToHsb("288d40");
    expect(resultWith.hue).toBe(resultWithout.hue);
    expect(resultWith.saturation).toBe(resultWithout.saturation);
    expect(resultWith.brightness).toBe(resultWithout.brightness);
  });

  it("falls back to black for null/undefined input", () => {
    const result = hexToHsb(null);
    expect(result.hue).toBe(0);
    expect(result.brightness).toBe(0);
  });
});

describe("hsbToHex", () => {
  it("converts black HSB to #000000", () => {
    expect(hsbToHex({ hue: 0, saturation: 0, brightness: 0 })).toBe("#000000");
  });

  it("converts white HSB to #ffffff", () => {
    expect(hsbToHex({ hue: 0, saturation: 0, brightness: 1 })).toBe("#ffffff");
  });

  it("converts red HSB to #ff0000", () => {
    expect(hsbToHex({ hue: 0, saturation: 1, brightness: 1 })).toBe("#ff0000");
  });

  it("roundtrips through hexToHsb → hsbToHex", () => {
    const original = "#288d40";
    const hsb = hexToHsb(original);
    const result = hsbToHex(hsb);
    expect(result).toBe(original);
  });

  it("handles missing properties with defaults", () => {
    expect(hsbToHex({})).toBe("#000000");
  });
});
