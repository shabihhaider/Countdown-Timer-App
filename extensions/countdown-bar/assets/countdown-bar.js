(function () {
  "use strict";

  const bar = document.getElementById("cdb-bar");
  if (!bar) return;

  const shop = bar.getAttribute("data-shop") || "";

  // Namespaced sessionStorage key prevents collisions with other apps
  const CLOSED_KEY = "cdb_closed_" + shop;

  if (sessionStorage.getItem(CLOSED_KEY) === "1") {
    return; // User already dismissed — keep hidden
  }

  const closeBtn = document.getElementById("cdb-close");
  if (closeBtn) {
    closeBtn.addEventListener("click", function () {
      bar.style.display = "none";
      sessionStorage.setItem(CLOSED_KEY, "1");
      fireTrack("close");
    });
  }

  // --- Fetch settings via App Proxy (authenticated by Shopify) ---
  fetch("/apps/countdown/settings?shop=" + encodeURIComponent(shop), {
    headers: { Accept: "application/json" },
  })
    .then(function (res) {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    })
    .then(function (data) {
      if (!data.success || !data.settings) return; // No campaign — bar stays hidden

      applySettings(data.settings);
    })
    .catch(function () {
      // Fail silently — never show a broken bar on a merchant's storefront
    });

  // --- Apply settings and start countdown ---
  function applySettings(s) {
    // Colors
    bar.style.backgroundColor = s.barColor || "#288d40";
    bar.style.color = s.textColor || "#ffffff";

    // Position (top / bottom)
    const pos = Array.isArray(s.barPosition) ? s.barPosition[0] : s.barPosition || "top";
    bar.className = "cdb cdb--" + pos;

    // Message
    const msgEl = bar.querySelector(".cdb__message");
    if (msgEl) msgEl.textContent = s.barMessage || "Flash Sale Ends In...";

    // CTA button
    const btnEl = document.getElementById("cdb-btn");
    if (btnEl) {
      const btnUrl = s.buttonUrl || s.buttonLink; // buttonLink is legacy fallback
      if (s.buttonText && btnUrl) {
        btnEl.textContent = s.buttonText;
        btnEl.href = btnUrl;
        btnEl.style.display = "";
        if (s.buttonTextColor) btnEl.style.color = s.buttonTextColor;
        if (s.buttonBgColor) btnEl.style.backgroundColor = s.buttonBgColor;
        btnEl.addEventListener("click", function () {
          fireTrack("click");
        });
      }
    }

    // Validate end date — stored in UTC ISO format
    const endDate = s.endDate ? new Date(s.endDate) : null;
    if (!endDate || isNaN(endDate.getTime())) return; // No valid end date — hide bar

    // Show bar and fire impression
    bar.style.display = "block";
    fireTrack("impression");

    // Start timer
    startCountdown(endDate.getTime(), s.endAction, s.customEndMessage);
  }

  // --- UTC-based countdown using requestAnimationFrame ---
  function startCountdown(endMs, endAction, customMsg) {
    const daysEl = document.getElementById("cdb-days");
    const hoursEl = document.getElementById("cdb-hours");
    const minsEl = document.getElementById("cdb-mins");
    const secsEl = document.getElementById("cdb-secs");
    const timerEl = document.getElementById("cdb-timer");
    const msgEl = bar.querySelector(".cdb__message");
    const srEl = bar.querySelector(".cdb__sr-timer");

    let lastSec = -1;
    let lastSrAnnounce = -1; // announce to screen reader every 60s
    let rafId;
    let ended = false;

    function tick() {
      if (ended) return;

      const now = Date.now();
      const dist = endMs - now;

      if (dist <= 0) {
        ended = true;
        handleEnd();
        return;
      }

      const totalSecs = Math.floor(dist / 1000);

      // Only update DOM when the second changes (avoid thrashing)
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

        // Announce to screen reader once per minute
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

    function handleEnd() {
      if (rafId) cancelAnimationFrame(rafId);
      if (endAction === "hide") {
        bar.style.display = "none";
      } else if (endAction === "show_ended") {
        if (timerEl) timerEl.style.display = "none";
        if (msgEl) msgEl.textContent = "Sale Ended";
      } else if (endAction === "show_custom" && customMsg) {
        if (timerEl) timerEl.style.display = "none";
        if (msgEl) msgEl.textContent = customMsg;
      } else {
        bar.style.display = "none";
      }
    }

    // Respect prefers-reduced-motion — show static time, no animation
    const prefersReducedMotion =
      window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) {
      // Run once synchronously, no rAF loop
      tick();
    } else {
      rafId = requestAnimationFrame(tick);
    }

    // Cleanup on page unload
    window.addEventListener("pagehide", function () {
      if (rafId) cancelAnimationFrame(rafId);
    });
  }

  // --- Analytics tracking (fire-and-forget, no blocking) ---
  function fireTrack(event) {
    try {
      // Using sendBeacon for reliability on page unload events (close/impression)
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
      // Tracking must never break the storefront
    }
  }

  function pad(n) {
    return n < 10 ? "0" + n : String(n);
  }
})();
