// app/shutdown.server.js
/* eslint-disable no-console -- console is intentional here: the pino transport may already be torn down during process shutdown */
// Graceful shutdown handlers for SIGTERM/SIGINT.
// Imported by entry.server.jsx to ensure cleanup on process exit.

import db from "./db.server";

let isShuttingDown = false;

function shutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`[shutdown] ${signal} received — closing connections...`);

  // Close Prisma connection
  db.$disconnect()
    .then(() => console.log("[shutdown] Database disconnected"))
    .catch((err) => console.error("[shutdown] Database disconnect error:", err.message))
    .finally(() => {
      console.log("[shutdown] Exiting");
      process.exit(0);
    });

  // Force exit after 10 seconds if graceful shutdown hangs
  setTimeout(() => {
    console.error("[shutdown] Forced exit after 10s timeout");
    process.exit(1);
  }, 10000).unref();
}

// Only register handlers once (prevent duplicate registration on HMR)
if (!global.__shutdownRegistered) {
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
  global.__shutdownRegistered = true;
}
