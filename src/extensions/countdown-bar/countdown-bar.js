(function () {
  "use strict";
  const bar = document.getElementById("cdb-bar");
  if (!bar) return;

  const shop = bar.getAttribute("data-shop") || "";
  const ts = {
    fontSize: bar.dataset.fontSize || null,
    barPadding: bar.dataset.barPadding || null,
  };

  const CK = "cdb_closed_" + shop;
  if (sessionStorage.getItem(CK) === "1") return;

  // Reserve the last-known bar height BEFORE fetching settings so repeat page
  // views don't shift content when the bar arrives (keeps CLS near zero).
  const HK = "cdb_h_" + shop;
  try {
    const cached = JSON.parse(sessionStorage.getItem(HK) || "null");
    if (cached && cached.h > 0) {
      const early = document.createElement("div");
      early.id = "cdb-spacer";
      early.style.flexShrink = "0";
      early.style.height = cached.h + "px";
      if (cached.pos === "bottom") document.body.appendChild(early);
      else document.body.insertBefore(early, document.body.firstChild);
    }
  } catch (e) {
    /* reservation is best-effort */
  }

  let activeRaf = null;
  let activeCampaignId = null;

  const closeBtn = document.getElementById("cdb-close");
  if (closeBtn) {
    closeBtn.addEventListener("click", function () {
      bar.style.display = "none";
      removeSpacer();
      if (activeRaf) {
        cancelAnimationFrame(activeRaf);
        activeRaf = null;
      }
      sessionStorage.setItem(CK, "1");
      track("close");
    });
  }

  const apiBase = bar.dataset.apiUrl || "";
  const settingsUrl = apiBase
    ? apiBase + "/apps/countdown/settings?shop=" + encodeURIComponent(shop) + "&type=bar"
    : "/apps/countdown/settings?shop=" + encodeURIComponent(shop) + "&type=bar";

  fetch(settingsUrl, {
    headers: { Accept: "application/json" },
  })
    .then(function (r) {
      if (!r.ok) throw new Error(r.status);
      return r.json();
    })
    .then(function (d) {
      if (d.success && d.settings) apply(d.settings);
      else removeSpacer();
    })
    .catch(function () {
      removeSpacer();
    });

  function localToUtcMs(localStr, timezone) {
    try {
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }).formatToParts(new Date(localStr + "Z"));

      const map = {};
      parts.forEach(function (p) {
        if (p.type !== "literal") map[p.type] = parseInt(p.value, 10);
      });

      const utcTemp = new Date(localStr + "Z");
      const tzRendered = new Date(
        Date.UTC(map.year, map.month - 1, map.day, map.hour, map.minute, map.second || 0)
      );
      const offsetMs = tzRendered.getTime() - utcTemp.getTime();

      return utcTemp.getTime() - offsetMs;
    } catch (e) {
      return new Date(localStr).getTime();
    }
  }

  function endMs(s) {
    const tt = s.timerType || "one_time";

    if (tt === "daily") {
      const rt = s.dailyResetTime || "00:00";
      const now = new Date();
      const day = now.toLocaleDateString("en-CA", {
        timeZone: s.timezone || "UTC",
      });
      const localStr = day + "T" + rt + ":00";
      let ms = localToUtcMs(localStr, s.timezone || "UTC");
      if (ms <= Date.now()) {
        const nextDay = new Date(now.getTime() + 86400000);
        const nextDayStr = nextDay.toLocaleDateString("en-CA", {
          timeZone: s.timezone || "UTC",
        });
        ms = localToUtcMs(nextDayStr + "T" + rt + ":00", s.timezone || "UTC");
      }
      return ms;
    }

    if (tt === "evergreen") {
      const ek = "cdb_eg_" + (s.id || "") + "_" + shop;
      const mins = parseInt(s.evergreenMinutes, 10) || 30;
      const stored = localStorage.getItem(ek);
      if (stored) {
        const sv = parseInt(stored, 10);
        if (sv > Date.now()) return sv;
        const fresh = Date.now() + mins * 60000;
        localStorage.setItem(ek, String(fresh));
        return fresh;
      }
      const ev = Date.now() + mins * 60000;
      localStorage.setItem(ek, String(ev));
      return ev;
    }

    const ed = s.endDate ? new Date(s.endDate) : null;
    if (!ed || isNaN(ed.getTime())) return null;
    return ed.getTime();
  }

  function pageMatch(s) {
    if (!s.pageTargeting) return true;
    try {
      const t = typeof s.pageTargeting === "string" ? JSON.parse(s.pageTargeting) : s.pageTargeting;
      if (!t.mode || t.mode === "all") return true;
      const p = window.location.pathname.toLowerCase();
      const pts = t.patterns || [];
      if (!pts.length) return true;
      const hit = pts.some(function (pt) {
        const lpt = pt.toLowerCase();
        if (lpt === p) return true;
        if (lpt.endsWith("/*")) return p.startsWith(lpt.slice(0, -1));
        return false;
      });
      return t.mode === "include" ? hit : !hit;
    } catch (e) {
      return true;
    }
  }

  function applyBackground(s, fallbackColor) {
    if (!s.backgroundStyle) {
      bar.style.backgroundColor = fallbackColor;
      return;
    }
    try {
      const bs =
        typeof s.backgroundStyle === "string" ? JSON.parse(s.backgroundStyle) : s.backgroundStyle;
      if (bs.type === "gradient" && bs.colorStops) {
        bar.style.background =
          "linear-gradient(" + (bs.direction || "to right") + ", " + bs.colorStops.join(", ") + ")";
      } else {
        bar.style.backgroundColor = fallbackColor;
      }
    } catch (e) {
      bar.style.backgroundColor = fallbackColor;
    }
  }

  function applyTypography(s) {
    if (s.fontFamily && s.fontFamily !== "system") {
      bar.style.fontFamily = s.fontFamily === "inherit" ? "inherit" : s.fontFamily;
    }
    if (ts.fontSize) {
      const me = bar.querySelector(".cdb__message");
      if (me) me.style.fontSize = ts.fontSize + "px";
    }
    if (ts.barPadding) {
      bar.style.paddingTop = ts.barPadding + "px";
      bar.style.paddingBottom = ts.barPadding + "px";
    }
  }

  function applyMessage(s) {
    const msgEl = bar.querySelector(".cdb__message");
    if (!msgEl) return;
    msgEl.textContent = s.barMessage || "Flash Sale Ends In...";
    if (s.barIcon) {
      const iconEl = document.createElement("span");
      iconEl.className = "cdb__icon";
      iconEl.setAttribute("aria-hidden", "true");
      iconEl.textContent = s.barIcon;
      msgEl.insertBefore(iconEl, msgEl.firstChild);
    }
  }

  function loadGoogleFont(s) {
    if (
      !s.fontFamily ||
      s.fontFamily === "system" ||
      s.fontFamily === "inherit" ||
      s.fontFamily.indexOf(",") !== -1
    ) {
      return;
    }
    const fontId = "cdb-font-" + s.fontFamily.replace(/\s+/g, "-");
    if (document.getElementById(fontId)) return;
    const link = document.createElement("link");
    link.id = fontId;
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=" +
      encodeURIComponent(s.fontFamily) +
      ":wght@400;600;700&display=swap";
    document.head.appendChild(link);
  }

  function buildDiscountCode(s) {
    if (!s.discountCode) return;
    const codeEl = document.createElement("span");
    codeEl.className = "cdb__code";
    const ctEl = document.createElement("span");
    ctEl.className = "cdb__code-text";
    ctEl.textContent = s.discountCode;
    const cpBtn = document.createElement("button");
    cpBtn.className = "cdb__code-copy";
    cpBtn.type = "button";
    cpBtn.setAttribute("aria-label", "Copy discount code");
    cpBtn.textContent = "Copy";
    codeEl.appendChild(ctEl);
    codeEl.appendChild(cpBtn);
    cpBtn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      const showCopied = function () {
        cpBtn.textContent = "Copied!";
        setTimeout(function () {
          cpBtn.textContent = "Copy";
        }, 2000);
      };
      // Fallback for contexts where the async Clipboard API is unavailable
      // or rejects (permissions policy, older browsers, embedded frames).
      const fallbackCopy = function () {
        try {
          const ta = document.createElement("textarea");
          ta.value = s.discountCode;
          ta.setAttribute("readonly", "");
          ta.style.position = "absolute";
          ta.style.left = "-9999px";
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          document.body.removeChild(ta);
          showCopied();
        } catch (err) {
          /* leave the button as-is; never break the storefront */
        }
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(s.discountCode).then(showCopied).catch(fallbackCopy);
      } else {
        fallbackCopy();
      }
    });
    const cont = bar.querySelector(".cdb__content");
    const bEl = document.getElementById("cdb-btn");
    if (cont && bEl) cont.insertBefore(codeEl, bEl);
    else if (cont) cont.appendChild(codeEl);
  }

  function setupButton(s) {
    const btnEl = document.getElementById("cdb-btn");
    if (!btnEl) return;
    const url = (s.buttonUrl || "").trim();
    if (
      !s.buttonText ||
      !url ||
      // eslint-disable-next-line no-script-url -- literal used to REJECT dangerous schemes
      url.toLowerCase().startsWith("javascript:") ||
      url.toLowerCase().startsWith("data:")
    ) {
      return;
    }
    btnEl.textContent = s.buttonText;
    btnEl.href = url;
    btnEl.style.display = "";
    btnEl.style.color = s.buttonTextColor || "#111111";
    btnEl.style.backgroundColor = s.buttonBgColor || "#ffffff";
    btnEl.addEventListener("click", function () {
      track("click");
    });
  }

  function apply(s) {
    if (!pageMatch(s)) {
      removeSpacer();
      return;
    }
    activeCampaignId = s.id || null;

    const pos = s.barPosition || "top";

    applyBackground(s, s.barColor || "#288d40");
    bar.style.color = s.textColor || "#ffffff";
    applyTypography(s);
    bar.className = "cdb cdb--" + pos;
    applyMessage(s);
    loadGoogleFont(s);
    buildDiscountCode(s);
    setupButton(s);

    const end = endMs(s);
    if (!end || end <= Date.now()) {
      handleEnd(s.endAction, s.customEndMessage);
      return;
    }

    bar.style.display = "block";
    addSpacer(pos);
    track("impression");
    bar.dataset.animation = s.animationStyle || "none";
    countdown(end, s.endAction, s.customEndMessage, pos);
  }

  function handleEnd(ea, cm) {
    const tEl = document.getElementById("cdb-timer");
    const mMsg = bar.querySelector(".cdb__message");
    if (ea === "show_ended") {
      bar.style.display = "block";
      if (tEl) tEl.style.display = "none";
      if (mMsg) mMsg.textContent = "Sale Ended";
    } else if (ea === "show_custom" && cm) {
      bar.style.display = "block";
      if (tEl) tEl.style.display = "none";
      if (mMsg) mMsg.textContent = cm;
    } else {
      bar.style.display = "none";
      removeSpacer();
    }
  }

  function addSpacer(pos) {
    let spacer = document.getElementById("cdb-spacer");
    if (!spacer) {
      spacer = document.createElement("div");
      spacer.id = "cdb-spacer";
      spacer.style.flexShrink = "0";
    }
    spacer.style.height = bar.offsetHeight + "px";
    // appendChild / insertBefore MOVE an existing node, so this also corrects
    // the position when a pre-reserved spacer was placed for the other edge.
    if (pos === "bottom") {
      document.body.appendChild(spacer);
    } else {
      document.body.insertBefore(spacer, document.body.firstChild);
    }
    try {
      sessionStorage.setItem(HK, JSON.stringify({ h: bar.offsetHeight, pos: pos }));
    } catch (e) {
      /* caching is best-effort */
    }
  }

  function removeSpacer() {
    const spacer = document.getElementById("cdb-spacer");
    if (spacer) spacer.remove();
    try {
      sessionStorage.removeItem(HK);
    } catch (e) {
      /* best-effort */
    }
  }

  function countdown(end, ea, cm, pos) {
    const dEl = document.getElementById("cdb-days");
    const hEl = document.getElementById("cdb-hours");
    const mEl = document.getElementById("cdb-mins");
    const sEl = document.getElementById("cdb-secs");
    const srEl = bar.querySelector(".cdb__sr-timer");
    let last = -1,
      lastSr = -1,
      done = false;

    function tick() {
      if (done) return;
      const diff = end - Date.now();
      if (diff <= 0) {
        done = true;
        if (activeRaf) {
          cancelAnimationFrame(activeRaf);
          activeRaf = null;
        }
        handleEnd(ea, cm);
        if (ea !== "show_ended" && ea !== "show_custom") removeSpacer();
        else addSpacer(pos);
        return;
      }
      const tot = Math.floor(diff / 1000);
      if (tot !== last) {
        last = tot;
        const d = Math.floor(tot / 86400);
        const h = Math.floor((tot % 86400) / 3600);
        const m = Math.floor((tot % 3600) / 60);
        const sc = tot % 60;
        digit(dEl, pad(d));
        digit(hEl, pad(h));
        digit(mEl, pad(m));
        digit(sEl, pad(sc));
        const mb = Math.floor(tot / 60);
        if (srEl && mb !== lastSr) {
          lastSr = mb;
          srEl.textContent =
            "Sale ends in " + (d > 0 ? d + " days, " : "") + h + " hours, " + m + " minutes.";
        }
      }
      activeRaf = requestAnimationFrame(tick);
    }

    const rm = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (rm) tick();
    else activeRaf = requestAnimationFrame(tick);
    window.addEventListener("pagehide", function () {
      if (activeRaf) cancelAnimationFrame(activeRaf);
    });
  }

  function track(ev) {
    try {
      const trackUrl = (apiBase || "") + "/apps/countdown/track";
      const p = JSON.stringify({
        shop: shop,
        event: ev,
        campaignId: activeCampaignId,
        type: "bar",
      });
      if (navigator.sendBeacon) navigator.sendBeacon(trackUrl, p);
      else
        fetch(trackUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: p,
          keepalive: true,
        }).catch(function () {});
    } catch (e) {}
  }

  function digit(el, v) {
    if (!el || el.textContent === v) return;
    el.textContent = v;
    const a = bar.dataset.animation;
    if (a && a !== "none") {
      el.classList.remove(
        "cdb__value--fade",
        "cdb__value--slide",
        "cdb__value--flip",
        "cdb__value--bounce",
        "cdb__value--pulse",
        "cdb__value--scale"
      );
      void el.offsetWidth;
      el.classList.add("cdb__value--" + a);
    }
  }

  function pad(n) {
    return n < 10 ? "0" + n : String(n);
  }
})();
