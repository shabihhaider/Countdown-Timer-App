// Captures the 8 App Store gallery slides at 1600×900 @2x (3200×1800).
// Served over the static server so relative asset paths resolve.
import { chromium } from "@playwright/test";
const BASE = "http://127.0.0.1:8899/docs/screenshots/gallery";
const browser = await chromium.launch();
for (let n = 1; n <= 8; n++) {
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/slide-${n}.html`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  const out = `docs/screenshots/gallery-0${n}.png`;
  await page.screenshot({ path: out });
  await ctx.close();
  console.log(`  ✓ gallery-0${n}.png`);
}
await browser.close();
console.log("8 gallery slides captured");
