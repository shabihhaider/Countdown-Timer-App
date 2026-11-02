// @vitest-environment node
/**
 * B11: PrismaSessionStorage rejects a promise nobody handles when Postgres is
 * unreachable at startup, and Node exits on the unhandled rejection.
 */
import { afterEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../app/utils/logger.server", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

const { createSessionStorage } = await import("../../../app/utils/session-storage.server");
const { logger } = await import("../../../app/utils/logger.server");

const FAST = { connectionRetries: 1, connectionRetryIntervalMs: 1, recheckIntervalMs: 5 };
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function fakePrisma(count) {
  return {
    session: { count, findUnique: vi.fn().mockResolvedValue(null) },
  };
}

describe("createSessionStorage", () => {
  const unhandled = vi.fn();

  afterEach(() => {
    process.off("unhandledRejection", unhandled);
    vi.clearAllMocks();
  });

  test("does not leave an unhandled rejection when the database is down", async () => {
    process.on("unhandledRejection", unhandled);
    createSessionStorage(fakePrisma(vi.fn().mockRejectedValue(new Error("down"))), FAST);
    await wait(30);
    expect(unhandled).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalled();
  });

  test("session reads fail cleanly during the outage", async () => {
    const count = vi.fn().mockRejectedValue(new Error("down"));
    const storage = createSessionStorage(fakePrisma(count), FAST);
    await wait(20);
    await expect(storage.loadSession("offline_x")).rejects.toThrow();
  });

  test("recovers without a restart when the database returns", async () => {
    const count = vi.fn().mockRejectedValue(new Error("down"));
    const storage = createSessionStorage(fakePrisma(count), FAST);
    await wait(20);
    count.mockResolvedValue(0);
    await wait(30);
    await expect(storage.loadSession("offline_x")).resolves.toBeUndefined();
  });

  test("works normally with a healthy database", async () => {
    const count = vi.fn().mockResolvedValue(0);
    const storage = createSessionStorage(fakePrisma(count), FAST);
    await expect(storage.loadSession("offline_x")).resolves.toBeUndefined();
    await wait(20);
    expect(count).toHaveBeenCalledTimes(1);
  });
});
