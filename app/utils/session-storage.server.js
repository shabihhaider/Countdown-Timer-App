import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import { logger } from "./logger.server";

const READINESS_RECHECK_MS = 5000;

/**
 * Session storage that survives Postgres being unreachable at startup.
 *
 * PrismaSessionStorage polls for its table in the constructor and rejects
 * `ready` with no handler attached, so Node exits about 30s later, even with no
 * traffic. Its error also claims the session table is missing, which misleads.
 * `ready` is the SDK's own field (v10); ensureReady() reads it, and isReady()
 * replaces it once the table is reachable, so a failed start is not permanent.
 *
 * @param {import("@prisma/client").PrismaClient} prisma
 * @param {{ recheckIntervalMs?: number, connectionRetries?: number, connectionRetryIntervalMs?: number }} [options]
 * @returns {PrismaSessionStorage}
 */
export function createSessionStorage(
  prisma,
  { recheckIntervalMs = READINESS_RECHECK_MS, ...storageOptions } = {}
) {
  const storage = new PrismaSessionStorage(prisma, storageOptions);

  const recheckUntilReady = async () => {
    if (await storage.isReady()) {
      logger.info("session-storage: database reachable again");
      return;
    }
    setTimeout(recheckUntilReady, recheckIntervalMs).unref();
  };

  storage.ready.catch((error) => {
    logger.error(
      { error: error.cause?.message ?? error.message },
      "session-storage: database unreachable or session table missing"
    );
    storage.ready = Promise.resolve(false);
    recheckUntilReady();
  });

  return storage;
}
