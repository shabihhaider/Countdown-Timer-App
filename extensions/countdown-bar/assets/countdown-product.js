"use strict";
(function () {
  "use strict";
  function S() {
    const t = document.querySelectorAll(".cdp");
    t.length &&
      t.forEach(function (e) {
        e.dataset.cdpInit || ((e.dataset.cdpInit = "1"), E(e));
      });
  }
  (document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", S) : S(),
    document.addEventListener("shopify:section:load", function () {
      (document.querySelectorAll(".cdp").forEach(function (e) {
        delete e.dataset.cdpInit;
      }),
        S());
    }));
  function E(t) {
    const e = t.dataset.shop || "",
      o = t.dataset.showLabel !== "false",
      s = t.dataset.showIcon !== "false",
      n = {
        fontSize: t.dataset.fontSize || "14",
        borderRadius: t.dataset.borderRadius || "",
        padding: t.dataset.padding || "",
        alignment: t.dataset.alignment || "left",
      };
    (n.fontSize && (t.style.fontSize = n.fontSize + "px"),
      n.alignment !== "left" && t.classList.add("cdp--align-" + n.alignment));
    const c = t.dataset.apiUrl || "",
      d = t.dataset.productHandle || "",
      i = t.dataset.collectionHandles || "",
      u = t.dataset.productTags || "";
    let p = c
      ? c + "/apps/countdown/settings?shop=" + encodeURIComponent(e) + "&type=product_timer"
      : "/apps/countdown/settings?shop=" + encodeURIComponent(e) + "&type=product_timer";
    (d && (p += "&product=" + encodeURIComponent(d)),
      i && (p += "&collections=" + encodeURIComponent(i)),
      u && (p += "&tags=" + encodeURIComponent(u)),
      fetch(p, { headers: { Accept: "application/json" } })
        .then(function (l) {
          if (!l.ok) throw new Error("HTTP " + l.status);
          return l.json();
        })
        .then(function (l) {
          if (!l.success || !l.settings) return;
          const a = l.settings,
            f = a.productStyle || "minimal",
            m = a.textColor || "#333333",
            h = a.accentColor || "#dc2626",
            y = a.barColor || "",
            w = a.labelText || "Sale ends in";
          if (
            (t.classList.add("cdp--" + f),
            (t.style.color = m),
            y && (t.style.backgroundColor = y),
            n.borderRadius && (t.style.borderRadius = n.borderRadius + "px"),
            n.padding && (t.style.padding = n.padding + "px"),
            t.querySelectorAll(".cdp__value").forEach(function (r) {
              r.style.color = h;
            }),
            o)
          ) {
            const r = t.querySelector(".cdp__label");
            r && (r.textContent = w);
          }
          if (a.barIcon && s) {
            const r = t.querySelector(".cdp__icon");
            r && ((r.textContent = a.barIcon), (r.style.display = ""));
          }
          if (
            a.fontFamily &&
            a.fontFamily !== "system" &&
            a.fontFamily !== "inherit" &&
            a.fontFamily.indexOf(",") === -1
          ) {
            const r = "cdp-font-" + a.fontFamily.replace(/\s+/g, "-");
            if (!document.getElementById(r)) {
              const T = document.createElement("link");
              ((T.id = r),
                (T.rel = "stylesheet"),
                (T.href =
                  "https://fonts.googleapis.com/css2?family=" +
                  encodeURIComponent(a.fontFamily) +
                  ":wght@400;600;700&display=swap"),
                document.head.appendChild(T));
            }
            t.style.fontFamily = a.fontFamily + ", sans-serif";
          }
          b(t, a);
        })
        .catch(function () {}));
  }
  function b(t, e) {
    const o = D(e);
    if (!o) {
      C(t, e);
      return;
    }
    if (o <= Date.now()) {
      C(t, e);
      return;
    }
    ((t.style.display = ""), v(t.dataset.shop, "impression", t.dataset.apiUrl, e.id));
    const s = t.querySelector(".cdp__days"),
      n = t.querySelector(".cdp__hours"),
      c = t.querySelector(".cdp__mins"),
      d = t.querySelector(".cdp__secs"),
      i = t.querySelector(".cdp__sr");
    let u = -1;
    function p() {
      const a = o - Date.now();
      if (a <= 0) {
        (clearInterval(l), C(t, e));
        return;
      }
      const f = Math.floor(a / 1e3),
        m = Math.floor(f / 86400),
        h = Math.floor((f % 86400) / 3600),
        y = Math.floor((f % 3600) / 60),
        w = f % 60;
      (s && (s.textContent = g(m)),
        n && (n.textContent = g(h)),
        c && (c.textContent = g(y)),
        d && (d.textContent = g(w)));
      const _ = Math.floor(f / 60);
      if (i && _ !== u) {
        u = _;
        const r = e.labelText || "Sale ends in";
        i.textContent = r + " " + (m > 0 ? m + " days, " : "") + h + " hours, " + y + " minutes.";
      }
    }
    const l = setInterval(p, 1e3);
    (p(),
      window.addEventListener("pagehide", function () {
        clearInterval(l);
      }));
  }
  function C(t, e) {
    if (e.endAction === "show_ended") {
      t.innerHTML = "";
      const o = document.createElement("span");
      ((o.className = "cdp__ended"),
        (o.textContent = "Sale ended"),
        t.appendChild(o),
        (t.style.display = ""));
    } else if (e.endAction === "show_custom" && e.customEndMessage) {
      t.innerHTML = "";
      const o = document.createElement("span");
      ((o.className = "cdp__ended"),
        (o.textContent = e.customEndMessage),
        t.appendChild(o),
        (t.style.display = ""));
    } else t.style.display = "none";
  }
  function D(t) {
    const e = t.timerType || "one_time";
    if (e === "daily") {
      const s = t.dailyResetTime || "00:00",
        n = new Date(),
        d = n.toLocaleDateString("en-CA", { timeZone: t.timezone || "UTC" }) + "T" + s + ":00";
      let i = I(d, t.timezone || "UTC");
      if (i <= Date.now()) {
        const u = new Date(n.getTime() + 864e5).toLocaleDateString("en-CA", {
          timeZone: t.timezone || "UTC",
        });
        i = I(u + "T" + s + ":00", t.timezone || "UTC");
      }
      return i;
    }
    if (e === "evergreen") {
      const s = "cdp_eg_" + (t.id || "") + "_" + (t.shop || "");
      let n = parseInt(t.evergreenMinutes, 10);
      Number.isFinite(n) || (n = 30);
      const c = localStorage.getItem(s);
      if (c) {
        const i = parseInt(c, 10);
        return i > Date.now() ? i : null;
      }
      const d = Date.now() + n * 60 * 1e3;
      return (localStorage.setItem(s, String(d)), d);
    }
    const o = t.endDate ? new Date(t.endDate) : null;
    return !o || isNaN(o.getTime()) ? null : o.getTime();
  }
  function I(t, e) {
    try {
      const o = new Intl.DateTimeFormat("en-US", {
          timeZone: e,
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: !1,
        }).formatToParts(new Date(t + "Z")),
        s = {};
      o.forEach(function (i) {
        i.type !== "literal" && (s[i.type] = parseInt(i.value, 10));
      });
      const n = new Date(t + "Z"),
        d =
          new Date(
            Date.UTC(s.year, s.month - 1, s.day, s.hour, s.minute, s.second || 0)
          ).getTime() - n.getTime();
      return n.getTime() - d;
    } catch (o) {
      return new Date(t).getTime();
    }
  }
  function v(t, e, o, s) {
    try {
      const n = (o || "") + "/apps/countdown/track",
        c = JSON.stringify({ shop: t, event: e, campaignId: s || null });
      navigator.sendBeacon
        ? navigator.sendBeacon(n, c)
        : fetch(n, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: c,
            keepalive: !0,
          }).catch(function () {});
    } catch (n) {}
  }
  function g(t) {
    return t < 10 ? "0" + t : String(t);
  }
})();
