(function () {
  "use strict";

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

  document.addEventListener("shopify:section:load", function () {
    const timers = document.querySelectorAll(".cdp");
    timers.forEach(function (timer) {
      delete timer.dataset.cdpInit;
    });
    init();
  });

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
    let settingsUrl = apiBase
      ? apiBase +
        "/apps/countdown/settings?shop=" +
        encodeURIComponent(shop) +
        "&type=product_timer"
      : "/apps/countdown/settings?shop=" + encodeURIComponent(shop) + "&type=product_timer";
    if (productHandle) settingsUrl += "&product=" + encodeURIComponent(productHandle);
    if (collectionHandles) settingsUrl += "&collections=" + encodeURIComponent(collectionHandles);
    if (productTags) settingsUrl += "&tags=" + encodeURIComponent(productTags);

    fetch(settingsUrl, { headers: { Accept: "application/json" } })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (data) {
        if (!data.success || !data.settings) return;
        const s = data.settings;

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
      })
      .catch(function () {});
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
