(function () {
  "use strict";

  const bar = document.getElementById("cdb-bar");
  if (!bar) return;

  const shop = bar.getAttribute("data-shop") || "";

  // Read theme editor settings from data attributes (set in Liquid template).
  // These override API-fetched campaign values when explicitly changed by the merchant.
  const themeSettings = {
    bgColor: bar.dataset.bgColor || null,
    textColor: bar.dataset.textColor || null,
    accentColor: bar.dataset.accentColor || null,
    position: bar.dataset.position || null,
    fontSize: bar.dataset.fontSize || null,
    showClose: bar.dataset.showClose,
    barPadding: bar.dataset.barPadding || null,
  };

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

  // --- Compute the countdown end time based on timer type ---
  function computeEndMs(s) {
    const timerType = s.timerType || "one_time";

    if (timerType === "daily") {
      // Daily timer: counts down to dailyResetTime each day in the campaign timezone
      const resetTime = s.dailyResetTime || "00:00";
      const parts = resetTime.split(":");
      const resetHour = parseInt(parts[0], 10) || 0;
      const resetMin = parseInt(parts[1], 10) || 0;

      // Build today's reset time in UTC using timezone offset
      const now = new Date();
      const todayStr = now.toLocaleDateString("en-CA", { timeZone: s.timezone || "UTC" });
      const resetStr = todayStr + "T" + resetTime + ":00";

      // Get UTC offset for the timezone
      const tempDate = new Date(resetStr + "Z");
      const utcStr = tempDate.toLocaleString("en-US", { timeZone: "UTC" });
      const tzStr = tempDate.toLocaleString("en-US", { timeZone: s.timezone || "UTC" });
      const offsetMs = new Date(tzStr).getTime() - new Date(utcStr).getTime();
      let resetMs = tempDate.getTime() - offsetMs;

      // If reset time has passed today, target tomorrow
      if (resetMs <= Date.now()) {
        resetMs += 86400000; // add 24 hours
      }

      return resetMs;
    }

    if (timerType === "evergreen") {
      // Evergreen: per-visitor timer stored in localStorage
      const evergreenKey = "cdb_eg_" + shop;
      const minutes = parseInt(s.evergreenMinutes, 10) || 30;
      const stored = localStorage.getItem(evergreenKey);

      if (stored) {
        const storedMs = parseInt(stored, 10);
        if (storedMs > Date.now()) {
          return storedMs;
        }
        // Expired — don't show again for this visitor
        return null;
      }

      // First visit: set the timer
      const endMs = Date.now() + minutes * 60 * 1000;
      localStorage.setItem(evergreenKey, String(endMs));
      return endMs;
    }

    // one_time: standard fixed end date
    const endDate = s.endDate ? new Date(s.endDate) : null;
    if (!endDate || isNaN(endDate.getTime())) return null;
    return endDate.getTime();
  }

  // --- Check page targeting before showing ---
  function shouldShowOnPage(s) {
    if (!s.pageTargeting) return true;
    try {
      const targeting =
        typeof s.pageTargeting === "string" ? JSON.parse(s.pageTargeting) : s.pageTargeting;
      if (!targeting.mode || targeting.mode === "all") return true;

      const path = window.location.pathname;
      const patterns = targeting.patterns || [];
      if (patterns.length === 0) return true;

      const matches = patterns.some(function (pattern) {
        if (pattern === path) return true;
        // Wildcard matching: /collections/* matches /collections/anything
        if (pattern.endsWith("/*")) {
          const prefix = pattern.slice(0, -1);
          return path.startsWith(prefix);
        }
        return false;
      });

      return targeting.mode === "include" ? matches : !matches;
    } catch {
      return true;
    }
  }

  // --- Apply settings and start countdown ---
  function applySettings(s) {
    // Check page targeting first
    if (!shouldShowOnPage(s)) return;

    // Theme editor settings override API-fetched campaign values.
    const bgColor = themeSettings.bgColor || s.barColor || "#288d40";
    const textColor = themeSettings.textColor || s.textColor || "#ffffff";
    const accentColor = themeSettings.accentColor || s.buttonBgColor || "#ffffff";
    const pos = themeSettings.position || s.barPosition || "top";
    const fontSize = themeSettings.fontSize ? themeSettings.fontSize + "px" : null;
    const barPadding = themeSettings.barPadding ? themeSettings.barPadding + "px" : null;

    // Apply colors
    bar.style.backgroundColor = bgColor;
    bar.style.color = textColor;

    // Apply font family
    if (s.fontFamily && s.fontFamily !== "system") {
      bar.style.fontFamily = s.fontFamily === "inherit" ? "inherit" : s.fontFamily;
    }

    // Apply font size and padding from theme editor
    if (fontSize) {
      const msgEl = bar.querySelector(".cdb__message");
      if (msgEl) msgEl.style.fontSize = fontSize;
    }
    if (barPadding) {
      bar.style.paddingTop = barPadding;
      bar.style.paddingBottom = barPadding;
    }

    // Position (top / bottom)
    bar.className = "cdb cdb--" + (Array.isArray(pos) ? pos[0] : pos);

    // Message
    const msgEl = bar.querySelector(".cdb__message");
    if (msgEl) msgEl.textContent = s.barMessage || "Flash Sale Ends In...";

    // Discount code
    if (s.discountCode) {
      const codeEl = document.createElement("span");
      codeEl.className = "cdb__code";
      codeEl.innerHTML =
        '<span class="cdb__code-text">' +
        s.discountCode +
        "</span>" +
        '<button class="cdb__code-copy" type="button" aria-label="Copy discount code">Copy</button>';

      const copyBtn = codeEl.querySelector(".cdb__code-copy");
      copyBtn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        navigator.clipboard.writeText(s.discountCode).then(function () {
          copyBtn.textContent = "Copied!";
          setTimeout(function () {
            copyBtn.textContent = "Copy";
          }, 2000);
        });
        fireTrack("copy");
      });

      const content = bar.querySelector(".cdb__content");
      const btnEl = document.getElementById("cdb-btn");
      if (content && btnEl) {
        content.insertBefore(codeEl, btnEl);
      } else if (content) {
        content.appendChild(codeEl);
      }
    }

    // CTA button
    const btnEl = document.getElementById("cdb-btn");
    if (btnEl) {
      const btnUrl = s.buttonUrl || s.buttonLink;
      if (s.buttonText && btnUrl) {
        btnEl.textContent = s.buttonText;
        btnEl.href = btnUrl;
        btnEl.style.display = "";
        btnEl.style.color = s.buttonTextColor || "#111111";
        btnEl.style.backgroundColor = accentColor;
        btnEl.addEventListener("click", function () {
          fireTrack("click");
        });
      }
    }

    // Compute the target end time based on timer type
    const endMs = computeEndMs(s);
    if (!endMs) return; // No valid end time — hide bar

    // Show bar and fire impression
    bar.style.display = "block";
    fireTrack("impression");

    // Start timer
    startCountdown(endMs, s.endAction, s.customEndMessage);
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
