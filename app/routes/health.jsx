import { json } from "@remix-run/node";
import db from "../db.server";

// Health check endpoint used by nginx and Docker health checks.
// Returns 200 when the app and database are reachable; 503 otherwise.
export const loader = async () => {
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
