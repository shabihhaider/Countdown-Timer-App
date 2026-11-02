(function () {
  "use strict";

  const EXPIRED = "expired";

  const timers = document.querySelectorAll(".cdc");
  if (!timers.length) return;

  timers.forEach(function (el) {
    initCartTimer(el);
  });

  function storageKey(el) {
    return "cdc_cart_" + (el.dataset.shop || "");
  }

  function initCartTimer(el) {
    const minutes = parseInt(el.dataset.minutes, 10) || 10;
    const expiryAction = el.dataset.expiryAction || "hide";
    const redirectUrl = el.dataset.redirectUrl || "/";
    const textColor = el.dataset.textColor || "#991b1b";
    const bgColor = el.dataset.bgColor || "#fef2f2";
    const accentColor = el.dataset.accentColor || "#b91c1c";

    // Apply styles
    el.style.color = textColor;
    el.style.backgroundColor = bgColor;

    const timeEl = el.querySelector(".cdc__time");
    if (timeEl) timeEl.style.color = accentColor;

    // Session-based timer — one per browser session, and it never restarts.
    // With storage blocked it would restart on every view, so it stays hidden.
    let endMs;
    let stored;
    try {
      stored = sessionStorage.getItem(storageKey(el));
      if (stored === EXPIRED) return;
      if (!stored) {
        endMs = Date.now() + minutes * 60 * 1000;
        sessionStorage.setItem(storageKey(el), String(endMs));
      }
    } catch (e) {
      return;
    }

    if (stored) {
      endMs = parseInt(stored, 10);
      if (endMs <= Date.now()) {
        // Timer expired — take action
        handleExpiry(el, expiryAction, redirectUrl);
        return;
      }
    }

    // Show timer
    el.style.display = "";

    const minsEl = el.querySelector(".cdc__mins");
    const secsEl = el.querySelector(".cdc__secs");
    let lastSec = -1;
    let rafId;

    function tick() {
      const dist = endMs - Date.now();

      if (dist <= 0) {
        if (rafId) cancelAnimationFrame(rafId);
        handleExpiry(el, expiryAction, redirectUrl);
        return;
      }

      const totalSecs = Math.floor(dist / 1000);
      if (totalSecs !== lastSec) {
        lastSec = totalSecs;
        const m = Math.floor(totalSecs / 60);
        const s = totalSecs % 60;
        if (minsEl) minsEl.textContent = m < 10 ? "0" + m : String(m);
        if (secsEl) secsEl.textContent = s < 10 ? "0" + s : String(s);
      }

      rafId = requestAnimationFrame(tick);
    }

    rafId = requestAnimationFrame(tick);

    window.addEventListener("pagehide", function () {
      if (rafId) cancelAnimationFrame(rafId);
    });
  }

  function handleExpiry(el, action, redirectUrl) {
    el.style.display = "none";
    // Keep the marker: removing it would start a fresh timer on the next page view.
    try {
      sessionStorage.setItem(storageKey(el), EXPIRED);
    } catch (e) {
      /* best-effort */
    }

    if (action === "clear_cart") {
      fetch("/cart/clear.js", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
        .then(function () {
          window.location.reload();
        })
        .catch(function () {
          // Network failure: leave the cart untouched; never break the storefront
        });
    } else if (action === "redirect" && redirectUrl) {
      window.location.href = redirectUrl;
    }
  }
})();
