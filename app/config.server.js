// Centralized configuration constants. All hardcoded values belong here.

export const RATE_LIMIT = {
  WINDOW_SECONDS: parseInt(process.env.RATE_LIMIT_WINDOW || "60", 10),
  MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX || "60", 10),
};

export const DEFAULTS = {
  BAR_COLOR: "#288d40",
  BAR_MESSAGE: "Flash Sale Ends In...",
  BUTTON_TEXT: "Shop Now",
  BUTTON_URL: "/collections/all",
  POSITION: "top",
  END_ACTION: "hide",
  TIMEZONE: "UTC",
};
