import { json } from "@remix-run/node";
import db from "../db.server";
import { isRateLimited } from "../redis.server";

// Health check endpoint used by nginx and Docker health checks.
// Returns 200 when the app and database are reachable; 503 otherwise.
export const loader = async ({ request }) => {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  if (await isRateLimited(`health:${ip}`, 30, 60)) {
    return json({ status: "ok", timestamp: new Date().toISOString() }, { status: 200 });
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
