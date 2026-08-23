/** Captures the Black Friday showcase hero at 1280x800 @2x. */
import { chromium } from "@playwright/test";
import { pathToFileURL } from "url";
import { resolve } from "path";

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
await page.goto(pathToFileURL(resolve("docs/screenshots/bf-showcase.html")).href);
await new Promise((r) => setTimeout(r, 800));
await page.screenshot({ path: "docs/screenshots/05-black-friday-showcase.png" });
await browser.close();
console.log("captured 05-black-friday-showcase.png");
