/**
 * Sentry client-side initialization.
 * Captures React rendering errors, unhandled promise rejections,
 * and client-side navigation errors.
 *
 * Only initializes when SENTRY_DSN is baked into the build via
 * the root loader (passed as window.__SENTRY_DSN__).
 */
import * as Sentry from "@sentry/remix";
import { useLocation, useMatches } from "@remix-run/react";
import { useEffect } from "react";

const dsn = typeof window !== "undefined" ? window.__SENTRY_DSN__ : undefined;

if (dsn) {
  Sentry.init({
    dsn,
    environment: typeof window !== "undefined" ? window.__SENTRY_ENV__ : "development",
    tracesSampleRate: 0.2,

    integrations: [
      Sentry.browserTracingIntegration({
        useEffect,
        useLocation,
        useMatches,
      }),
    ],

    // Don't capture hydration warnings from browser extensions (Grammarly, etc.)
    beforeSend(event) {
      const message = event.exception?.values?.[0]?.value || "";
      if (message.includes("Hydration failed")) return null;
      if (message.includes("Extra attributes from the server")) return null;
      return event;
    },
  });
}

export { Sentry };
