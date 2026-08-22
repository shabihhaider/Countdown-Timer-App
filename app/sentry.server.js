/**
 * Sentry server-side initialization.
 * Captures unhandled exceptions, request errors, and performance data.
 *
 * Requires SENTRY_DSN environment variable. When not set, Sentry is
 * disabled (safe for local development).
 */
import * as Sentry from "@sentry/remix";
import { logger } from "./utils/logger.server";

let initialized = false;

/**
 * Initialize Sentry. Called from entry.server.jsx to ensure env vars
 * are loaded before init runs. Safe to call multiple times — only
 * initializes once.
 */
export function initSentry() {
  if (initialized) return;
  initialized = true;

  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    logger.info("sentry.disabled — SENTRY_DSN not set");
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || "development",
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,

    beforeSend(event) {
      const message = event.exception?.values?.[0]?.value || "";
      if (message.includes("Too many requests")) return null;
      if (message.includes("Invalid shop parameter")) return null;
      if (message.includes("public distribution")) return null;
      return event;
    },
  });

  logger.info("sentry.initialized");
}

export { Sentry };
