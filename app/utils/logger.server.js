/**
 * Structured logging utility using Pino.
 *
 * - Production: JSON to stdout (captured by Vercel/Axiom)
 * - Development: Pretty-printed with colors
 *
 * Usage:
 *   import { logger, createRequestLogger } from "../utils/logger.server";
 *   const log = createRequestLogger(request, shop);
 *   log.info({ campaignId: 1 }, "campaign.created");
 */
import pino from "pino";

const isProduction = process.env.NODE_ENV === "production";

export const logger = pino({
  level: isProduction ? "info" : "debug",
  transport: isProduction
    ? undefined // JSON to stdout in production (Vercel captures it)
    : { target: "pino-pretty", options: { colorize: true } },
  redact: {
    paths: ["req.headers.authorization", "req.headers.cookie", "accessToken"],
    censor: "[REDACTED]",
  },
  base: {
    service: "countdown-timer-app",
    env: process.env.NODE_ENV || "development",
  },
});

/**
 * Create a child logger with request context.
 * @param {Request} request
 * @param {string} [shop]
 * @returns {import("pino").Logger}
 */
export function createRequestLogger(request, shop) {
  const url = new URL(request.url);
  return logger.child({
    shop: shop || "unknown",
    method: request.method,
    path: url.pathname,
  });
}
