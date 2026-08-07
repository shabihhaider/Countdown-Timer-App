import { PassThrough } from "stream";
import { renderToPipeableStream } from "react-dom/server";
import { RemixServer } from "@remix-run/react";
import { createReadableStreamFromReadable } from "@remix-run/node";
import { isbot } from "isbot";
import { addDocumentResponseHeaders } from "./shopify.server";

export const streamTimeout = 5000;

/**
 * Public pages that must NOT receive Shopify App Bridge document headers.
 * These pages lack a Polaris AppProvider — injecting App Bridge scripts
 * causes MissingAppProviderError on client-side hydration.
 *
 * All other routes (/, /app/*, /auth/*, /webhooks/*) need the headers
 * for embedded auth token exchange and App Bridge initialization.
 */
const PUBLIC_ROUTES_NO_SHOPIFY = ["/privacy", "/terms", "/health"];

function shouldAddShopifyHeaders(url) {
  const { pathname } = new URL(url);
  return !PUBLIC_ROUTES_NO_SHOPIFY.some((route) => pathname.startsWith(route));
}

export default async function handleRequest(
  request,
  responseStatusCode,
  responseHeaders,
  remixContext
) {
  if (shouldAddShopifyHeaders(request.url)) {
    addDocumentResponseHeaders(request, responseHeaders);
  }
  const userAgent = request.headers.get("user-agent");
  const callbackName = isbot(userAgent ?? "") ? "onAllReady" : "onShellReady";

  return new Promise((resolve, reject) => {
    const { pipe, abort } = renderToPipeableStream(
      <RemixServer context={remixContext} url={request.url} />,
      {
        [callbackName]: () => {
          const body = new PassThrough();
          const stream = createReadableStreamFromReadable(body);

          responseHeaders.set("Content-Type", "text/html");
          resolve(
            new Response(stream, {
              headers: responseHeaders,
              status: responseStatusCode,
            })
          );
          pipe(body);
        },
        onShellError(error) {
          reject(error);
        },
        onError(error) {
          responseStatusCode = 500;
          console.error(error);
        },
      }
    );

    // Automatically timeout the React renderer after 6 seconds, which ensures
    // React has enough time to flush down the rejected boundary contents
    setTimeout(abort, streamTimeout + 1000);
  });
}
