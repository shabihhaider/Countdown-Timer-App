/**
 * Shared campaign utilities — form field mapping, validation, color conversion.
 * Used by dashboard, campaign CRUD routes, and settings form.
 */

// --- Campaign types ---
export const CAMPAIGN_TYPES = {
  BAR: "bar",
  PRODUCT_TIMER: "product_timer",
};

export const CAMPAIGN_TYPE_LABELS = {
  [CAMPAIGN_TYPES.BAR]: "Announcement Bar",
  [CAMPAIGN_TYPES.PRODUCT_TIMER]: "Product Timer",
};

// --- Shared defaults (both types) ---
const SHARED_DEFAULTS = {
  name: "My Sale",
  timerType: "one_time",
  startDate: "",
  endDate: "",
  timezone: "UTC",
  dailyResetTime: "00:00",
  evergreenMinutes: "30",
  endAction: "hide",
  customEndMessage: "",
  targetType: "all",
  targetProductIds: "[]",
  targetCollectionIds: "[]",
  targetTags: "[]",
  priority: "0",
};

// --- Bar-specific defaults ---
export const BAR_DEFAULTS = {
  ...SHARED_DEFAULTS,
  barMessage: "Flash Sale Ends In...",
  buttonText: "Shop Now",
  buttonLink: "/collections/all",
  discountCode: "",
  barIcon: "",
  fontFamily: "system",
  animationStyle: "none",
  bgType: "solid",
  gradientDirection: "to right",
  gradientColor1: "#667eea",
  gradientColor2: "#764ba2",
  barColor: "#288d40",
  textColor: "#ffffff",
  buttonTextColor: "#111111",
  buttonBgColor: "#ffffff",
  barPosition: "top",
  pageTargeting: '{"mode":"all"}',
};

// --- Product timer-specific defaults ---
export const PRODUCT_TIMER_DEFAULTS = {
  ...SHARED_DEFAULTS,
  productStyle: "minimal",
  accentColor: "#dc2626",
  labelText: "Sale ends in",
  barIcon: "",
  textColor: "#333333",
  barColor: "",
  fontFamily: "system",
};

// --- Combined defaults (backward compat) ---
export const DEFAULT_CAMPAIGN_FORM = {
  ...BAR_DEFAULTS,
  ...PRODUCT_TIMER_DEFAULTS,
};

export function getDefaultsForType(type) {
  if (type === CAMPAIGN_TYPES.PRODUCT_TIMER)
    return { ...SHARED_DEFAULTS, ...PRODUCT_TIMER_DEFAULTS };
  return { ...SHARED_DEFAULTS, ...BAR_DEFAULTS };
}

/** Font family options — web-safe + Google Fonts grouped by category. */
export const FONT_OPTIONS = [
  { label: "── Defaults ──", value: "__sep_defaults", disabled: true },
  { label: "System default", value: "system" },
  { label: "Theme font (inherit)", value: "inherit" },
  { label: "── Sans-Serif (Modern) ──", value: "__sep_sans", disabled: true },
  { label: "Inter", value: "Inter" },
  { label: "Poppins", value: "Poppins" },
  { label: "Montserrat", value: "Montserrat" },
  { label: "DM Sans", value: "DM Sans" },
  { label: "Open Sans", value: "Open Sans" },
  { label: "Roboto", value: "Roboto" },
  { label: "Lato", value: "Lato" },
  { label: "Work Sans", value: "Work Sans" },
  { label: "Rubik", value: "Rubik" },
  { label: "Manrope", value: "Manrope" },
  { label: "Outfit", value: "Outfit" },
  { label: "Plus Jakarta Sans", value: "Plus Jakarta Sans" },
  { label: "Sora", value: "Sora" },
  { label: "Space Grotesk", value: "Space Grotesk" },
  { label: "Barlow Condensed", value: "Barlow Condensed" },
  { label: "── Display & Bold ──", value: "__sep_display", disabled: true },
  { label: "Bebas Neue", value: "Bebas Neue" },
  { label: "Anton", value: "Anton" },
  { label: "Oswald", value: "Oswald" },
  { label: "Archivo Black", value: "Archivo Black" },
  { label: "Righteous", value: "Righteous" },
  { label: "Fjalla One", value: "Fjalla One" },
  { label: "Teko", value: "Teko" },
  { label: "Passion One", value: "Passion One" },
  { label: "── Serif (Elegant) ──", value: "__sep_serif", disabled: true },
  { label: "Playfair Display", value: "Playfair Display" },
  { label: "Libre Baskerville", value: "Libre Baskerville" },
  { label: "Merriweather", value: "Merriweather" },
  { label: "── Monospace & Digital ──", value: "__sep_mono", disabled: true },
  { label: "Orbitron", value: "Orbitron" },
  { label: "Courier Prime", value: "Courier Prime" },
  { label: "── Web-Safe (No Loading) ──", value: "__sep_websafe", disabled: true },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Verdana", value: "Verdana, sans-serif" },
  { label: "Trebuchet MS", value: "'Trebuchet MS', sans-serif" },
  { label: "Impact", value: "Impact, sans-serif" },
];

/** Google Fonts that need external loading (excludes web-safe and special values). */
export const GOOGLE_FONT_FAMILIES = FONT_OPTIONS.filter((f) => f.value && !f.disabled)
  .filter((f) => !["system", "inherit"].includes(f.value))
  .filter((f) => !f.value.includes(","))
  .map((f) => f.value);

/** Animation style options for countdown digits. */
export const ANIMATION_OPTIONS = [
  { label: "None (instant)", value: "none" },
  { label: "Fade", value: "fade" },
  { label: "Slide up", value: "slide" },
  { label: "Flip", value: "flip" },
  { label: "Bounce", value: "bounce" },
  { label: "Pulse", value: "pulse" },
  { label: "Scale", value: "scale" },
];

/** Emoji icons grouped by category for the bar icon picker. */
export const ICON_OPTIONS = [
  { label: "None", value: "" },
  { label: "── Urgency ──", value: "__sep_urgency", disabled: true },
  { label: "🔥 Fire", value: "🔥" },
  { label: "⚡ Lightning", value: "⚡" },
  { label: "🚨 Alert", value: "🚨" },
  { label: "⏰ Alarm Clock", value: "⏰" },
  { label: "⏳ Hourglass", value: "⏳" },
  { label: "💥 Collision", value: "💥" },
  { label: "🔔 Bell", value: "🔔" },
  { label: "── Shopping ──", value: "__sep_shopping", disabled: true },
  { label: "🛒 Cart", value: "🛒" },
  { label: "🛍️ Shopping Bags", value: "🛍️" },
  { label: "🏷️ Price Tag", value: "🏷️" },
  { label: "💰 Money Bag", value: "💰" },
  { label: "💎 Diamond", value: "💎" },
  { label: "── Celebration ──", value: "__sep_celebration", disabled: true },
  { label: "🎉 Party", value: "🎉" },
  { label: "🎁 Gift", value: "🎁" },
  { label: "🌟 Star", value: "🌟" },
  { label: "✨ Sparkles", value: "✨" },
  { label: "🎯 Bullseye", value: "🎯" },
  { label: "🏆 Trophy", value: "🏆" },
  { label: "── Seasonal ──", value: "__sep_seasonal", disabled: true },
  { label: "❄️ Snowflake", value: "❄️" },
  { label: "🎄 Christmas Tree", value: "🎄" },
  { label: "🎃 Halloween", value: "🎃" },
  { label: "💝 Valentine", value: "💝" },
  { label: "☀️ Summer", value: "☀️" },
];

/** Gradient direction options. */
export const GRADIENT_DIRECTIONS = [
  { label: "Left to Right", value: "to right" },
  { label: "Right to Left", value: "to left" },
  { label: "Top to Bottom", value: "to bottom" },
  { label: "Diagonal ↘", value: "135deg" },
  { label: "Diagonal ↗", value: "45deg" },
];

/** Page targeting mode options. */
export const PAGE_TARGETING_MODES = [
  { label: "Show on all pages", value: "all" },
  { label: "Only show on these pages", value: "include" },
  { label: "Hide on these pages", value: "exclude" },
];

/** Product/collection targeting mode options. */
export const TARGET_TYPE_OPTIONS = [
  { label: "All products", value: "all" },
  { label: "Specific products", value: "specific_products" },
  { label: "Specific collections", value: "specific_collections" },
  { label: "Products with specific tags", value: "tagged_products" },
];

/** Common timezones grouped by region for the timezone selector. */
export const TIMEZONE_OPTIONS = [
  { label: "UTC", value: "UTC" },
  { label: "── Americas ──", value: "__sep_americas", disabled: true },
  { label: "Eastern Time (ET)", value: "America/New_York" },
  { label: "Central Time (CT)", value: "America/Chicago" },
  { label: "Mountain Time (MT)", value: "America/Denver" },
  { label: "Pacific Time (PT)", value: "America/Los_Angeles" },
  { label: "Alaska (AKT)", value: "America/Anchorage" },
  { label: "Hawaii (HST)", value: "Pacific/Honolulu" },
  { label: "São Paulo (BRT)", value: "America/Sao_Paulo" },
  { label: "Toronto (ET)", value: "America/Toronto" },
  { label: "── Europe ──", value: "__sep_europe", disabled: true },
  { label: "London (GMT/BST)", value: "Europe/London" },
  { label: "Paris (CET)", value: "Europe/Paris" },
  { label: "Berlin (CET)", value: "Europe/Berlin" },
  { label: "Amsterdam (CET)", value: "Europe/Amsterdam" },
  { label: "Istanbul (TRT)", value: "Europe/Istanbul" },
  { label: "Moscow (MSK)", value: "Europe/Moscow" },
  { label: "── Asia / Pacific ──", value: "__sep_asia", disabled: true },
  { label: "Dubai (GST)", value: "Asia/Dubai" },
  { label: "Karachi (PKT)", value: "Asia/Karachi" },
  { label: "Kolkata (IST)", value: "Asia/Kolkata" },
  { label: "Bangkok (ICT)", value: "Asia/Bangkok" },
  { label: "Shanghai (CST)", value: "Asia/Shanghai" },
  { label: "Tokyo (JST)", value: "Asia/Tokyo" },
  { label: "Seoul (KST)", value: "Asia/Seoul" },
  { label: "Sydney (AEST)", value: "Australia/Sydney" },
  { label: "Auckland (NZST)", value: "Pacific/Auckland" },
];

// --- Campaign ↔ Form field mapping ---

/**
 * Maps a Prisma Campaign record to the flat shape used by the campaign form.
 * @param {import("@prisma/client").Campaign} campaign
 * @returns {Record<string, string>}
 */
/**
 * Convert a UTC Date to a datetime-local string in a specific timezone.
 * @param {Date | null} date
 * @param {string} timezone - IANA timezone (e.g. "America/New_York")
 * @returns {string} datetime-local format "YYYY-MM-DDTHH:MM" or ""
 */
function utcToLocalDatetimeString(date, timezone) {
  if (!date) return "";
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone || "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(date);

    const get = (type) => parts.find((p) => p.type === type)?.value || "00";
    return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
  } catch {
    return "";
  }
}

export function campaignToFormValues(campaign) {
  const tz = campaign.timezone || "UTC";
  return {
    type: campaign.type || CAMPAIGN_TYPES.BAR,
    name: campaign.name,
    barMessage: campaign.barMessage,
    buttonText: campaign.buttonText,
    buttonLink: campaign.buttonUrl,
    discountCode: campaign.discountCode,
    timerType: campaign.timerType,
    startDate: utcToLocalDatetimeString(campaign.startDate, tz),
    endDate: utcToLocalDatetimeString(campaign.endDate, tz),
    timezone: tz,
    dailyResetTime: campaign.dailyResetTime,
    evergreenMinutes: String(campaign.evergreenMinutes),
    barIcon: campaign.barIcon || "",
    fontFamily: campaign.fontFamily,
    animationStyle: campaign.animationStyle,
    bgType: campaign.backgroundStyle
      ? (() => {
          try {
            return JSON.parse(campaign.backgroundStyle).type || "solid";
          } catch {
            return "solid";
          }
        })()
      : "solid",
    gradientDirection: campaign.backgroundStyle
      ? (() => {
          try {
            return JSON.parse(campaign.backgroundStyle).direction || "to right";
          } catch {
            return "to right";
          }
        })()
      : "to right",
    gradientColor1: campaign.backgroundStyle
      ? (() => {
          try {
            const s = JSON.parse(campaign.backgroundStyle).colorStops;
            return s?.[0] || "#667eea";
          } catch {
            return "#667eea";
          }
        })()
      : "#667eea",
    gradientColor2: campaign.backgroundStyle
      ? (() => {
          try {
            const s = JSON.parse(campaign.backgroundStyle).colorStops;
            return s?.[1] || "#764ba2";
          } catch {
            return "#764ba2";
          }
        })()
      : "#764ba2",
    barColor: campaign.backgroundColor,
    textColor: campaign.textColor,
    buttonTextColor: campaign.buttonTextColor,
    buttonBgColor: campaign.buttonBackgroundColor,
    barPosition: campaign.position,
    endAction: campaign.endAction,
    customEndMessage: campaign.customEndMessage,
    pageTargeting: campaign.pageTargeting,
    targetType: campaign.targetType || "all",
    targetProductIds: campaign.targetProductIds || "[]",
    targetCollectionIds: campaign.targetCollectionIds || "[]",
    targetTags: campaign.targetTags || "[]",
    priority: String(campaign.priority || 0),
    productStyle: campaign.productStyle || "minimal",
    accentColor: campaign.accentColor || "#dc2626",
    labelText: campaign.labelText || "Sale ends in",
  };
}

/**
 * Maps validated form values to Prisma Campaign column names for create/update.
 * @param {Record<string, string>} form
 * @returns {Record<string, unknown>}
 */
/**
 * Parse a datetime-local string in a given timezone to a UTC Date.
 * @param {string} localDatetime - "YYYY-MM-DDTHH:MM"
 * @param {string} timezone - IANA timezone
 * @returns {Date | null}
 */
function localDatetimeToUtc(localDatetime, timezone) {
  if (!localDatetime) return null;
  try {
    // Create a date string that Intl can parse in the target timezone
    const [datePart, timePart] = localDatetime.split("T");
    const [year, month, day] = datePart.split("-").map(Number);
    const [hour, minute] = timePart.split(":").map(Number);

    // Use a known epoch offset approach: format the target time in UTC,
    // then compute the difference to find the timezone offset
    const tempDate = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
    const utcString = tempDate.toLocaleString("en-US", { timeZone: "UTC" });
    const tzString = tempDate.toLocaleString("en-US", { timeZone: timezone });
    const utcMs = new Date(utcString).getTime();
    const tzMs = new Date(tzString).getTime();
    const offsetMs = tzMs - utcMs;

    return new Date(tempDate.getTime() - offsetMs);
  } catch {
    return new Date(localDatetime);
  }
}

export function formValuesToCampaignData(form) {
  const tz = form.timezone || "UTC";
  return {
    type: form.type || CAMPAIGN_TYPES.BAR,
    name: form.name || "My Sale",
    barMessage: form.barMessage,
    buttonText: form.buttonText,
    buttonUrl: form.buttonLink,
    discountCode: form.discountCode || "",
    timerType: form.timerType || "one_time",
    startDate: localDatetimeToUtc(form.startDate, tz),
    endDate: localDatetimeToUtc(form.endDate, tz),
    timezone: tz,
    dailyResetTime: form.dailyResetTime || "00:00",
    evergreenMinutes: Number.isFinite(parseInt(form.evergreenMinutes, 10))
      ? parseInt(form.evergreenMinutes, 10)
      : 30,
    barIcon: form.barIcon || "",
    fontFamily: form.fontFamily || "system",
    animationStyle: form.animationStyle || "none",
    backgroundStyle:
      form.bgType === "gradient"
        ? JSON.stringify({
            type: "gradient",
            direction: form.gradientDirection || "to right",
            colorStops: [form.gradientColor1 || "#667eea", form.gradientColor2 || "#764ba2"],
          })
        : "",
    backgroundColor: form.barColor,
    textColor: form.textColor || "#ffffff",
    buttonTextColor: form.buttonTextColor || "#111111",
    buttonBackgroundColor: form.buttonBgColor || "#ffffff",
    position: form.barPosition,
    endAction: form.endAction,
    customEndMessage: form.customEndMessage,
    pageTargeting: form.pageTargeting || '{"mode":"all"}',
    targetType: form.targetType || "all",
    targetProductIds: form.targetProductIds || "[]",
    targetCollectionIds: form.targetCollectionIds || "[]",
    targetTags: form.targetTags || "[]",
    priority: parseInt(form.priority, 10) || 0,
    productStyle: form.productStyle || "minimal",
    accentColor: form.accentColor || "#dc2626",
    labelText: form.labelText || "Sale ends in",
  };
}

// --- Validation ---

/**
 * @param {string} link
 * @returns {boolean}
 */
export function isValidButtonLink(link) {
  if (!link) return true;
  const trimmed = link.trim().toLowerCase();
  // Dangerous URI schemes rejected in merchant-supplied links
  // eslint-disable-next-line no-script-url -- literals used to REJECT dangerous schemes
  const blockedSchemes = ["javascript:", "data:", "vbscript:"];
  if (blockedSchemes.some((scheme) => trimmed.startsWith(scheme))) {
    return false;
  }
  return /^(\/(?!\/)|https?:\/\/)/.test(link.trim());
}

/**
 * @param {string} hex
 * @returns {boolean}
 */
export function isValidHex(hex) {
  return /^#[0-9a-fA-F]{6}$/.test(hex);
}

/**
 * Validate campaign form fields. Returns an object of field→error message pairs.
 * @param {Record<string, string>} raw
 * @returns {Record<string, string>}
 */
const VALID_TIMER_TYPES = new Set(["one_time", "daily", "evergreen"]);
const VALID_ANIMATIONS = new Set(["none", "fade", "slide", "flip", "bounce", "pulse", "scale"]);
const VALID_POSITIONS = new Set(["top", "bottom"]);
const VALID_END_ACTIONS = new Set(["hide", "show_ended", "show_custom"]);
const VALID_BG_TYPES = new Set(["solid", "gradient"]);
const VALID_PRODUCT_STYLES = new Set(["minimal", "card", "badge", "banner", "floating"]);
const VALID_FONT_FAMILIES = new Set(FONT_OPTIONS.filter((f) => !f.disabled).map((f) => f.value));

/** Enum-like fields validated against their allowed value sets. */
function validateEnumFields(raw, errors) {
  if (raw.timerType && !VALID_TIMER_TYPES.has(raw.timerType)) {
    errors.timerType = "Invalid timer type.";
  }
  if (raw.animationStyle && !VALID_ANIMATIONS.has(raw.animationStyle)) {
    errors.animationStyle = "Invalid animation style.";
  }
  if (raw.barPosition && !VALID_POSITIONS.has(raw.barPosition)) {
    errors.barPosition = "Invalid bar position.";
  }
  if (raw.endAction && !VALID_END_ACTIONS.has(raw.endAction)) {
    errors.endAction = "Invalid end action.";
  }
  if (raw.bgType && !VALID_BG_TYPES.has(raw.bgType)) {
    errors.bgType = "Invalid background type.";
  }
  if (raw.fontFamily && !VALID_FONT_FAMILIES.has(raw.fontFamily)) {
    errors.fontFamily = "Invalid font family.";
  }
}

/** Fields that only exist on announcement-bar campaigns. */
function validateBarFields(raw, errors) {
  if (!raw.barMessage) {
    errors.barMessage = "Bar message is required.";
  } else if (raw.barMessage.length > 200) {
    errors.barMessage = "Bar message must be 200 characters or fewer.";
  }
  if (raw.buttonText && raw.buttonText.length > 60) {
    errors.buttonText = "Button text must be 60 characters or fewer.";
  }
  if (raw.discountCode && raw.discountCode.length > 30) {
    errors.discountCode = "Discount code must be 30 characters or fewer.";
  }
}

/** Fields that only exist on product-timer campaigns. */
function validateProductTimerFields(raw, errors) {
  if (raw.productStyle && !VALID_PRODUCT_STYLES.has(raw.productStyle)) {
    errors.productStyle = "Invalid product timer style.";
  }
  if (raw.labelText && raw.labelText.length > 100) {
    errors.labelText = "Label text must be 100 characters or fewer.";
  }
}

function validateColorFields(raw, errors) {
  if (raw.accentColor && !isValidHex(raw.accentColor)) {
    errors.accentColor = "Invalid accent color.";
  }
  if (raw.textColor && !isValidHex(raw.textColor)) {
    errors.textColor = "Invalid text color.";
  }
  if (raw.barColor && !isValidHex(raw.barColor)) {
    errors.barColor = "Invalid background color.";
  }
  if (raw.bgType === "gradient") {
    if (raw.gradientColor1 && !isValidHex(raw.gradientColor1)) {
      errors.gradientColor1 = "Invalid gradient start color.";
    }
    if (raw.gradientColor2 && !isValidHex(raw.gradientColor2)) {
      errors.gradientColor2 = "Invalid gradient end color.";
    }
  }
}

function validateEndDate(raw, errors, { isEditing }) {
  const needsEndDate = !raw.timerType || raw.timerType === "one_time";

  if (needsEndDate && !raw.endDate) {
    errors.endDate = "End date is required.";
    return;
  }
  if (!raw.endDate) return;

  const endMs = new Date(raw.endDate).getTime();
  if (isNaN(endMs)) {
    errors.endDate = "End date is not a valid date.";
    return;
  }

  if (!isEditing) {
    const endUtc = localDatetimeToUtc(raw.endDate, raw.timezone || "UTC");
    if (endUtc && endUtc.getTime() <= Date.now()) {
      errors.endDate = "End date must be in the future.";
    }
  }

  // Sanity bound: a mistyped year (e.g. 20261) would otherwise render an
  // absurd multi-million-day countdown on the storefront.
  const MAX_HORIZON_MS = 5 * 365 * 24 * 60 * 60 * 1000;
  if (!errors.endDate && endMs > Date.now() + MAX_HORIZON_MS) {
    errors.endDate = "End date must be within the next 5 years.";
  }

  if (raw.startDate && !errors.startDate && !errors.endDate) {
    const startMs = new Date(raw.startDate).getTime();
    if (startMs >= endMs) {
      errors.startDate = "Start date must be before end date.";
    }
  }
}

function validateScheduleFields(raw, errors, { isEditing }) {
  if (raw.timerType === "evergreen") {
    const mins = parseInt(raw.evergreenMinutes, 10);
    if (isNaN(mins) || mins < 1 || mins > 1440) {
      errors.evergreenMinutes = "Duration must be between 1 and 1440 minutes.";
    }
  }

  if (raw.dailyResetTime && !/^\d{2}:\d{2}$/.test(raw.dailyResetTime)) {
    errors.dailyResetTime = "Daily reset time must be in HH:MM format.";
  }

  if (raw.startDate) {
    const startMs = new Date(raw.startDate).getTime();
    if (isNaN(startMs)) {
      errors.startDate = "Start date is not a valid date.";
    }
  }

  validateEndDate(raw, errors, { isEditing });
}

function validateEndBehaviorFields(raw, errors) {
  if (raw.buttonLink && !isValidButtonLink(raw.buttonLink)) {
    errors.buttonLink =
      "Button link must be a relative path (e.g. /collections/all) or a full URL starting with https://.";
  }
  if (raw.endAction === "show_custom" && !raw.customEndMessage) {
    errors.customEndMessage = "Custom end message is required when this action is selected.";
  }
}

export function validateCampaignForm(raw, { isEditing = false } = {}) {
  const errors = {};
  const isProductTimer = raw.type === CAMPAIGN_TYPES.PRODUCT_TIMER;

  validateEnumFields(raw, errors);
  if (isProductTimer) {
    validateProductTimerFields(raw, errors);
  } else {
    validateBarFields(raw, errors);
  }
  validateColorFields(raw, errors);
  validateScheduleFields(raw, errors, { isEditing });
  validateEndBehaviorFields(raw, errors);

  return errors;
}

// --- Color conversion (Polaris ColorPicker expects HSB) ---

/**
 * Convert hex color string to HSB object {hue:0-360, saturation:0-1, brightness:0-1}.
 * @param {string} hex
 * @returns {{ hue: number, saturation: number, brightness: number }}
 */
export function hexToHsb(hex) {
  let h = (hex || "#000000").replace("#", "").trim();
  if (h.length === 3) {
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  }
  const num = parseInt(h, 16);
  const r = ((num >> 16) & 255) / 255;
  const g = ((num >> 8) & 255) / 255;
  const b = (num & 255) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;

  let hue = 0;
  if (d !== 0) {
    switch (max) {
      case r:
        hue = ((g - b) / d) % 6;
        break;
      case g:
        hue = (b - r) / d + 2;
        break;
      case b:
        hue = (r - g) / d + 4;
        break;
      default:
        break;
    }
    hue *= 60;
    if (hue < 0) hue += 360;
  }

  return { hue, saturation: max === 0 ? 0 : d / max, brightness: max };
}

/**
 * WCAG relative luminance contrast ratio between two hex colors (1–21).
 * @param {string} hexA
 * @param {string} hexB
 * @returns {number}
 */
export function getContrastRatio(hexA, hexB) {
  const luminance = (hex) => {
    const c = (hex || "#000000").replace("#", "");
    const full =
      c.length === 3
        ? c
            .split("")
            .map((ch) => ch + ch)
            .join("")
        : c;
    const channel = (i) => {
      const v = (parseInt(full.substring(i, i + 2), 16) || 0) / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4);
  };
  const la = luminance(hexA);
  const lb = luminance(hexB);
  const [light, dark] = la >= lb ? [la, lb] : [lb, la];
  return (light + 0.05) / (dark + 0.05);
}

/** Contrast below this reads as "barely visible" — used for form warnings only. */
export const LOW_CONTRAST_THRESHOLD = 2;

/**
 * True when two colors are too close to read against each other
 * (e.g. red digits on a red background).
 * @param {string} foreground
 * @param {string} background
 * @returns {boolean}
 */
export function hasPoorContrast(foreground, background) {
  if (!foreground || !background) return false;
  return getContrastRatio(foreground, background) < LOW_CONTRAST_THRESHOLD;
}

export function isLightColor(hex) {
  if (!hex || hex.length < 4) return true;
  const c = hex.replace("#", "");
  const r = parseInt(c.substring(0, 2), 16) || 0;
  const g = parseInt(c.substring(2, 4), 16) || 0;
  const b = parseInt(c.substring(4, 6), 16) || 0;
  return (r * 299 + g * 587 + b * 114) / 1000 > 128;
}

/**
 * Convert HSB object to hex color string.
 * @param {{ hue?: number, saturation?: number, brightness?: number }} hsb
 * @returns {string}
 */
export function hsbToHex({ hue = 0, saturation = 0, brightness = 0 }) {
  const h = ((hue % 360) + 360) % 360;
  const s = Math.min(Math.max(saturation, 0), 1);
  const v = Math.min(Math.max(brightness, 0), 1);
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;

  let rp = 0,
    gp = 0,
    bp = 0;
  if (h < 60) {
    rp = c;
    gp = x;
  } else if (h < 120) {
    rp = x;
    gp = c;
  } else if (h < 180) {
    gp = c;
    bp = x;
  } else if (h < 240) {
    gp = x;
    bp = c;
  } else if (h < 300) {
    rp = x;
    bp = c;
  } else {
    rp = c;
    bp = x;
  }

  const toHex = (n) =>
    Math.round((n + m) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(rp)}${toHex(gp)}${toHex(bp)}`.toLowerCase();
}

// --- Campaign status helpers ---

/**
 * Compute the display status of a campaign.
 * @param {{ isActive: boolean, startDate?: Date | null, endDate?: Date | null }} campaign
 * @returns {{ label: string, tone: string }}
 */
export function getCampaignStatus(campaign) {
  const now = new Date();

  if (!campaign.isActive) {
    return { label: "Inactive", tone: "default" };
  }

  if (campaign.startDate && campaign.startDate > now) {
    return { label: "Scheduled", tone: "info" };
  }

  if (campaign.endDate && campaign.endDate <= now) {
    return { label: "Ended", tone: "default" };
  }

  return { label: "Active", tone: "success" };
}

/**
 * Format a number with locale-aware thousand separators.
 * @param {number} value
 * @returns {string}
 */
export function formatNumber(value) {
  return value.toLocaleString("en-US");
}
