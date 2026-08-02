/**
 * Unit tests for HSB/Hex color conversion.
 * Tests hexToHsb function logic extracted from app._index.jsx.
 */

// Extracted from app._index.jsx
function hexToHsb(hex) {
  let h = (hex || "#000000").replace("#", "").trim();
  if (h.length === 3)
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  const num = parseInt(h, 16);
  const r = ((num >> 16) & 255) / 255;
  const g = ((num >> 8) & 255) / 255;
  const b = (num & 255) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;

  let hue = 0;
  if (d !== 0) {
    switch (max) {
      case r:
        hue = ((g - b) / d) % 6;
        break;
      case g:
        hue = (b - r) / d + 2;
        break;
      case b:
        hue = (r - g) / d + 4;
        break;
      default:
        break;
    }
    hue *= 60;
    if (hue < 0) hue += 360;
  }

  return {
    hue: Math.round(hue),
    saturation: max === 0 ? 0 : parseFloat((d / max).toFixed(4)),
    brightness: parseFloat(max.toFixed(4)),
  };
}

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
