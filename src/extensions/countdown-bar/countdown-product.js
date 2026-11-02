(function () {
  "use strict";

  // All attempts share this budget, as in the bar widget.
  const SETTINGS_BUDGET_MS = 5000;
  const RETRY_BASE_MS = 800;
  const RETRY_JITTER_MS = 300;
  const MAX_RETRIES = 2;
  const LAST_KNOWN_MAX_AGE_MS = 86400000;

  function init() {
    const timers = document.querySelectorAll(".cdp");
    if (!timers.length) return;
    timers.forEach(function (timer) {
      if (timer.dataset.cdpInit) return;
      timer.dataset.cdpInit = "1";
      initProductTimer(timer);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // The reloaded section is new DOM without the init flag; timers elsewhere on
  // the page are already running and must not be started a second time.
  document.addEventListener("shopify:section:load", init);

  function initProductTimer(el) {
    const shop = el.dataset.shop || "";
    const showLabel = el.dataset.showLabel !== "false";
    const showIcon = el.dataset.showIcon !== "false";

    const theme = {
      fontSize: el.dataset.fontSize || "14",
      borderRadius: el.dataset.borderRadius || "",
      padding: el.dataset.padding || "",
      alignment: el.dataset.alignment || "left",
    };

    if (theme.fontSize) el.style.fontSize = theme.fontSize + "px";
    if (theme.alignment !== "left") el.classList.add("cdp--align-" + theme.alignment);

    const apiBase = el.dataset.apiUrl || "";
    const productHandle = el.dataset.productHandle || "";
    const collectionHandles = el.dataset.collectionHandles || "";
    const productTags = el.dataset.productTags || "";
    // Shopify adds a signed shop to the relative path, so it must not carry one too.
    let settingsUrl = apiBase
      ? apiBase +
        "/apps/countdown/settings?shop=" +
        encodeURIComponent(shop) +
        "&type=product_timer"
      : "/apps/countdown/settings?type=product_timer";
    if (productHandle) settingsUrl += "&product=" + encodeURIComponent(productHandle);
    if (collectionHandles) settingsUrl += "&collections=" + encodeURIComponent(collectionHandles);
    if (productTags) settingsUrl += "&tags=" + encodeURIComponent(productTags);

    const startedAt = Date.now();
    const lastKnownKey = "cdp_s_" + shop + "_" + productHandle;
    let rendered = false;

    function readLastKnown() {
      try {
        const saved = JSON.parse(localStorage.getItem(lastKnownKey) || "null");
        return saved && saved.s && Date.now() - saved.t < LAST_KNOWN_MAX_AGE_MS ? saved.s : null;
      } catch (e) {
        return null;
      }
    }

    function saveLastKnown(s) {
      try {
        localStorage.setItem(lastKnownKey, s ? JSON.stringify({ t: Date.now(), s: s }) : "");
      } catch (e) {
        /* best-effort */
      }
    }

    function onSettingsFailure(err, attempt) {
      const timedOut = !!err && err.name === "AbortError";
      const lastKnown = timedOut ? null : readLastKnown();
      if (lastKnown) render(lastKnown);

      const status = err && err.status;
      if (timedOut || attempt >= MAX_RETRIES || (status && status < 500 && status !== 429)) return;
      const delay =
        err.retryAfter > 0
          ? err.retryAfter * 1000
          : RETRY_BASE_MS * Math.pow(2, attempt) + Math.random() * RETRY_JITTER_MS;
      if (Date.now() - startedAt + delay >= SETTINGS_BUDGET_MS) return;
      setTimeout(function () {
        loadSettings(attempt + 1);
      }, delay);
    }

    function loadSettings(attempt) {
      const abort = typeof AbortController === "function" ? new AbortController() : null;
      const timer =
        abort &&
        setTimeout(
          function () {
            abort.abort();
          },
          SETTINGS_BUDGET_MS - (Date.now() - startedAt)
        );

      fetch(settingsUrl, {
        headers: { Accept: "application/json" },
        signal: abort ? abort.signal : undefined,
      })
        .then(function (res) {
          if (!res.ok) {
            const err = new Error("HTTP " + res.status);
            err.status = res.status;
            err.retryAfter = parseInt(res.headers.get("Retry-After"), 10);
            throw err;
          }
          return res.json();
        })
        .then(function (data) {
          clearTimeout(timer);
          const hasCampaign = data.success && data.settings;
          saveLastKnown(hasCampaign ? data.settings : null);
          if (hasCampaign) render(data.settings);
        })
        .catch(function (err) {
          clearTimeout(timer);
          onSettingsFailure(err, attempt);
        });
    }

    function render(s) {
      if (!rendered) {
        rendered = true;
        renderTimer(s);
      }
    }

    function renderTimer(s) {
      const style = s.productStyle || "minimal";
      const textColor = s.textColor || "#333333";
      const accentColor = s.accentColor || "#dc2626";
      const bgColor = s.barColor || "";
      const labelText = s.labelText || "Sale ends in";

      el.classList.add("cdp--" + style);
      el.style.color = textColor;
      if (bgColor) el.style.backgroundColor = bgColor;
      if (theme.borderRadius) el.style.borderRadius = theme.borderRadius + "px";
      if (theme.padding) el.style.padding = theme.padding + "px";

      const values = el.querySelectorAll(".cdp__value");
      values.forEach(function (v) {
        v.style.color = accentColor;
      });

      if (showLabel) {
        const labelEl = el.querySelector(".cdp__label");
        if (labelEl) labelEl.textContent = labelText;
      }

      if (s.barIcon && showIcon) {
        const iconEl = el.querySelector(".cdp__icon");
        if (iconEl) {
          iconEl.textContent = s.barIcon;
          iconEl.style.display = "";
        }
      }

      if (
        s.fontFamily &&
        s.fontFamily !== "system" &&
        s.fontFamily !== "inherit" &&
        s.fontFamily.indexOf(",") === -1
      ) {
        const fontId = "cdp-font-" + s.fontFamily.replace(/\s+/g, "-");
        if (!document.getElementById(fontId)) {
          const link = document.createElement("link");
          link.id = fontId;
          link.rel = "stylesheet";
          link.href =
            "https://fonts.googleapis.com/css2?family=" +
            encodeURIComponent(s.fontFamily) +
            ":wght@400;600;700&display=swap";
          document.head.appendChild(link);
        }
        el.style.fontFamily = s.fontFamily + ", sans-serif";
      }

      startTimer(el, s);
    }

    loadSettings(0);
  }

  function startTimer(el, s) {
    const endMs = computeEndMs(s);

    if (!endMs) {
      handleEnd(el, s);
      return;
    }

    if (endMs <= Date.now()) {
      handleEnd(el, s);
      return;
    }

    el.style.display = "";

    fireTrack(el.dataset.shop, "impression", el.dataset.apiUrl, s.id);

    const daysEl = el.querySelector(".cdp__days");
    const hoursEl = el.querySelector(".cdp__hours");
    const minsEl = el.querySelector(".cdp__mins");
    const secsEl = el.querySelector(".cdp__secs");
    const srEl = el.querySelector(".cdp__sr");

    let lastSrAnnounce = -1;

    function tick() {
      const dist = endMs - Date.now();
      if (dist <= 0) {
        clearInterval(intervalId);
        handleEnd(el, s);
        return;
      }

      const totalSecs = Math.floor(dist / 1000);
      const days = Math.floor(totalSecs / 86400);
      const hours = Math.floor((totalSecs % 86400) / 3600);
      const mins = Math.floor((totalSecs % 3600) / 60);
      const secs = totalSecs % 60;

      if (daysEl) daysEl.textContent = pad(days);
      if (hoursEl) hoursEl.textContent = pad(hours);
      if (minsEl) minsEl.textContent = pad(mins);
      if (secsEl) secsEl.textContent = pad(secs);

      const minuteBucket = Math.floor(totalSecs / 60);
      if (srEl && minuteBucket !== lastSrAnnounce) {
        lastSrAnnounce = minuteBucket;
        const label = s.labelText || "Sale ends in";
        srEl.textContent =
          label +
          " " +
          (days > 0 ? days + " days, " : "") +
          hours +
          " hours, " +
          mins +
          " minutes.";
      }
    }

    const intervalId = setInterval(tick, 1000);
    tick();

    window.addEventListener("pagehide", function () {
      clearInterval(intervalId);
    });
  }

  function handleEnd(el, s) {
    if (s.endAction === "show_ended") {
      el.innerHTML = "";
      const endedSpan = document.createElement("span");
      endedSpan.className = "cdp__ended";
      endedSpan.textContent = "Sale ended";
      el.appendChild(endedSpan);
      el.style.display = "";
    } else if (s.endAction === "show_custom" && s.customEndMessage) {
      el.innerHTML = "";
      const msgSpan = document.createElement("span");
      msgSpan.className = "cdp__ended";
      msgSpan.textContent = s.customEndMessage;
      el.appendChild(msgSpan);
      el.style.display = "";
    } else {
      el.style.display = "none";
    }
  }

  function computeEndMs(s) {
    const timerType = s.timerType || "one_time";

    if (timerType === "daily") {
      const resetTime = s.dailyResetTime || "00:00";
      const now = new Date();
      const todayStr = now.toLocaleDateString("en-CA", { timeZone: s.timezone || "UTC" });
      const resetStr = todayStr + "T" + resetTime + ":00";

      let resetMs = localToUtcMs(resetStr, s.timezone || "UTC");
      if (resetMs <= Date.now()) {
        const tomorrowStr = new Date(now.getTime() + 86400000).toLocaleDateString("en-CA", {
          timeZone: s.timezone || "UTC",
        });
        resetMs = localToUtcMs(tomorrowStr + "T" + resetTime + ":00", s.timezone || "UTC");
      }
      return resetMs;
    }

    if (timerType === "evergreen") {
      const evergreenKey = "cdp_eg_" + (s.id || "") + "_" + (s.shop || "");
      let minutes = parseInt(s.evergreenMinutes, 10);
      if (!Number.isFinite(minutes)) minutes = 30;
      const stored = localStorage.getItem(evergreenKey);

      if (stored) {
        const storedMs = parseInt(stored, 10);
        if (storedMs > Date.now()) return storedMs;
        return null;
      }

      const endMs = Date.now() + minutes * 60 * 1000;
      localStorage.setItem(evergreenKey, String(endMs));
      return endMs;
    }

    const endDate = s.endDate ? new Date(s.endDate) : null;
    if (!endDate || isNaN(endDate.getTime())) return null;
    return endDate.getTime();
  }

  function tzOffsetMs(utcMs, timezone) {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date(utcMs));

    const map = {};
    parts.forEach(function (p) {
      if (p.type !== "literal") map[p.type] = parseInt(p.value, 10);
    });

    return (
      Date.UTC(map.year, map.month - 1, map.day, map.hour, map.minute, map.second || 0) - utcMs
    );
  }

  function localToUtcMs(localStr, timezone) {
    try {
      // The offset must be read at the target instant, not at the wall clock
      // treated as UTC: the two can fall on opposite sides of a DST change.
      const wallMs = new Date(localStr + "Z").getTime();
      const approxMs = wallMs - tzOffsetMs(wallMs, timezone);
      return wallMs - tzOffsetMs(approxMs, timezone);
    } catch (e) {
      return new Date(localStr).getTime();
    }
  }

  function fireTrack(shop, event, apiBase, campaignId) {
    try {
      const trackUrl = (apiBase || "") + "/apps/countdown/track";
      const payload = JSON.stringify({ shop: shop, event: event, campaignId: campaignId || null });
      if (navigator.sendBeacon) {
        navigator.sendBeacon(trackUrl, payload);
      } else {
        fetch(trackUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
          keepalive: true,
        }).catch(function () {});
      }
    } catch (e) {}
  }

  function pad(n) {
    return n < 10 ? "0" + n : String(n);
  }
})();
