/**
 * Sentry server-side initialization.
 * Captures unhandled exceptions, request errors, and performance data.
 *
 * Requires SENTRY_DSN environment variable. When not set, Sentry is
 * disabled (safe for local development).
 */
import * as Sentry from "@sentry/remix";

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || "development",
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,

    // Filter out expected errors that don't need alerting
    beforeSend(event) {
      const message = event.exception?.values?.[0]?.value || "";

      // Rate limiting responses are expected, not errors
      if (message.includes("Too many requests")) return null;

      // Invalid shop parameters are client errors, not app errors
      if (message.includes("Invalid shop parameter")) return null;

      // Billing API rejections during development
      if (message.includes("public distribution")) return null;

      return event;
    },
  });
}

export { Sentry };
