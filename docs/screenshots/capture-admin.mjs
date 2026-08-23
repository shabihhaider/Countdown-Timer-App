/**
 * Captures REAL admin-UI screenshots without a browser login.
 *
 * How: Shopify session tokens are HS256 JWTs signed with the app's own API
 * secret. We mint one for our dev store (legitimate — our app, our secret,
 * our store) and pass it as ?id_token= so shopify-app-remix performs its
 * normal token exchange against Shopify and renders the page server-side.
 * The App Bridge CDN script is blocked so standalone rendering doesn't
 * redirect into admin.shopify.com (TitleBar buttons won't render; page
 * content is pure Polaris and renders fully).
 *
 * Run: node docs/screenshots/capture-admin.mjs   (app on :3100, .env present)
 */
import { chromium } from "@playwright/test";
import crypto from "crypto";
import { readFileSync } from "fs";

const env = Object.fromEntries(
  readFileSync(".env", "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()])
);

const SHOP = "hsms-countdown-app-test.myshopify.com";
const API_KEY = env.SHOPIFY_API_KEY;
const SECRET = env.SHOPIFY_API_SECRET;
const HOST = Buffer.from(`admin.shopify.com/store/${SHOP.replace(".myshopify.com", "")}`).toString("base64").replace(/=+$/, "");

const b