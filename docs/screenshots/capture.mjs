/**
 * Captures App Store listing screenshots of the storefront widgets.
 *
 * Prereqs: app API running on :3100, repo root served on :8899
 *   (python -m http.server 8899), demo campaigns seeded for
 *   demo-store.myshopify.com.
 *
 * Run: node docs/screenshots/capture.mjs
 * Output: docs/screenshots/*.png at 2560x1600 (1280x800 @2x — Shopify's
 * retina listing size) plus one mobile shot.
 */
import { chromium } from "@playwright/test";

const BASE = "http://127.0.0.1:8899/docs/screenshots/demo-storefront.html";
const OUT = "docs/screenshots";

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function shot(browser, { name, view, viewport = { width: 1280, height: 800 }, scale = 2, settle = 2500 }) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: scale });
  const page = await ctx.newPage();
  await page.goto(`${BASE}?view=${view}&t=${Date.now()}`, { waitUntil: "networkidle" });
  await wait(settle); // let timers render a non-round value and animations settle
  await page.screenshot({ path: `${OUT}/${name}.png` });
  await ctx.close();
  console.log(`  ✓ ${name}.png (${viewport.width}x${viewport.height} @${scale}x)`);
}

const browser = await chromium.launch();
console.log("Capturing listing screenshots...");

await shot(browser, { name: "01-storefront-bar-black-friday", view: "product" });
await shot(browser, { name: "02-storefront-product-timer", view: "product" });
await shot(browser, { name: "03-storefront-cart-timer", view: "cart" });
await shot(browser, {
  name: "04-storefront-mobile",
  view: "product",
  viewport: { width: 390, height: 844 },
  scale: 3,
});

await browser.close();
console.log("Done.");
