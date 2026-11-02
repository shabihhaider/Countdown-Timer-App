/**
 * S2-13: count and expiry must land together. Sent as two commands, a failure
 * between them leaves a counter with no expiry, which blocks that key for good.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { isRateLimited } from "../../app/redis.server.js";

const client = vi.hoisted(() => ({
  status: "ready",
  on: vi.fn(),
  eval: vi.fn(),
  incr: vi.fn(),
  expire: vi.fn(),
}));

vi.mock("../../app/env.server", () => ({ env: { REDIS_URL: "redis://localhost:6379" } }));
vi.mock("ioredis", () => ({ default: vi.fn().mockImplementation(() => client) }));

beforeEach(() => {
  vi.clearAllMocks();
  client.eval.mockResolvedValue(1);
});

describe("isRateLimited with Redis", () => {
  it("counts and sets the expiry in one atomic script", async () => {
    await isRateLimited("track:1.2.3.4", 20, 60);

    expect(client.eval).toHaveBeenCalledTimes(1);
    const [script, keyCount, key, windowSeconds] = client.eval.mock.calls[0];
    expect(script).toContain("INCR");
    expect(script).toContain("EXPIRE");
    expect(keyCount).toBe(1);
    expect(key).toBe("rl:track:1.2.3.4");
    expect(windowSeconds).toBe(60);
    expect(client.incr).not.toHaveBeenCalled();
    expect(client.expire).not.toHaveBeenCalled();
  });

  it("repairs a counter that already lost its expiry", async () => {
    await isRateLimited("track:1.2.3.5", 20, 60);

    const [script] = client.eval.mock.calls[0];
    expect(script).toContain("TTL");
  });

  it("blocks past the limit and allows up to it", async () => {
    client.eval.mockResolvedValue(20);
    await expect(isRateLimited("k", 20, 60)).resolves.toBe(false);

    client.eval.mockResolvedValue(21);
    await expect(isRateLimited("k", 20, 60)).resolves.toBe(true);
  });

  it("falls back to memory when the script fails", async () => {
    client.eval.mockRejectedValue(new Error("redis gone"));

    await expect(isRateLimited("fallback-key", 1, 60)).resolves.toBe(false);
    await expect(isRateLimited("fallback-key", 1, 60)).resolves.toBe(true);
  });
});
