(function() {
  'use strict';
  
  const bar = document.getElementById('countdown-cta-bar');
  if (!bar) return;
  
  const shop = bar.getAttribute('data-shop');
  
  // Check if bar was closed by user
  const barClosed = sessionStorage.getItem('countdownBarClosed');
  if (barClosed === 'true') {
    bar.style.display = 'none';
    return;
  }
  
  // Close button functionality
  const closeBtn = document.getElementById('close-bar');
  if (closeBtn) {
    closeBtn.addEventListener('click', function() {
      bar.style.display = 'none';
      sessionStorage.setItem('countdownBarClosed', 'true');
    });
  }
  
  // If you configured an App Proxy with subpath "apps/countdown"
    const proxyBase = '/apps/countdown';
    fetch(`${proxyBase}/settings?shop=${encodeURIComponent(shop)}`)
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      if (!data.success || !data.settings) {
        console.warn('Countdown bar: No settings found');
        bar.style.display = 'none';
        return;
      }
      
      const settings = data.settings;
      
      // Apply settings to bar
      bar.style.backgroundColor = settings.barColor || '#288d40';
      const pos = Array.isArray(settings.barPosition) ? settings.barPosition[0] : (settings.barPosition || 'top');
      bar.className = `countdown-bar countdown-bar--${pos}`;

      // Update message
      const messageEl = bar.querySelector('.countdown-bar__message');
      if (messageEl) {
        messageEl.textContent = settings.barMessage || 'Flash Sale Ends In...';
      }
      
      // Update button
      const buttonEl = document.getElementById('cta-button');
      if (buttonEl) {
        if (settings.buttonText && settings.buttonLink) {
            buttonEl.textContent = settings.buttonText;
            buttonEl.href = settings.buttonLink;
            buttonEl.rel = 'noopener noreferrer';
            buttonEl.style.display = 'block';
        } else {
            buttonEl.style.display = 'none';
        }
    }

      // Show bar
      bar.style.display = 'block';
      
      // Start countdown
      if (settings.endDate) {
        startCountdown(settings.endDate, settings.endAction, settings.customEndMessage);
      } else {
        console.warn('Countdown bar: No end date specified');
      }
    })
    .catch(error => {
      console.error('Countdown bar fetch error:', error);
      bar.style.display = 'none';
    });
  
  function startCountdown(endDateStr, endAction, customMessage) {
    const endDate = new Date(endDateStr).getTime();
    
    if (isNaN(endDate)) {
      console.error('Countdown bar: Invalid end date format');
      return;
    }
    
    const daysEl = document.getElementById('days');
    const hoursEl = document.getElementById('hours');
    const minutesEl = document.getElementById('minutes');
    const secondsEl = document.getElementById('seconds');
    const timerEl = document.getElementById('countdown-timer');
    const messageEl = bar.querySelector('.countdown-bar__message');
    
    function updateCountdown() {
      const now = new Date().getTime();
      const distance = endDate - now;
      
      if (distance < 0) {
        handleCountdownEnd();
        return;
      }
      
      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);
      
      if (daysEl) daysEl.textContent = String(days).padStart(2, '0');
      if (hoursEl) hoursEl.textContent = String(hours).padStart(2, '0');
      if (minutesEl) minutesEl.textContent = String(minutes).padStart(2, '0');
      if (secondsEl) secondsEl.textContent = String(seconds).padStart(2, '0');
    }
    
    function handleCountdownEnd() {
      if (endAction === 'hide') {
        bar.style.display = 'none';
      } else if (endAction === 'show_ended') {
        if (messageEl) messageEl.textContent = 'Sale Ended';
        if (timerEl) timerEl.style.display = 'none';
      } else if (endAction === 'show_custom' && customMessage) {
        if (messageEl) messageEl.textContent = customMessage;
        if (timerEl) timerEl.style.display = 'none';
      }
    }
    
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    
    window.addEventListener('beforeunload', function() {
      clearInterval(interval);
    });
  }
})();