// @vitest-environment node
/** Short-lived cache used by the storefront settings path. */
import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";

const redisClient = vi.hoisted(() => ({
  status: "ready",
  on: vi.fn(),
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
}));

vi.mock("ioredis", () => ({
  default: vi.fn(function RedisMock() {
    return redisClient;
  }),
}));
vi.mock("../../app/env.server", () => ({ env: { REDIS_URL: "redis://local.test:1/0" } }));

const { deleteCache, readCache, writeCache } = await import("../../app/redis.server");

describe("readCache / writeCache", () => {
  beforeEach(() => {
    redisClient.status = "ready";
    redisClient.get.mockReset();
    redisClient.set.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("deleteCache removes the Redis key", async () => {
    redisClient.del.mockResolvedValue(1);
    await deleteCache("k");
    expect(redisClient.del).toHaveBeenCalledWith("cache:k");
  });

  test("deleteCache removes this instance's memory copy while Redis is down", async () => {
    redisClient.status = "reconnecting";
    await writeCache("mem", { a: 1 }, 60);
    await expect(readCache("mem")).resolves.toEqual({ a: 1 });

    await deleteCache("mem");

    await expect(readCache("mem")).resolves.toBeNull();
  });

  test("stores JSON in Redis with a TTL", async () => {
    await writeCache("k", { a: 1 }, 60);
    expect(redisClient.set).toHaveBeenCalledWith("cache:k", '{"a":1}', "EX", 60);
  });

  test("reads JSON from Redis", async () => {
    redisClient.get.mockResolvedValue('{"a":1}');
    await expect(readCache("k")).resolves.toEqual({ a: 1 });
  });

  test("returns null for a Redis miss", async () => {
    redisClient.get.mockResolvedValue(null);
    await expect(readCache("missing")).resolves.toBeNull();
  });

  test("treats corrupt Redis data as a miss instead of throwing", async () => {
    redisClient.get.mockResolvedValue("{not json");
    await expect(readCache("corrupt")).resolves.toBeNull();
  });

  test("uses memory while Redis is down", async () => {
    redisClient.status = "reconnecting";
    await writeCache("mem", { b: 2 }, 60);
    expect(redisClient.set).not.toHaveBeenCalled();
    await expect(readCache("mem")).resolves.toEqual({ b: 2 });
  });

  test("falls back to memory when a Redis write fails", async () => {
    redisClient.set.mockRejectedValue(new Error("boom"));
    await writeCache("failed-write", { c: 3 }, 60);
    redisClient.status = "reconnecting";
    await expect(readCache("failed-write")).resolves.toEqual({ c: 3 });
  });

  test("expires memory entries", async () => {
    vi.useFakeTimers();
    redisClient.status = "reconnecting";
    await writeCache("short", { d: 4 }, 1);
    vi.advanceTimersByTime(1500);
    await expect(readCache("short")).resolves.toBeNull();
  });
});
