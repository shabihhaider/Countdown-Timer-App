/**
 * The Redis client must keep trying to reconnect: returning null from
 * retryStrategy ends the connection for the life of the process, leaving the
 * rate limiter per-instance after any outage longer than a few seconds.
 */

import { describe, expect, it, vi } from "vitest";
import Redis from "ioredis";
import { isRateLimited } from "../../app/redis.server.js";

vi.mock("../../app/env.server", () => ({ env: { REDIS_URL: "redis://localhost:6379" } }));
vi.mock("ioredis", () => ({
  default: vi.fn().mockImplementation(() => ({ status: "close", on: vi.fn() })),
}));

describe("Redis retryStrategy", () => {
  it("never gives up and caps the delay", async () => {
    await isRateLimited("reconnect-test");

    const { retryStrategy } = Redis.mock.calls[0][1];
    expect(retryStrategy(1)).toBe(100);
    expect(retryStrategy(11)).toBe(1100);
    expect(retryStrategy(10000)).toBe(3000);
  });
});
