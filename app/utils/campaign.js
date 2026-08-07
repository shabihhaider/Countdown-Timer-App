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
  endDate: "",
  barColor: "#288d40",
  barPosition: "top",
  endAction: "hide",
  customEndMessage: "",
};

// --- Campaign ↔ Form field mapping ---

/**
 * Maps a Prisma Campaign record to the flat shape used by the campaign form.
 * @param {import("@prisma/client").Campaign} campaign
 * @returns {Record<string, string>}
 */
export function campaignToFormValues(campaign) {
  return {
    name: campaign.name,
    barMessage: campaign.barMessage,
    buttonText: campaign.buttonText,
    buttonLink: campaign.buttonUrl,
    endDate: campaign.endDate
      ? new Date(campaign.endDate.getTime() - new Date().getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16)
      : "",
    barColor: campaign.backgroundColor,
    barPosition: campaign.position,
    endAction: campaign.endAction,
    customEndMessage: campaign.customEndMessage,
  };
}

/**
 * Maps validated form values to Prisma Campaign column names for create/update.
 * @param {Record<string, string>} form
 * @returns {Record<string, unknown>}
 */
export function formValuesToCampaignData(form) {
  return {
    name: form.name || "My Sale",
    barMessage: form.barMessage,
    buttonText: form.buttonText,
    buttonUrl: form.buttonLink,
    endDate: form.endDate ? new Date(form.endDate) : null,
    backgroundColor: form.barColor,
    position: form.barPosition,
    endAction: form.endAction,
    customEndMessage: form.customEndMessage,
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

  if (!raw.endDate) {
    errors.endDate = "End date is required.";
  } else {
    const endMs = new Date(raw.endDate).getTime();
    if (isNaN(endMs)) {
      errors.endDate = "End date is not a valid date.";
    } else if (endMs <= Date.now()) {
      errors.endDate = "End date must be in the future.";
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
