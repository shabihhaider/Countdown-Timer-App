import { test, expect, type Page } from "@playwright/test";
import * as fs from "fs";
import { createRequire } from "module";

// Widget suite: real built assets in a local page; Liquid is emulated by string
// substitution in fixture-server.cjs, so this does not prove behaviour on a real theme.
// Run: npm run test:widget (uses the built assets, so run npm run build:extensions first).
const require = createRequire(import.meta.url);
const API = `http://localhost:${process.env.WIDGET_FIXTURE_PORT || 3199}`;
// eslint-disable-next-line security/detect-non-literal-fs-filename -- resolved package path
const axe = fs.readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");
let n = 0;
async function set(o: any) {
  const name = "s" + ++n + Date.now();
  await fetch(API + "/__set", { method: "POST", body: JSON.stringify({ name, ...o }) });
  return `${API}/s/${name}`;
}
const camp = (x: any = {}) => ({
  status: 200,
  body: {
    success: true,
    settings: {
      id: "c1",
      barMessage: "Flash sale ends in",
      buttonText: "Shop now",
      buttonUrl: "/collections/all",
      discountCode: "SAVE10",
      timerType: "one_time",
      endDate: new Date(Date.now() + 3 * 86400000 + 5000).toISOString(),
      timezone: "UTC",
      barColor: "#237f37",
      textColor: "#ffffff",
      barPosition: "top",
      endAction: "hide",
      productStyle: "minimal",
      accentColor: "#dc2626",
      labelText: "Sale ends in",
      ...x,
    },
  },
});
function url(q: Record<string, string>) {
  return "/page?" + new URLSearchParams(q).toString();
}
function errs(p: Page) {
  const e: string[] = [];
  p.on("pageerror", (x) => e.push(x.message));
  return e;
}
const barVisible = (p: Page) => p.locator("#cdb-bar").isVisible();
const axeRun = async (page: Page, sel: string) => {
  await page.addScriptTag({ content: axe });
  const r: any = await page.evaluate(async (s) => (window as any).axe.run(s), sel);
  return r.violations.map(
    (x: any) =>
      `${x.id}/${x.impact}: ${x.nodes.map((n: any) => n.target + " " + (n.any[0]?.message || "")).join(" | ")}`
  );
};
test.beforeEach(async () => {
  await fetch(API + "/__reset");
});

test.describe("bar", () => {
  for (const [w, h] of [
    [320, 640],
    [768, 1024],
    [1440, 900],
  ]) {
    test(`renders, ticks, no overflow at ${w}`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: h });
      const e = errs(page);
      const api = await set(camp());
      await page.goto(url({ blocks: "bar", api }));
      await expect(page.locator("#cdb-bar")).toBeVisible();
      const a = await page.locator("#cdb-secs").textContent();
      await page.waitForTimeout(2200);
      const b = await page.locator("#cdb-secs").textContent();
      expect(a).not.toBe(b);
      await page.waitForTimeout(500);
      const o = await page.evaluate(() => ({
        sw: document.documentElement.scrollWidth,
        cw: document.documentElement.clientWidth,
        barW: document.getElementById("cdb-bar")!.scrollWidth,
        barCW: document.getElementById("cdb-bar")!.clientWidth,
        barH: document.getElementById("cdb-bar")!.offsetHeight,
        spacer: document.getElementById("cdb-spacer")?.offsetHeight,
      }));
      console.log("METRIC", w, JSON.stringify(o));
      expect(o.sw).toBeLessThanOrEqual(o.cw);
      expect(o.barW).toBeLessThanOrEqual(o.barCW);
      expect(e).toEqual([]);
    });
  }
  test("tap targets >= 44 at 320 (project rule says 48)", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto(url({ blocks: "bar", api: await set(camp()) }));
    await expect(page.locator("#cdb-bar")).toBeVisible();
    const s = await page.evaluate(() =>
      ["#cdb-close", ".cdb__code-copy", "#cdb-btn"].map((q) => {
        const r = document.querySelector(q)!.getBoundingClientRect();
        return { q, w: r.width, h: r.height };
      })
    );
    console.log("METRIC tap", JSON.stringify(s));
    for (const t of s) {
      expect(t.w, t.q).toBeGreaterThanOrEqual(44);
      expect(t.h, t.q).toBeGreaterThanOrEqual(44);
    }
  });
  test("axe on bar", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(url({ blocks: "bar", api: await set(camp()) }));
    await expect(page.locator("#cdb-bar")).toBeVisible();
    await page.waitForTimeout(600);
    const v = await axeRun(page, "#cdb-bar");
    console.log("METRIC axe", JSON.stringify(v, null, 1));
    expect(v).toEqual([]);
  });
  test("keyboard: close, copy and CTA reachable; order sane", async ({ page }) => {
    await page.goto(url({ blocks: "bar", api: await set(camp()) }));
    await expect(page.locator("#cdb-bar")).toBeVisible();
    const seen: string[] = [];
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press("Tab");
      seen.push(
        await page.evaluate(
          () =>
            document.activeElement!.id ||
            document.activeElement!.className ||
            document.activeElement!.tagName
        )
      );
    }
    console.log("METRIC tab", seen.join(" > "));
    expect(seen).toContain("cdb-close");
    expect(seen).toContain("cdb-btn");
    expect(seen).toContain("cdb__code-copy");
  });
  test("impression tracked once as beacon with campaign id", async ({ page }) => {
    await page.goto(url({ blocks: "bar", api: await set(camp()) }));
    await expect(page.locator("#cdb-bar")).toBeVisible();
    await page.waitForTimeout(500);
    const t = (await (await fetch(API + "/__tracks")).json()).tracks;
    console.log("METRIC tracks", JSON.stringify(t));
    expect(t.filter((x: any) => x.event === "impression").length).toBe(1);
    expect(t[0].campaignId).toBe("c1");
  });
  test("close persists for session and fires close", async ({ page }) => {
    await page.goto(url({ blocks: "bar", api: await set(camp()) }));
    await page.locator("#cdb-close").click();
    await expect(page.locator("#cdb-bar")).toBeHidden();
    expect(await page.locator("#cdb-spacer").count()).toBe(0);
    await page.reload();
    await page.waitForTimeout(400);
    expect(await barVisible(page)).toBe(false);
    const t = (await (await fetch(API + "/__tracks")).json()).tracks;
    expect(t.some((x: any) => x.event === "close")).toBe(true);
  });
  for (const ea of ["hide", "show_ended", "show_custom"]) {
    test(`live expiry endAction=${ea}`, async ({ page }) => {
      const e = errs(page);
      await page.goto(
        url({
          blocks: "bar",
          api: await set(
            camp({
              endDate: new Date(Date.now() + 3000).toISOString(),
              endAction: ea,
              customEndMessage: "Back soon",
            })
          ),
        })
      );
      await expect(page.locator("#cdb-bar")).toBeVisible();
      await page.waitForTimeout(3500);
      const st = await page.evaluate(() => {
        const vis = (q: string) => {
          const el = document.querySelector(q) as HTMLElement | null;
          return !!el && el.getClientRects().length > 0;
        };
        return {
          bar: (document.getElementById("cdb-bar") as HTMLElement).style.display,
          msg: document.querySelector(".cdb__message")!.textContent,
          timer: vis("#cdb-timer"),
          cta: vis("#cdb-btn"),
          code: vis(".cdb__code"),
          spacer: !!document.getElementById("cdb-spacer"),
        };
      });
      console.log("METRIC end", ea, JSON.stringify(st));
      expect(e).toEqual([]);
      if (ea === "hide") {
        expect(st.bar).toBe("none");
        expect(st.spacer).toBe(false);
      } else {
        expect(st.bar).toBe("block");
        expect(st.timer).toBe(false);
        expect(st.spacer).toBe(true);
        expect(st.msg).toBe(ea === "show_ended" ? "Sale Ended" : "Back soon");
        expect(st.code, "discount code should not be offered after the sale ended").toBe(false);
      }
    });
  }
  test("product timer fallback leaves the shop to the app proxy", async ({ page }) => {
    await fetch(API + "/__set", {
      method: "POST",
      body: JSON.stringify({ name: "default", ...camp() }),
    });
    await page.goto(url({ blocks: "product" }));
    await expect(page.locator(".cdp__value").first()).toBeVisible();
    const h = (await (await fetch(API + "/__tracks")).json()).settingsHits;
    const hit = h.find((x: { url: string }) => x.url.includes("type=product_timer"));
    expect(hit.url.startsWith("/apps/countdown/settings?type=product_timer")).toBe(true);
    expect(new URL(hit.url, API).searchParams.has("shop")).toBe(false);
  });
  test("missing api_url uses relative app proxy path", async ({ page }) => {
    await fetch(API + "/__set", {
      method: "POST",
      body: JSON.stringify({ name: "default", ...camp() }),
    });
    await page.goto(url({ blocks: "bar" }));
    await expect(page.locator("#cdb-bar")).toBeVisible();
    const h = (await (await fetch(API + "/__tracks")).json()).settingsHits;
    console.log("METRIC relative", JSON.stringify(h));
    // The proxy adds a signed shop itself; sending one too would make it ambiguous.
    expect(h[0].url).toBe("/apps/countdown/settings?type=bar");
    await fetch(API + "/__set", {
      method: "POST",
      body: JSON.stringify({
        name: "default",
        status: 200,
        body: { success: false, message: "No active campaign found" },
      }),
    });
  });
  const bad: [string, () => Promise<string>][] = [
    ["dead url", async () => "http://localhost:3999"],
    ["503", () => set({ status: 503, body: { error: "x" } })],
    ["429", () => set({ status: 429, body: { success: false, error: "Too many requests" } })],
    ["500 html", () => set({ status: 500, raw: "<h1>oops</h1>" })],
    ["200 malformed", () => set({ status: 200, raw: "<html>not json" })],
    [
      "no campaign",
      () => set({ status: 200, body: { success: false, message: "No active campaign found" } }),
    ],
  ];
  for (const [name, mk] of bad) {
    for (const block of ["bar", "product"]) {
      test(`${block}: ${name} stays silently hidden, no spacer, no page error`, async ({
        page,
      }) => {
        const e = errs(page);
        await page.addInitScript(() =>
          sessionStorage.setItem(
            "cdb_h_fixture.myshopify.com",
            JSON.stringify({ h: 60, pos: "top" })
          )
        );
        await page.goto(url({ blocks: block, api: await mk() }));
        await page.waitForTimeout(700);
        expect(await page.locator(block === "bar" ? "#cdb-bar" : ".cdp").isVisible()).toBe(false);
        // Refused connections can take over 2s on Windows, so wait rather than sample.
        await expect(page.locator("#cdb-spacer")).toHaveCount(0, { timeout: 5000 });
        expect(e).toEqual([]);
        await page.locator("button", { hasText: "Add to cart" }).click();
      });
    }
  }
  test("hung API does not block page; bar arrives late, CLS measured", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await page.addInitScript(() => {
      (window as any).__cls = 0;
      new PerformanceObserver((l) => {
        for (const x of l.getEntries() as any) (window as any).__cls += x.value;
      }).observe({ type: "layout-shift", buffered: true });
    });
    await page.goto(url({ blocks: "bar", api: await set({ ...camp(), delayMs: 1500 }) }));
    await expect(page.locator("h1")).toBeVisible();
    expect(await barVisible(page)).toBe(false);
    await expect(page.locator("#cdb-bar")).toBeVisible();
    await page.waitForTimeout(800);
    const cls = await page.evaluate(() => (window as any).__cls);
    console.log("METRIC cls-first-view", cls);
    expect(cls).toBeLessThan(0.1);
  });
  test("API slower than the timeout leaves the bar hidden and the spacer gone", async ({
    page,
  }) => {
    await page.addInitScript(() =>
      sessionStorage.setItem("cdb_h_fixture.myshopify.com", JSON.stringify({ h: 80, pos: "top" }))
    );
    await page.goto(url({ blocks: "bar", api: await set({ ...camp(), delayMs: 7000 }) }));
    await page.waitForTimeout(6000);
    expect(await barVisible(page)).toBe(false);
    expect(await page.evaluate(() => !!document.getElementById("cdb-spacer"))).toBe(false);
  });
  test("sticky header not covered by fixed bar after scroll", async ({ page }) => {
    await page.goto(url({ blocks: "bar", sticky: "1", tall: "1", api: await set(camp()) }));
    await expect(page.locator("#cdb-bar")).toBeVisible();
    await page.mouse.wheel(0, 800);
    await page.waitForTimeout(500);
    const r = await page.evaluate(() => {
      const h = document.querySelector("header")!.getBoundingClientRect(),
        b = document.getElementById("cdb-bar")!.getBoundingClientRect();
      return { headerTop: h.top, headerBottom: h.bottom, barBottom: b.bottom };
    });
    console.log("METRIC sticky", JSON.stringify(r));
    expect(r.headerTop).toBeGreaterThanOrEqual(r.barBottom - 1);
  });
  test("reduced motion disables animation", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(url({ blocks: "bar", api: await set(camp({ animationStyle: "flip" })) }));
    await expect(page.locator("#cdb-bar")).toBeVisible();
    await page.waitForTimeout(1200);
    const r = await page.evaluate(() => ({
      bar: getComputedStyle(document.getElementById("cdb-bar")!).animationName,
      sec: getComputedStyle(document.getElementById("cdb-secs")!).animationName,
    }));
    console.log("METRIC rm", JSON.stringify(r));
    expect(r.bar).toBe("none");
    expect(r.sec).toBe("none");
  });
  test("hostile content stays inert", async ({ page }) => {
    const e = errs(page);
    let fired = false;
    page.on("dialog", (d) => {
      fired = true;
      d.dismiss();
    });
    await page.goto(
      url({
        blocks: "bar",
        api: await set(
          camp({
            barMessage: "<img src=x onerror=alert(1)>",
            discountCode: "<b>x</b>",
            buttonUrl: " JavaScript:alert(1)",
          })
        ),
      })
    );
    await expect(page.locator("#cdb-bar")).toBeVisible();
    expect(await page.locator("#cdb-bar img").count()).toBe(0);
    expect(await page.locator("#cdb-btn").isVisible()).toBe(false);
    expect(fired).toBe(false);
    expect(e).toEqual([]);
  });
  test("page targeting exclude hides", async ({ page }) => {
    await page.goto(
      url({
        blocks: "bar",
        api: await set(
          camp({ pageTargeting: JSON.stringify({ mode: "exclude", patterns: ["/page"] }) })
        ),
      })
    );
    await page.waitForTimeout(600);
    expect(await barVisible(page)).toBe(false);
  });
  test("blocked storage: no uncaught page error and bar still shows", async ({ page }) => {
    const e = errs(page);
    await page.addInitScript(() => {
      Object.defineProperty(window, "sessionStorage", {
        get() {
          throw new DOMException("denied", "SecurityError");
        },
      });
      Object.defineProperty(window, "localStorage", {
        get() {
          throw new DOMException("denied", "SecurityError");
        },
      });
    });
    await page.goto(url({ blocks: "bar", api: await set(camp()) }));
    await page.waitForTimeout(700);
    console.log("METRIC storage", await barVisible(page), JSON.stringify(e));
    expect(e).toEqual([]);
    expect(await barVisible(page)).toBe(true);
  });
});

test.describe("daily reset timers", () => {
  // Fixed clock 2026-10-31T12:00:00Z. Expected = seconds until the next local reset.
  const cases: [string, string, string, number][] = [
    ["UTC", "00:00", "default values", 12 * 3600],
    ["UTC", "00:30", "first hour of day", 12.5 * 3600],
    ["UTC", "12:30", "control", 1800],
    ["UTC", "23:00", "control", 11 * 3600],
    [
      "America/New_York",
      "04:00",
      "offset lands on 00:xx; next reset is after DST end, 09:00Z",
      21 * 3600,
    ],
    ["America/New_York", "00:00", "control", 16 * 3600],
    ["Asia/Karachi", "19:00", "offset lands on 00:xx (+5)", 2 * 3600],
    ["Asia/Karachi", "00:00", "control", 7 * 3600],
    ["Asia/Kolkata", "05:30", "+5:30", 12 * 3600],
    [
      "America/New_York",
      "03:00",
      "next reset falls after DST end on Nov 1 (expected 08:00Z)",
      20 * 3600,
    ],
  ];
  for (const block of ["bar", "product"])
    for (const [tz, rt, why, secs] of cases) {
      test(`${block} ${tz} reset ${rt} (${why})`, async ({ page }) => {
        await page.clock.setFixedTime(new Date("2026-10-31T12:00:00Z"));
        await page.goto(
          url({
            blocks: block,
            api: await set(
              camp({ timerType: "daily", dailyResetTime: rt, timezone: tz, endDate: null })
            ),
          })
        );
        await page.waitForTimeout(1300);
        const sel = block === "bar" ? "#cdb-bar" : ".cdp";
        const vis = await page.locator(sel).isVisible();
        const txt =
          block === "bar"
            ? await page.evaluate(() =>
                ["cdb-days", "cdb-hours", "cdb-mins", "cdb-secs"].map(
                  (i) => +document.getElementById(i)!.textContent!
                )
              )
            : await page.evaluate(() =>
                [".cdp__days", ".cdp__hours", ".cdp__mins", ".cdp__secs"].map(
                  (i) => +document.querySelector(i)!.textContent!
                )
              );
        const got = txt[0] * 86400 + txt[1] * 3600 + txt[2] * 60 + txt[3];
        console.log(
          "METRIC daily",
          block,
          tz,
          rt,
          "visible",
          vis,
          "shown",
          txt.join(":"),
          "expectSecs",
          secs,
          "gotSecs",
          got
        );
        expect(vis, "timer should be visible").toBe(true);
        expect(Math.abs(got - secs)).toBeLessThanOrEqual(2);
      });
    }
});

test.describe("evergreen", () => {
  for (const block of ["bar", "product"]) {
    test(`${block}: reload after expiry behaviour`, async ({ page }) => {
      const api = await set(camp({ timerType: "evergreen", evergreenMinutes: 1, endDate: null }));
      await page.goto(url({ blocks: block, api }));
      await page.waitForTimeout(500);
      const key = await page.evaluate(() =>
        Object.keys(localStorage).find((k) => k.includes("_eg_"))
      );
      console.log("METRIC evergreen key", block, key);
      await page.evaluate((k) => localStorage.setItem(k!, String(Date.now() - 1000)), key);
      await page.reload();
      await page.waitForTimeout(500);
      const v = await page.locator(block === "bar" ? "#cdb-bar" : ".cdp").isVisible();
      const left = +(await page.evaluate((k) => localStorage.getItem(k!), key))! - Date.now();
      console.log("METRIC evergreen after-expiry", block, "visible", v, "storedMsLeft", left);
      expect(v, "expired evergreen must not restart").toBe(false);
    });
  }
});

test.describe("product block", () => {
  for (const w of [320, 768, 1440])
    test(`renders + ticks at ${w}`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: 800 });
      const e = errs(page);
      await page.goto(url({ blocks: "product", api: await set(camp({ barIcon: "T" })) }));
      await expect(page.locator(".cdp")).toBeVisible();
      const a = await page.locator(".cdp__secs").textContent();
      await page.waitForTimeout(2200);
      expect(await page.locator(".cdp__secs").textContent()).not.toBe(a);
      const o = await page.evaluate(() => ({
        sw: document.documentElement.scrollWidth,
        cw: document.documentElement.clientWidth,
      }));
      expect(o.sw).toBeLessThanOrEqual(o.cw);
      expect(e).toEqual([]);
      const h = (await (await fetch(API + "/__tracks")).json()).settingsHits;
      console.log("METRIC prod url", h[0].url);
    });
  for (const ea of ["hide", "show_ended", "show_custom"])
    test(`live expiry ${ea}`, async ({ page }) => {
      await page.goto(
        url({
          blocks: "product",
          api: await set(
            camp({
              endDate: new Date(Date.now() + 2500).toISOString(),
              endAction: ea,
              customEndMessage: "Back soon",
            })
          ),
        })
      );
      await expect(page.locator(".cdp")).toBeVisible();
      await page.waitForTimeout(3200);
      const t = await page.evaluate(() => {
        const e = document.querySelector(".cdp") as HTMLElement;
        return { d: e.style.display, t: e.textContent!.trim(), role: e.getAttribute("role") };
      });
      console.log("METRIC prod end", ea, JSON.stringify(t));
      if (ea === "hide") expect(t.d).toBe("none");
      else expect(t.t).toBe(ea === "show_ended" ? "Sale ended" : "Back soon");
    });
  test("axe on product block", async ({ page }) => {
    await page.goto(
      url({
        blocks: "product",
        api: await set(camp({ barColor: "", textColor: "", accentColor: "" })),
      })
    );
    await expect(page.locator(".cdp")).toBeVisible();
    const v = await axeRun(page, ".cdp");
    console.log("METRIC axe-prod", JSON.stringify(v, null, 1));
    expect(v).toEqual([]);
  });
  test("theme-editor section reload does not double-count impressions", async ({ page }) => {
    await page.goto(url({ blocks: "product", api: await set(camp()) }));
    await expect(page.locator(".cdp")).toBeVisible();
    await page.evaluate(() => document.dispatchEvent(new CustomEvent("shopify:section:load")));
    await page.waitForTimeout(500);
    const t = (await (await fetch(API + "/__tracks")).json()).tracks.filter(
      (x: any) => x.event === "impression"
    );
    console.log("METRIC section-load impressions", t.length);
    expect(t.length).toBe(1);
  });
});

test.describe("cart block", () => {
  for (const w of [320, 1440])
    test(`renders + ticks, no API call, at ${w}`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: 700 });
      const reqs: string[] = [];
      page.on("request", (r) => reqs.push(r.url()));
      await page.goto(url({ blocks: "cart", api: "http://localhost:3999" }));
      await expect(page.locator(".cdc")).toBeVisible();
      await expect(page.locator(".cdc__mins")).toHaveText("09");
      const a = await page.locator(".cdc__secs").textContent();
      await page.waitForTimeout(1500);
      expect(await page.locator(".cdc__secs").textContent()).not.toBe(a);
      console.log("METRIC cart network", JSON.stringify(reqs));
      expect(reqs.some((r) => r.startsWith("http://localhost:3999"))).toBe(false);
    });
  const preExpired = (p: Page) =>
    p.addInitScript(() => {
      if (!sessionStorage.getItem("__seeded")) {
        sessionStorage.setItem("__seeded", "1");
        sessionStorage.setItem("cdc_cart_fixture.myshopify.com", String(Date.now() - 1000));
      }
    });
  test("expiry hide: reload does not restart the reservation", async ({ page }) => {
    await preExpired(page);
    await page.goto(url({ blocks: "cart" }));
    await page.waitForTimeout(300);
    expect(await page.locator(".cdc").isVisible()).toBe(false);
    await page.reload();
    await page.waitForTimeout(300);
    const v = await page.locator(".cdc").isVisible();
    console.log(
      "METRIC cart reload-after-expiry visible",
      v,
      await page.locator(".cdc__mins").textContent()
    );
    expect(v, "expired reservation should not silently restart").toBe(false);
  });
  test("expiry clear_cart posts /cart/clear.js and reloads", async ({ page }) => {
    await preExpired(page);
    const reqs: string[] = [];
    page.on("request", (r) => {
      if (r.url().includes("/cart/clear.js")) reqs.push(r.method());
    });
    let navs = 0;
    page.on("framenavigated", () => navs++);
    await page.goto(url({ blocks: "cart", expiry: "clear_cart" }));
    await page.waitForTimeout(800);
    console.log("METRIC cart clear", reqs.join(), "navs", navs);
    expect(reqs).toEqual(["POST"]);
    expect(navs).toBeGreaterThanOrEqual(2);
  });
  test("expiry redirect goes to configured URL", async ({ page }) => {
    await preExpired(page);
    await page.goto(url({ blocks: "cart", expiry: "redirect", redirect: "/collections/all" }));
    await page.waitForTimeout(500);
    expect(new URL(page.url()).pathname).toBe("/collections/all");
  });
  test("axe on cart block", async ({ page }) => {
    await page.goto(url({ blocks: "cart" }));
    await expect(page.locator(".cdc")).toBeVisible();
    const v = await axeRun(page, ".cdc");
    console.log("METRIC axe-cart", JSON.stringify(v, null, 1));
    expect(v).toEqual([]);
  });
  test("blocked storage does not raise uncaught error", async ({ page }) => {
    const e = errs(page);
    await page.addInitScript(() => {
      Object.defineProperty(window, "sessionStorage", {
        get() {
          throw new DOMException("denied", "SecurityError");
        },
      });
    });
    await page.goto(url({ blocks: "cart" }));
    await page.waitForTimeout(300);
    console.log("METRIC cart-storage", JSON.stringify(e));
    expect(e).toEqual([]);
  });
});

test.describe("settings API failures (B7)", () => {
  const SHOP = "fixture.myshopify.com";
  const seedLastKnown = (page: Page, key: string, settings: any, ageMs = 0) =>
    page.addInitScript(
      ([k, v]) => {
        if (!sessionStorage.getItem("seeded")) {
          localStorage.setItem(k as string, v as string);
          sessionStorage.setItem("seeded", "1");
        }
      },
      [key, JSON.stringify({ t: Date.now() - ageMs, s: settings })]
    );
  const hits = async () => (await (await fetch(API + "/__tracks")).json()).settingsHits;

  for (const [name, reply] of [
    ["429", { status: 429, body: { success: false } }],
    ["503", { status: 503, body: { success: false } }],
  ] as const) {
    test(`bar stays up on ${name} using last-known settings`, async ({ page }) => {
      const e = errs(page);
      await seedLastKnown(page, "cdb_s_" + SHOP, camp({ barMessage: "Remembered" }).body.settings);
      await page.goto(url({ blocks: "bar", api: await set(reply) }));
      await expect(page.locator("#cdb-bar")).toBeVisible();
      await expect(page.locator(".cdb__message")).toContainText("Remembered");
      expect(e).toEqual([]);
    });

    test(`product timer stays up on ${name} using last-known settings`, async ({ page }) => {
      await seedLastKnown(page, "cdp_s_" + SHOP + "_test-shirt", camp().body.settings);
      await page.goto(url({ blocks: "product", api: await set(reply) }));
      await expect(page.locator(".cdp")).toBeVisible();
    });
  }

  test("last-known settings older than a day are not used", async ({ page }) => {
    const old = 25 * 3600 * 1000;
    await seedLastKnown(page, "cdb_s_" + SHOP, camp().body.settings, old);
    await page.goto(url({ blocks: "bar", api: await set({ status: 503, body: {} }) }));
    await page.waitForTimeout(700);
    expect(await barVisible(page)).toBe(false);
  });

  test("first-time visitor recovers through a retry after a 503", async ({ page }) => {
    const api = await set({ sequence: [{ status: 503, body: {} }, camp()] });
    await page.goto(url({ blocks: "bar", api }));
    await expect(page.locator("#cdb-bar")).toBeVisible({ timeout: 4000 });
    expect((await hits()).length).toBe(2);
  });

  test("product timer recovers through a retry after a 429", async ({ page }) => {
    const api = await set({ sequence: [{ status: 429, body: {} }, camp()] });
    await page.goto(url({ blocks: "product", api }));
    await expect(page.locator(".cdp")).toBeVisible({ timeout: 4000 });
  });

  test("a persistent failure stops after the retry limit", async ({ page }) => {
    await page.goto(url({ blocks: "bar", api: await set({ status: 503, body: {} }) }));
    await page.waitForTimeout(4500);
    expect((await hits()).length).toBe(3);
    expect(await barVisible(page)).toBe(false);
  });

  test("a 400 is not retried", async ({ page }) => {
    await page.goto(url({ blocks: "bar", api: await set({ status: 400, body: {} }) }));
    await page.waitForTimeout(1500);
    expect((await hits()).length).toBe(1);
  });

  test("Retry-After beyond the page budget is respected: no early retry", async ({ page }) => {
    const reply = { status: 429, headers: { "Retry-After": "60" }, body: {} };
    await page.goto(url({ blocks: "bar", api: await set(reply) }));
    await page.waitForTimeout(1500);
    expect((await hits()).length).toBe(1);
  });

  test("a successful load is remembered for the next failure", async ({ page }) => {
    await page.goto(url({ blocks: "bar", api: await set(camp({ barMessage: "Saved" })) }));
    await expect(page.locator("#cdb-bar")).toBeVisible();
    await page.goto(url({ blocks: "bar", api: await set({ status: 429, body: {} }) }));
    await expect(page.locator(".cdb__message")).toContainText("Saved");
  });

  test("a confirmed no-campaign reply clears the remembered campaign", async ({ page }) => {
    await page.goto(url({ blocks: "bar", api: await set(camp()) }));
    await expect(page.locator("#cdb-bar")).toBeVisible();
    const none = await set({ status: 200, body: { success: false } });
    await page.goto(url({ blocks: "bar", api: none }));
    await page.waitForTimeout(300);
    await page.goto(url({ blocks: "bar", api: await set({ status: 503, body: {} }) }));
    await page.waitForTimeout(700);
    expect(await barVisible(page)).toBe(false);
  });
});

test("bar stays pinned on a theme without a sticky header", async ({ page }) => {
  await page.goto(url({ blocks: "bar", tall: "1", api: await set(camp()) }));
  await expect(page.locator("#cdb-bar")).toBeVisible();
  await page.mouse.wheel(0, 800);
  await page.waitForTimeout(500);
  const top = await page.evaluate(
    () => document.getElementById("cdb-bar")!.getBoundingClientRect().top
  );
  expect(top).toBe(0);
});
