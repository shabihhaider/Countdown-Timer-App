/** Captures the "every major sale" occasions showcase at 1600x900 @2x. */
import { chromium } from "@playwright/test";
import { pathToFileURL } from "url";
import { resolve } from "path";

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
await page.goto(pathToFileURL(resolve("docs/screenshots/gallery/occasions.html")).href, { waitUntil: "load" });
await new Promise((r) => setTimeout(r, 700));
await page.screenshot({ path: "docs/screenshots/gallery/assets/occasions-showcase.png" });
await browser.close();
console.log("captured occasions-showcase.png");
