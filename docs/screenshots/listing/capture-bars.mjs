/**
 * Captures REAL announcement-bar renders in several configs for the
 * "one app, every look" listing slide. Updates the demo-store bar campaign
 * between captures and clips to the live #cdb-bar element, so each strip is
 * genuine app output — not a mockup.
 *
 * Prereqs: app on :3100, static server on :8899.
 */
import { chromium } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const shop = "demo-store.myshopify.com";
const URL = "http://127.0.0.1:8899/docs/screenshots/demo-storefront.html?view=product";

const variants = [
  { file: "bar-black", barMessage: "Black Friday — up to 40% off sitewide", discountCode: "BF40",
    barIcon: "🔥", backgroundColor: "#111111", textColor: "#ffffff",
    buttonBackgroundColor: "#f5c518", buttonTextColor: "#111111", buttonText: "Shop the Sale" },
  { file: "bar-green", barMessage: "Flash Sale — 20% off everything today", discountCode: "SAVE20",
    barIcon: "⚡", backgroundColor: "#288d40", textColor: "#ffffff",
    buttonBackgroundColor: "#ffffff", buttonTextColor: "#111111", buttonText: "Shop Now" },
  { file: "bar-crimson", barMessage: "Final Hours — last chance to order", discountCode: "",
    barIcon: "⏳", backgroundColor: "#a80f16", textColor: "#ffffff",
    buttonBackgroundColor: "#ffe600", buttonTextColor: "#1a1200", buttonText: "Order Now" },
];

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch();

for (const v of variants) {
  await db.campaign.updateMany({
    where: { shop, type: "bar", isActive: true },
    data: {
      barMessage: v.barMessage, discountCode: v.discountCode, barIcon: v.barIcon,
      backgroundColor: v.backgroundColor, textColor: v.textColor,
      buttonBackgroundColor: v.buttonBackgroundColor, buttonTextColor: v.buttonTextColor,
      buttonText: v.buttonText, animationStyle: "none",
    },
  });
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto(`${URL}&t=${Date.now()}`, { waitUntil: "networkidle" });
  const bar = page.locator("#cdb-bar");
  await bar.waitFor({ state: "visible" });
  await wait(1200);
  await bar.screenshot({ path: `docs/screenshots/listing/${v.file}.png` });
  await ctx.close();
  console.log(`  ✓ ${v.file}.png`);
}

await browser.close();
await db.$disconnect();
console.log("bar variants captured");
