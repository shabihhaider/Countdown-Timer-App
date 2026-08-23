import { chromium } from "@playwright/test";
import { pathToFileURL } from "url";
import { resolve } from "path";

const shots = [
  ["admin/01-dashboard.jpg", "gallery/assets/adm-dashboard.png"],
  ["admin/03-analytics-chart.jpg", "gallery/assets/adm-analytics-chart.png"],
  ["admin/04-analytics-campaigns.jpg", "gallery/assets/adm-analytics-table.png"],
  ["admin/05-campaigns-list.jpg", "gallery/assets/adm-campaigns.png"],
  ["admin/06-plan-pro.jpg", "gallery/assets/adm-plan.png"],
  ["admin/07-campaign-builder.jpg", "gallery/assets/adm-builder.png"],
];
const TOP = 56, BOTTOM = 34;
const browser = await chromium.launch();
for (const [src, out] of shots) {
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  await page.goto(pathToFileURL(resolve("docs/screenshots", src)).href, { waitUntil: "load" });
  await page.waitForTimeout(200);
  const box = await page.evaluate(() => {
    const i = document.querySelector("img");
    return i ? { w: i.naturalWidth, h: i.naturalHeight } : null;
  });
  if (!box || !box.w) { console.log(`  ! ${src} — could not read size`, box); await page.close(); continue; }
  await page.setViewportSize({ width: box.w, height: box.h });
  await page.waitForTimeout(100);
  await page.screenshot({ path: `docs/screenshots/${out}`, clip: { x: 0, y: TOP, width: box.w, height: box.h - TOP - BOTTOM } });
  await page.close();
  console.log(`  ✓ ${out}  (${box.w}x${box.h - TOP - BOTTOM})`);
}
await browser.close();
console.log("done");
