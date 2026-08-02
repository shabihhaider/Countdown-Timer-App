/**
 * Unit tests for the Redis-backed rate limiter.
 * Tests the in-memory fallback path (used when Redis is unavailable).
 *
 * vi.mock is hoisted by Vitest before static imports, so ioredis is mocked
 * before redis.server.js loads and the fallback Map is exercised.
 */

import { vi, describe, it, expect, afterEach } from "vitest";

// Static import works because vi.mock is hoisted above it
import { isRateLimited } from "../../app/redis.server.js";

// Hoisted mock — in place before redis.server.js resolves its ioredis import
vi.mock("ioredis", () => ({
  default: vi.fn().mockImplementation(() => ({
    status: "close", // Not ready — forces in-memory fallback
    on: vi.fn(),
    incr: vi.fn().mockResolvedValue(1),
    expire: vi.fn().mockResolvedValue(1),
  })),
}));

afterEach(() => {
  vi.useRealTimers();
});

describe("isRateLimited (in-memory fallback)", () => {
  it("does not rate-limit the first request from a fresh IP", async () => {
    const result = await isRateLimited("10.0.0.1");
    expect(result).toBe(false);
  });

  it("allows exactly 60 requests within one window", async () => {
    const ip = "10.0.0.2";
    const results = [];

    for (let i = 0; i < 60; i++) {
      results.push(await isRateLimited(ip));
    }

    expect(results.some(Boolean)).toBe(false);
  });

  it("blocks the 61st request from the same IP", async () => {
    const ip = "10.0.0.3";

    for (let i = 0; i < 60; i++) {
      await isRateLimited(ip);
    }

    const blocked = await isRateLimited(ip);
    expect(blocked).toBe(true);
  });

  it("does not apply one IP's limit to a different IP", async () => {
    const saturated = "10.0.0.4";
    const fresh = "10.0.0.5";

    for (let i = 0; i < 65; i++) {
      await isRateLimited(saturated);
    }

    const result = await isRateLimited(fresh);
    expect(result).toBe(false);
  });

  it("resets the counter after the window expires", async () => {
    vi.useFakeTimers();
    const ip = "10.0.0.6";

    for (let i = 0; i < 61; i++) {
      await isRateLimited(ip);
    }
    expect(await isRateLimited(ip)).toBe(true);

    // Advance past the 60-second window
    vi.advanceTimersByTime(61_000);

    const result = await isRateLimited(ip);
    expect(result).toBe(false);
  });
});
