/**
 * Client IP for rate limiting.
 *
 * x-real-ip is written by nginx and by Vercel, replacing any value the caller
 * sent. In X-Forwarded-For a caller controls everything except what the proxy
 * appends, so only the LAST hop can be trusted; the first hop is a free choice.
 *
 * Without a proxy in front (local runs) every header here is caller-controlled,
 * so this protects deployed traffic only.
 *
 * @param {Request} request
 * @returns {string}
 */
export function getClientIp(request) {
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  const hops = (request.headers.get("x-forwarded-for") ?? "")
    .split(",")
    .map((hop) => hop.trim())
    .filter(Boolean);
  return hops.at(-1) ?? "unknown";
}
