import { Links, Meta, Outlet, Scripts, ScrollRestoration, useRouteError } from "@remix-run/react";
import { json } from "@remix-run/node";
import { captureRemixErrorBoundaryError } from "@sentry/remix";

export const loader = async () => {
  // Only expose NODE_ENV to client. SENTRY_DSN stays server-side only
  // to prevent quota abuse via fake error injection.
  return json({
    sentryEnv: process.env.NODE_ENV || "development",
  });
};

export default function App() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <link rel="preconnect" href="https://cdn.shopify.com/" />
        <link rel="stylesheet" href="https://cdn.shopify.com/static/fonts/inter/v4/styles.css" />
        <Meta />
        <Links />
      </head>
      <body suppressHydrationWarning>
        <Outlet />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  captureRemixErrorBoundaryError(error);

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <title>Error — Countdown Timer Bar</title>
      </head>
      <body
        style={{ fontFamily: "-apple-system, sans-serif", padding: "2rem", textAlign: "center" }}
      >
        <h1>Something went wrong</h1>
        <p>We've been notified and are looking into it. Please try refreshing the page.</p>
      </body>
    </html>
  );
}
