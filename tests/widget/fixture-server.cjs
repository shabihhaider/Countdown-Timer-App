// Local theme fixture + mock settings API for the countdown-bar extension.
// Liquid is EMULATED by string substitution (not rendered by Shopify).
const http = require("http"),
  fs = require("fs"),
  path = require("path");
const EXT = path.resolve(__dirname, "../../extensions/countdown-bar"),
  PORT = +process.env.WIDGET_FIXTURE_PORT || 3199;
const scen = new Map();
let tracks = [];
let settingsHits = [];
const cors = { "Access-Control-Allow-Origin": "*" };
function renderBlock(name, q) {
  let s = fs.readFileSync(path.join(EXT, "blocks", name + ".liquid"), "utf8").replace(/\r/g, "");
  s = s.replace(/\{% schema %\}[\s\S]*$/, "");
  const api = q.get("api") || "";
  const map = {
    "shop.permanent_domain": "fixture.myshopify.com",
    "shop.metafields.countdown_timer.api_url.value": api,
    "block.settings.font_size": "14",
    "block.settings.bar_padding": "10",
    "block.settings.border_radius": "8",
    "block.settings.padding": "10",
    "block.settings.alignment": "left",
    "block.settings.show_label": "true",
    "block.settings.show_icon": "true",
    "product.handle": "test-shirt",
    "product.collections | map: 'handle' | join: ','": "summer,sale",
    "product.tags | join: ','": "tag-a",
    "block.settings.message | escape": "Complete your order within",
    "block.settings.reservation_minutes": q.get("minutes") || "10",
    "block.settings.expiry_action": q.get("expiry") || "hide",
    "block.settings.redirect_url | escape": q.get("redirect") || "",
    "block.settings.text_color": "#991b1b",
    "block.settings.bg_color": "#fef2f2",
    "block.settings.accent_color": "#b91c1c",
  };
  s = s.replace(
    /\{% if block\.settings\.show_stock_alert %\}[\s\S]*?\{% endif %\}\s*\{% endif %\}\s*\{% endif %\}/,
    ""
  );
  s = s.replace(/\{%-?[^%]*%\}/g, "");
  return s.replace(/\{\{\s*(.*?)\s*\}\}/g, (m, k) => (k in map ? map[k] : ""));
}
function page(q) {
  const blocks = (q.get("blocks") || "bar").split(",");
  const css = blocks.map((b) => `<link rel=stylesheet href="/assets/countdown-${b}.css">`).join("");
  const sticky = q.get("sticky") ? "position:sticky;top:0;" : "";
  return `<!doctype html><html lang=en><head><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><title>Fixture store</title>${css}
<style>body{margin:0;font-family:system-ui}header{${sticky}background:#fff;border-bottom:1px solid #ddd;padding:16px;font-weight:600;z-index:10}main{padding:16px;max-width:900px;margin:auto}.h{height:${q.get("tall") ? 2000 : 0}px}</style></head>
<body><header>Fixture Store</header><main><h1>Test Shirt</h1><p>$20.00</p>
${blocks.includes("product") ? renderBlock("countdown-product", q) : ""}
${blocks.includes("cart") ? renderBlock("countdown-cart", q) : ""}
<button>Add to cart</button><div class=h></div></main>
${blocks.includes("bar") ? renderBlock("countdown-bar", q) : ""}
${blocks.map((b) => `<script defer src="/assets/countdown-${b}.js"></script>`).join("")}
</body></html>`;
}
http
  .createServer((req, res) => {
    const u = new URL(req.url, "http://x");
    const q = u.searchParams;
    let m;
    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        ...cors,
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Allow-Methods": "*",
      });
      return res.end();
    }
    if (u.pathname === "/__set") {
      let b = "";
      req.on("data", (c) => (b += c));
      req.on("end", () => {
        const o = JSON.parse(b);
        scen.set(o.name, o);
        res.end("ok");
      });
      return;
    }
    if (u.pathname === "/__tracks") {
      res.end(JSON.stringify({ tracks, settingsHits }));
      return;
    }
    if (u.pathname === "/__reset") {
      tracks = [];
      settingsHits = [];
      res.end("ok");
      return;
    }
    if (u.pathname === "/page") {
      res.writeHead(200, { "content-type": "text/html" });
      return res.end(page(q));
    }
    if ((m = u.pathname.match(/^\/assets\/(.+)$/))) {
      const f = path.join(EXT, "assets", m[1]);
      res.writeHead(200, { "content-type": f.endsWith(".css") ? "text/css" : "text/javascript" });
      return res.end(fs.readFileSync(f));
    }
    if (u.pathname === "/cart/clear.js") {
      tracks.push({ event: "CART_CLEAR" });
      res.writeHead(200, { "content-type": "application/json" });
      return res.end("{}");
    }
    const api = u.pathname.match(/^(?:\/s\/([^/]+))?\/apps\/countdown\/(settings|track)$/);
    if (api) {
      const name = api[1] || "default";
      if (api[2] === "track") {
        let b = "";
        req.on("data", (c) => (b += c));
        req.on("end", () => {
          tracks.push({ ...JSON.parse(b || "{}"), ct: req.headers["content-type"] });
          res.writeHead(200, cors);
          res.end("{}");
        });
        return;
      }
      settingsHits.push({ name, url: req.url });
      const stored = scen.get(name) || {
        status: 200,
        body: { success: false, message: "No active campaign found" },
      };
      // { sequence: [replyA, replyB] } answers in order, then repeats the last reply.
      const o = stored.sequence
        ? stored.sequence.length > 1
          ? stored.sequence.shift()
          : stored.sequence[0]
        : stored;
      return setTimeout(() => {
        res.writeHead(o.status || 200, {
          ...cors,
          "Access-Control-Expose-Headers": "Retry-After",
          ...(o.headers || {}),
          "content-type": o.raw ? "text/html" : "application/json",
        });
        res.end(o.raw || JSON.stringify(o.body));
      }, o.delayMs || 0);
    }
    res.writeHead(404);
    res.end("nf");
  })
  .listen(PORT, () => console.log("fixture on", PORT));
