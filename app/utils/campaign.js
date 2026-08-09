/**
 * Shared campaign utilities — form field mapping, validation, color conversion.
 * Used by dashboard, campaign CRUD routes, and settings form.
 */

// --- Default form values for a new campaign ---
export const DEFAULT_CAMPAIGN_FORM = {
  name: "My Sale",
  barMessage: "Flash Sale Ends In...",
  buttonText: "Shop Now",
  buttonLink: "/collections/all",
  discountCode: "",
  timerType: "one_time",
  startDate: "",
  endDate: "",
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  dailyResetTime: "00:00",
  evergreenMinutes: "30",
  fontFamily: "system",
  barColor: "#288d40",
  textColor: "#ffffff",
  buttonTextColor: "#111111",
  buttonBgColor: "#ffffff",
  barPosition: "top",
  endAction: "hide",
  customEndMessage: "",
};

/** Font family options — web-safe fonts with zero external loading. */
export const FONT_OPTIONS = [
  { label: "System default", value: "system" },
  { label: "Theme font (inherit)", value: "inherit" },
  { label: "Georgia (serif)", value: "Georgia, serif" },
  { label: "Times New Roman (serif)", value: "'Times New Roman', serif" },
  { label: "Verdana (sans-serif)", value: "Verdana, sans-serif" },
  { label: "Trebuchet MS (sans-serif)", value: "'Trebuchet MS', sans-serif" },
  { label: "Courier New (monospace)", value: "'Courier New', monospace" },
  { label: "Impact (display)", value: "Impact, sans-serif" },
];

/** Page targeting mode options. */
export const PAGE_TARGETING_MODES = [
  { label: "Show on all pages", value: "all" },
  { label: "Only show on these pages", value: "include" },
  { label: "Hide on these pages", value: "exclude" },
];

/** Common timezones grouped by region for the timezone selector. */
export const TIMEZONE_OPTIONS = [
  { label: "UTC", value: "UTC" },
  { label: "── Americas ──", value: "", disabled: true },
  { label: "Eastern Time (ET)", value: "America/New_York" },
  { label: "Central Time (CT)", value: "America/Chicago" },
  { label: "Mountain Time (MT)", value: "America/Denver" },
  { label: "Pacific Time (PT)", value: "America/Los_Angeles" },
  { label: "Alaska (AKT)", value: "America/Anchorage" },
  { label: "Hawaii (HST)", value: "Pacific/Honolulu" },
  { label: "São Paulo (BRT)", value: "America/Sao_Paulo" },
  { label: "Toronto (ET)", value: "America/Toronto" },
  { label: "── Europe ──", value: "", disabled: true },
  { label: "London (GMT/BST)", value: "Europe/London" },
  { label: "Paris (CET)", value: "Europe/Paris" },
  { label: "Berlin (CET)", value: "Europe/Berlin" },
  { label: "Amsterdam (CET)", value: "Europe/Amsterdam" },
  { label: "Istanbul (TRT)", value: "Europe/Istanbul" },
  { label: "Moscow (MSK)", value: "Europe/Moscow" },
  { label: "── Asia / Pacific ──", value: "", disabled: true },
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
    fontFamily: campaign.fontFamily,
    barColor: campaign.backgroundColor,
    textColor: campaign.textColor,
    buttonTextColor: campaign.buttonTextColor,
    buttonBgColor: campaign.buttonBackgroundColor,
    barPosition: campaign.position,
    endAction: campaign.endAction,
    customEndMessage: campaign.customEndMessage,
    pageTargeting: campaign.pageTargeting,
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
    evergreenMinutes: parseInt(form.evergreenMinutes, 10) || 30,
    fontFamily: form.fontFamily || "system",
    backgroundColor: form.barColor,
    textColor: form.textColor || "#ffffff",
    buttonTextColor: form.buttonTextColor || "#111111",
    buttonBackgroundColor: form.buttonBgColor || "#ffffff",
    position: form.barPosition,
    endAction: form.endAction,
    customEndMessage: form.customEndMessage,
    pageTargeting: form.pageTargeting || "[]",
  };
}

// --- Validation ---

/**
 * @param {string} link
 * @returns {boolean}
 */
export function isValidButtonLink(link) {
  if (!link) return true;
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
export function validateCampaignForm(raw) {
  const errors = {};

  if (!raw.barMessage) {
    errors.barMessage = "Bar message is required.";
  } else if (raw.barMessage.length > 200) {
    errors.barMessage = "Bar message must be 200 characters or fewer.";
  }

  if (raw.startDate) {
    const startMs = new Date(raw.startDate).getTime();
    if (isNaN(startMs)) {
      errors.startDate = "Start date is not a valid date.";
    }
  }

  if (!raw.endDate) {
    errors.endDate = "End date is required.";
  } else {
    const endMs = new Date(raw.endDate).getTime();
    if (isNaN(endMs)) {
      errors.endDate = "End date is not a valid date.";
    } else if (endMs <= Date.now()) {
      errors.endDate = "End date must be in the future.";
    }

    // Start date must be before end date
    if (raw.startDate && !errors.startDate && !errors.endDate) {
      const startMs = new Date(raw.startDate).getTime();
      if (startMs >= endMs) {
        errors.startDate = "Start date must be before end date.";
      }
    }
  }

  if (raw.buttonLink && !isValidButtonLink(raw.buttonLink)) {
    errors.buttonLink =
      "Button link must be a relative path (e.g. /collections/all) or a full URL starting with https://.";
  }

  if (raw.endAction === "show_custom" && !raw.customEndMessage) {
    errors.customEndMessage = "Custom end message is required when this action is selected.";
  }

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
