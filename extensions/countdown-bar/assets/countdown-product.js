(function () {
  "use strict";

  // Find all product timer instances on the page
  const timers = document.querySelectorAll(".cdp");
  if (!timers.length) return;

  timers.forEach(function (timer) {
    initProductTimer(timer);
  });

  function initProductTimer(el) {
    const shop = el.dataset.shop || "";
    const style = el.dataset.style || "minimal";
    const textColor = el.dataset.textColor || "#333333";
    const accentColor = el.dataset.accentColor || "#dc2626";
    const bgColor = el.dataset.bgColor || "";
    const fontSize = el.dataset.fontSize || "14";
    const showLabel = el.dataset.showLabel !== "false";

    // Apply style class
    el.classList.add("cdp--" + style);

    // Apply colors
    el.style.color = textColor;
    el.style.fontSize = fontSize + "px";
    if (bgColor) {
      el.style.backgroundColor = bgColor;
    }

    // Accent color for digits
    const values = el.querySelectorAll(".cdp__value");
    values.forEach(function (v) {
      v.style.color = accentColor;
    });

    // Fetch campaign settings
    fetch("/apps/countdown/settings?shop=" + encodeURIComponent(shop), {
      headers: { Accept: "application/json" },
    })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (data) {
        if (!data.success || !data.settings) return;
        startTimer(el, data.settings);
      })
      .catch(function () {
        // Fail silently — never break the product page
      });
  }

  function startTimer(el, s) {
    const endMs = computeEndMs(s);
    if (!endMs) return;

    // Show the timer
    el.style.display = "";

    // Track impression
    fireTrack(el.dataset.shop, "impression");

    const daysEl = el.querySelector(".cdp__days");
    const hoursEl = el.querySelector(".cdp__hours");
    const minsEl = el.querySelector(".cdp__mins");
    const secsEl = el.querySelector(".cdp__secs");
    const srEl = el.querySelector(".cdp__sr");

    let lastSec = -1;
    let lastSrAnnounce = -1;
    let rafId;
    let ended = false;

    function tick() {
      if (ended) return;

      const dist = endMs - Date.now();
      if (dist <= 0) {
        ended = true;
        el.style.display = "none";
        return;
      }

      const totalSecs = Math.floor(dist / 1000);
      if (totalSecs !== lastSec) {
        lastSec = totalSecs;

        const days = Math.floor(totalSecs / 86400);
        const hours = Math.floor((totalSecs % 86400) / 3600);
        const mins = Math.floor((totalSecs % 3600) / 60);
        const secs = totalSecs % 60;

        if (daysEl) daysEl.textContent = pad(days);
        if (hoursEl) hoursEl.textContent = pad(hours);
        if (minsEl) minsEl.textContent = pad(mins);
        if (secsEl) secsEl.textContent = pad(secs);

        // Screen reader announcement every 60s
        const minuteBucket = Math.floor(totalSecs / 60);
        if (srEl && minuteBucket !== lastSrAnnounce) {
          lastSrAnnounce = minuteBucket;
          srEl.textContent =
            "Sale ends in " +
            (days > 0 ? days + " days, " : "") +
            hours +
            " hours, " +
            mins +
            " minutes.";
        }
      }

      rafId = requestAnimationFrame(tick);
    }

    // Respect reduced motion
    const prefersReducedMotion =
      window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) {
      tick();
    } else {
      rafId = requestAnimationFrame(tick);
    }

    window.addEventListener("pagehide", function () {
      if (rafId) cancelAnimationFrame(rafId);
    });
  }

  // --- Compute end time (same logic as countdown-bar.js) ---
  function computeEndMs(s) {
    const timerType = s.timerType || "one_time";

    if (timerType === "daily") {
      const resetTime = s.dailyResetTime || "00:00";
      const now = new Date();
      const todayStr = now.toLocaleDateString("en-CA", { timeZone: s.timezone || "UTC" });
      const resetStr = todayStr + "T" + resetTime + ":00";

      const tempDate = new Date(resetStr + "Z");
      const utcStr = tempDate.toLocaleString("en-US", { timeZone: "UTC" });
      const tzStr = tempDate.toLocaleString("en-US", { timeZone: s.timezone || "UTC" });
      const offsetMs = new Date(tzStr).getTime() - new Date(utcStr).getTime();
      let resetMs = tempDate.getTime() - offsetMs;

      if (resetMs <= Date.now()) {
        resetMs += 86400000;
      }
      return resetMs;
    }

    if (timerType === "evergreen") {
      const evergreenKey = "cdp_eg_" + (s.shop || "");
      const minutes = parseInt(s.evergreenMinutes, 10) || 30;
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

    // one_time
    const endDate = s.endDate ? new Date(s.endDate) : null;
    if (!endDate || isNaN(endDate.getTime())) return null;
    return endDate.getTime();
  }

  function fireTrack(shop, event) {
    try {
      const payload = JSON.stringify({ shop: shop, event: event });
      if (navigator.sendBeacon) {
        navigator.sendBeacon("/apps/countdown/track", payload);
      } else {
        fetch("/apps/countdown/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
          keepalive: true,
        }).catch(function () {});
      }
    } catch (e) {
      // Never break the storefront
    }
  }

  function pad(n) {
    return n < 10 ? "0" + n : String(n);
  }
})();
