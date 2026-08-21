"use strict";
(function () {
  "use strict";
  const i = document.getElementById("cdb-bar");
  if (!i) return;
  const m = i.getAttribute("data-shop") || "",
    p = { fontSize: i.dataset.fontSize || null, barPadding: i.dataset.barPadding || null },
    _ = "cdb_closed_" + m;
  if (sessionStorage.getItem(_) === "1") return;
  let l = null,
    S = null;
  const T = document.getElementById("cdb-close");
  T &&
    T.addEventListener("click", function () {
      ((i.style.display = "none"),
        h(),
        l && (cancelAnimationFrame(l), (l = null)),
        sessionStorage.setItem(_, "1"),
        C("close"));
    });
  const b = i.dataset.apiUrl || "",
    U = b
      ? b + "/apps/countdown/settings?shop=" + encodeURIComponent(m) + "&type=bar"
      : "/apps/countdown/settings?shop=" + encodeURIComponent(m) + "&type=bar";
  fetch(U, { headers: { Accept: "application/json" } })
    .then(function (t) {
      if (!t.ok) throw new Error(t.status);
      return t.json();
    })
    .then(function (t) {
      t.success && t.settings && W(t.settings);
    })
    .catch(function () {});
  function v(t, e) {
    try {
      const n = new Intl.DateTimeFormat("en-US", {
          timeZone: e,
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: !1,
        }).formatToParts(new Date(t + "Z")),
        o = {};
      n.forEach(function (r) {
        r.type !== "literal" && (o[r.type] = parseInt(r.value, 10));
      });
      const c = new Date(t + "Z"),
        a =
          new Date(
            Date.UTC(o.year, o.month - 1, o.day, o.hour, o.minute, o.second || 0)
          ).getTime() - c.getTime();
      return c.getTime() - a;
    } catch (n) {
      return new Date(t).getTime();
    }
  }
  function L(t) {
    const e = t.timerType || "one_time";
    if (e === "daily") {
      const o = t.dailyResetTime || "00:00",
        c = new Date(),
        a = c.toLocaleDateString("en-CA", { timeZone: t.timezone || "UTC" }) + "T" + o + ":00";
      let r = v(a, t.timezone || "UTC");
      if (r <= Date.now()) {
        const s = new Date(c.getTime() + 864e5).toLocaleDateString("en-CA", {
          timeZone: t.timezone || "UTC",
        });
        r = v(s + "T" + o + ":00", t.timezone || "UTC");
      }
      return r;
    }
    if (e === "evergreen") {
      const o = "cdb_eg_" + (t.id || "") + "_" + m,
        c = parseInt(t.evergreenMinutes, 10) || 30,
        d = localStorage.getItem(o);
      if (d) {
        const r = parseInt(d, 10);
        if (r > Date.now()) return r;
        const u = Date.now() + c * 6e4;
        return (localStorage.setItem(o, String(u)), u);
      }
      const a = Date.now() + c * 6e4;
      return (localStorage.setItem(o, String(a)), a);
    }
    const n = t.endDate ? new Date(t.endDate) : null;
    return !n || isNaN(n.getTime()) ? null : n.getTime();
  }
  function z(t) {
    if (!t.pageTargeting) return !0;
    try {
      const e = typeof t.pageTargeting == "string" ? JSON.parse(t.pageTargeting) : t.pageTargeting;
      if (!e.mode || e.mode === "all") return !0;
      const n = window.location.pathname.toLowerCase(),
        o = e.patterns || [];
      if (!o.length) return !0;
      const c = o.some(function (d) {
        const a = d.toLowerCase();
        return a === n ? !0 : a.endsWith("/*") ? n.startsWith(a.slice(0, -1)) : !1;
      });
      return e.mode === "include" ? c : !c;
    } catch (e) {
      return !0;
    }
  }
  function N(t, e) {
    if (!t.backgroundStyle) {
      i.style.backgroundColor = e;
      return;
    }
    try {
      const n =
        typeof t.backgroundStyle == "string" ? JSON.parse(t.backgroundStyle) : t.backgroundStyle;
      n.type === "gradient" && n.colorStops
        ? (i.style.background =
            "linear-gradient(" + (n.direction || "to right") + ", " + n.colorStops.join(", ") + ")")
        : (i.style.backgroundColor = e);
    } catch (n) {
      i.style.backgroundColor = e;
    }
  }
  function P(t) {
    if (
      (t.fontFamily &&
        t.fontFamily !== "system" &&
        (i.style.fontFamily = t.fontFamily === "inherit" ? "inherit" : t.fontFamily),
      p.fontSize)
    ) {
      const e = i.querySelector(".cdb__message");
      e && (e.style.fontSize = p.fontSize + "px");
    }
    p.barPadding &&
      ((i.style.paddingTop = p.barPadding + "px"), (i.style.paddingBottom = p.barPadding + "px"));
  }
  function q(t) {
    const e = i.querySelector(".cdb__message");
    if (e && ((e.textContent = t.barMessage || "Flash Sale Ends In..."), t.barIcon)) {
      const n = document.createElement("span");
      ((n.className = "cdb__icon"),
        n.setAttribute("aria-hidden", "true"),
        (n.textContent = t.barIcon),
        e.insertBefore(n, e.firstChild));
    }
  }
  function R(t) {
    if (
      !t.fontFamily ||
      t.fontFamily === "system" ||
      t.fontFamily === "inherit" ||
      t.fontFamily.indexOf(",") !== -1
    )
      return;
    const e = "cdb-font-" + t.fontFamily.replace(/\s+/g, "-");
    if (document.getElementById(e)) return;
    const n = document.createElement("link");
    ((n.id = e),
      (n.rel = "stylesheet"),
      (n.href =
        "https://fonts.googleapis.com/css2?family=" +
        encodeURIComponent(t.fontFamily) +
        ":wght@400;600;700&display=swap"),
      document.head.appendChild(n));
  }
  function j(t) {
    if (!t.discountCode) return;
    const e = document.createElement("span");
    e.className = "cdb__code";
    const n = document.createElement("span");
    ((n.className = "cdb__code-text"), (n.textContent = t.discountCode));
    const o = document.createElement("button");
    ((o.className = "cdb__code-copy"),
      (o.type = "button"),
      o.setAttribute("aria-label", "Copy discount code"),
      (o.textContent = "Copy"),
      e.appendChild(n),
      e.appendChild(o),
      o.addEventListener("click", function (a) {
        (a.preventDefault(), a.stopPropagation());
        const r = function () {
            ((o.textContent = "Copied!"),
              setTimeout(function () {
                o.textContent = "Copy";
              }, 2e3));
          },
          u = function () {
            try {
              const s = document.createElement("textarea");
              ((s.value = t.discountCode),
                s.setAttribute("readonly", ""),
                (s.style.position = "absolute"),
                (s.style.left = "-9999px"),
                document.body.appendChild(s),
                s.select(),
                document.execCommand("copy"),
                document.body.removeChild(s),
                r());
            } catch (s) {}
          };
        navigator.clipboard && navigator.clipboard.writeText
          ? navigator.clipboard.writeText(t.discountCode).then(r).catch(u)
          : u();
      }));
    const c = i.querySelector(".cdb__content"),
      d = document.getElementById("cdb-btn");
    c && d ? c.insertBefore(e, d) : c && c.appendChild(e);
  }
  function O(t) {
    const e = document.getElementById("cdb-btn");
    if (!e) return;
    const n = (t.buttonUrl || "").trim();
    !t.buttonText ||
      !n ||
      n.toLowerCase().startsWith("javascript:") ||
      n.toLowerCase().startsWith("data:") ||
      ((e.textContent = t.buttonText),
      (e.href = n),
      (e.style.display = ""),
      (e.style.color = t.buttonTextColor || "#111111"),
      (e.style.backgroundColor = t.buttonBgColor || "#ffffff"),
      e.addEventListener("click", function () {
        C("click");
      }));
  }
  function W(t) {
    if (!z(t)) return;
    S = t.id || null;
    const e = t.barPosition || "top";
    (N(t, t.barColor || "#288d40"),
      (i.style.color = t.textColor || "#ffffff"),
      P(t),
      (i.className = "cdb cdb--" + e),
      q(t),
      R(t),
      j(t),
      O(t));
    const n = L(t);
    if (!n || n <= Date.now()) {
      x(t.endAction, t.customEndMessage);
      return;
    }
    ((i.style.display = "block"),
      I(e),
      C("impression"),
      (i.dataset.animation = t.animationStyle || "none"),
      Z(n, t.endAction, t.customEndMessage, e));
  }
  function x(t, e) {
    const n = document.getElementById("cdb-timer"),
      o = i.querySelector(".cdb__message");
    t === "show_ended"
      ? ((i.style.display = "block"),
        n && (n.style.display = "none"),
        o && (o.textContent = "Sale Ended"))
      : t === "show_custom" && e
        ? ((i.style.display = "block"), n && (n.style.display = "none"), o && (o.textContent = e))
        : ((i.style.display = "none"), h());
  }
  function I(t) {
    if (document.getElementById("cdb-spacer")) return;
    const e = document.createElement("div");
    ((e.id = "cdb-spacer"),
      (e.style.height = i.offsetHeight + "px"),
      (e.style.flexShrink = "0"),
      t === "bottom"
        ? document.body.appendChild(e)
        : document.body.insertBefore(e, document.body.firstChild));
  }
  function h() {
    const t = document.getElementById("cdb-spacer");
    t && t.remove();
  }
  function Z(t, e, n, o) {
    const c = document.getElementById("cdb-days"),
      d = document.getElementById("cdb-hours"),
      a = document.getElementById("cdb-mins"),
      r = document.getElementById("cdb-secs"),
      u = i.querySelector(".cdb__sr-timer");
    let s = -1,
      k = -1,
      B = !1;
    function w() {
      if (B) return;
      const D = t - Date.now();
      if (D <= 0) {
        ((B = !0),
          l && (cancelAnimationFrame(l), (l = null)),
          x(e, n),
          e !== "show_ended" && e !== "show_custom" ? h() : I(o));
        return;
      }
      const f = Math.floor(D / 1e3);
      if (f !== s) {
        s = f;
        const E = Math.floor(f / 86400),
          F = Math.floor((f % 86400) / 3600),
          M = Math.floor((f % 3600) / 60),
          J = f % 60;
        (y(c, g(E)), y(d, g(F)), y(a, g(M)), y(r, g(J)));
        const A = Math.floor(f / 60);
        u &&
          A !== k &&
          ((k = A),
          (u.textContent =
            "Sale ends in " + (E > 0 ? E + " days, " : "") + F + " hours, " + M + " minutes."));
      }
      l = requestAnimationFrame(w);
    }
    (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? w()
      : (l = requestAnimationFrame(w)),
      window.addEventListener("pagehide", function () {
        l && cancelAnimationFrame(l);
      }));
  }
  function C(t) {
    try {
      const e = (b || "") + "/apps/countdown/track",
        n = JSON.stringify({ shop: m, event: t, campaignId: S, type: "bar" });
      navigator.sendBeacon
        ? navigator.sendBeacon(e, n)
        : fetch(e, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: n,
            keepalive: !0,
          }).catch(function () {});
    } catch (e) {}
  }
  function y(t, e) {
    if (!t || t.textContent === e) return;
    t.textContent = e;
    const n = i.dataset.animation;
    n &&
      n !== "none" &&
      (t.classList.remove(
        "cdb__value--fade",
        "cdb__value--slide",
        "cdb__value--flip",
        "cdb__value--bounce",
        "cdb__value--pulse",
        "cdb__value--scale"
      ),
      t.offsetWidth,
      t.classList.add("cdb__value--" + n));
  }
  function g(t) {
    return t < 10 ? "0" + t : String(t);
  }
})();
