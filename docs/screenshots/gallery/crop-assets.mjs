import { chromium } from "@playwright/test";
import { pathToFileURL } from "url";
import { resolve } from "path";

// Tight crops used as insets/details in gallery slides. Each entry clips a
// region out of a real capture — no fabrication, just framing.
const jobs = [
  {
    src: "02-storefront-product-timer.png",
    out: "gallery/assets/product-result-crop.png",
    // right product column: title, price, and the live "Flash sale ends in" timer
    clip: { x: 1340, y: 352, width: 1140, height: 632 },
  },
  {
    // drop the bottom rows (Priority + the "dev previews" preview badge) so the
    // targeting rule reads clean, no dev-mode chrome
    src: "gallery/assets/adm-targeting.png",
    out: "gallery/assets/adm-targeting-clean.png",
    clip: { x: 0, y: 0, width: 1568, height: 560 },
  },
];

const browser = await chromium.launch();
for (const { src, out, clip } of jobs) {
  const page = await browser.newPage();
  const url = pathToFileURL(resolve("docs/screenshots", src)).href;
  await page.goto(url, { waitUntil: "load" });
  const nat = await page.evaluate(() => {
    const i = document.querySelector("img");
    return i ? { w: i.naturalWidth, h: i.naturalHeight } : null;
  });
  await page.setViewportSize({ width: nat.w, height: nat.h });
  await page.waitForTimeout(120);
  await page.screenshot({ path: `docs/screenshots/${out}`, clip });
  await page.close();
  console.log(`  ✓ ${out}  (${clip.width}x${clip.height})  from ${src} (${nat.w}x${nat.h})`);
}
await browser.close();
console.log("done");
