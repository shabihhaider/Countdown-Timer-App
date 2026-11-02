import { json } from "@remix-run/node";
import db from "../db.server";
import { isRateLimited } from "../redis.server";
import { getClientIp } from "../utils/client-ip.server";

// Health check endpoint used by nginx and Docker health checks.
// Returns 200 when the app and database are reachable; 503 otherwise.
// A rate-limited caller gets 429, never "ok": the database was not checked.
export const loader = async ({ request }) => {
  if (await isRateLimited(`health:${getClientIp(request)}`, 30, 60)) {
    return json(
      { status: "rate_limited" },
      { status: 429, headers: { "Cache-Control": "no-store", "Retry-After": "60" } }
    );
  }
  try {
    // Lightweight DB ping — SELECT 1 equivalent via Prisma
    await db.$queryRaw`SELECT 1`;

    return json(
      { status: "ok", timestamp: new Date().toISOString() },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return json(
      { status: "error", message: "Database unreachable" },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
};
