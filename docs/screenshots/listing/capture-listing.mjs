/**
 * Captures all 6 unified listing slides at 1280x800 @2x (2560x1600 — Shopify's
 * retina listing spec). Slides are self-contained (local images + css), served
 * over the static server so relative asset paths resolve.
 *
 * Prereqs: static server on :8899 (python -m http.server 8899 at repo root).
 * Run: node docs/screenshots/listing/capture-listing.mjs
 */
import { chromium } from "@playwright/test";

const BASE = "http://127.0.0.1:8899/docs/screenshots/listing";
const slides = [
  ["slide-1-bar", "listing-01-announcement-bar"],
  ["slide-2-product", "listing-02-product-timer"],
  ["slide-3-cart", "listing-03-cart-timer"],
  ["slide-4-analytics", "listing-04-analytics"],
  ["slide-5-builder", "listing-05-campaign-builder"],
  ["slide-6-gallery", "listing-06-every-look"],
];

const browser = await chromium.launch();
for (const [src, out] of slides) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/${src}.html`, { waitUntil: "networkidle" });
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: `docs/screenshots/${out}.png` });
  await ctx.close();
  console.log(`  ✓ ${out}.png`);
}
await browser.close();
console.log("6 listing slides captured");
