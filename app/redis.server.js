import Redis from "ioredis";
import { env } from "./env.server";
import { RATE_LIMIT } from "./config.server";

// Singleton Redis client for server-side use only.
// Falls back gracefully when REDIS_URL is not set (e.g. local dev without Docker).

let redis = null;

function getRedis() {
  if (redis) return redis;

  const url = env.REDIS_URL;
  if (!url) return null;

  redis = new Redis(url, {
    // Fail fast — don't queue commands while disconnected
    enableOfflineQueue: false,
    // Reconnect with backoff, up to 10 attempts
    maxRetriesPerRequest: null,
    retryStrategy: (times) => {
      if (times > 10) return null; // stop retrying
      return Math.min(times * 100, 3000);
    },
  });

  redis.on("error", (err) => {
    // Log but don't crash — rate limiter falls back to in-memory
    console.error("[Redis] connection error:", err.message);
  });

  return redis;
}

const RATE_LIMIT_WINDOW_SEC = RATE_LIMIT.WINDOW_SECONDS;
const RATE_LIMIT_MAX = RATE_LIMIT.MAX_REQUESTS;

/**
 * Redis-backed rate limiter. Falls back to a simple in-memory Map when Redis
 * is unavailable so the app continues to work in local dev without Docker.
 *
 * @param {string} ip
 * @returns {Promise<boolean>} true if the request should be blocked
 */

// In-memory fallback (used when Redis is not configured)
const fallbackMap = new Map();

export async function isRateLimited(ip) {
  const client = getRedis();

  if (client && client.status === "ready") {
    try {
      const key = `rl:${ip}`;
      const count = await client.incr(key);
      if (count === 1) {
        // First request in this window — set the expiry
        await client.expire(key, RATE_LIMIT_WINDOW_SEC);
      }
      return count > RATE_LIMIT_MAX;
    } catch {
      // Redis error — fall through to in-memory
    }
  }

  // In-memory fallback
  const now = Date.now();
  const windowMs = RATE_LIMIT_WINDOW_SEC * 1000;
  const entry = fallbackMap.get(ip);

  if (!entry || now - entry.windowStart > windowMs) {
    fallbackMap.set(ip, { windowStart: now, count: 1 });
    return false;
  }

  entry.count += 1;
  return entry.count > RATE_LIMIT_MAX;
}

// Periodically clean up the fallback map to prevent unbounded growth
setInterval(() => {
  const now = Date.now();
  const windowMs = RATE_LIMIT_WINDOW_SEC * 1000 * 2;
  for (const [key, entry] of fallbackMap.entries()) {
    if (now - entry.windowStart > windowMs) fallbackMap.delete(key);
  }
}, RATE_LIMIT_WINDOW_SEC * 1000);
