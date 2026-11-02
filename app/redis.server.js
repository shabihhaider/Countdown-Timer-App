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
    // Reconnect with capped backoff, indefinitely: returning null here would
    // leave this singleton dead until the process restarts.
    maxRetriesPerRequest: null,
    retryStrategy: (times) => Math.min(times * 100, 3000),
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
 * @param {string} key - Rate limit key (e.g. IP address, "shop:domain")
 * @param {number} [maxRequests] - Override max requests for this check
 * @param {number} [windowSeconds] - Override window duration for this check
 * @returns {Promise<boolean>} true if the request should be blocked
 */

// One atomic step: as two commands, a failure in between would leave a counter
// with no expiry, blocking that key for good. TTL < 0 also repairs such a key.
const INCR_WITH_EXPIRY = `
local count = redis.call('INCR', KEYS[1])
if redis.call('TTL', KEYS[1]) < 0 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
end
return count`;

// In-memory fallback (used when Redis is not configured)
const fallbackMap = new Map();

export async function isRateLimited(key, maxRequests, windowSeconds) {
  const max = maxRequests ?? RATE_LIMIT_MAX;
  const windowSec = windowSeconds ?? RATE_LIMIT_WINDOW_SEC;
  const client = getRedis();

  if (client && client.status === "ready") {
    try {
      const redisKey = `rl:${key}`;
      const count = await client.eval(INCR_WITH_EXPIRY, 1, redisKey, windowSec);
      return count > max;
    } catch {
      // Redis error — fall through to in-memory
    }
  }

  // In-memory fallback
  const now = Date.now();
  const windowMs = windowSec * 1000;
  const entry = fallbackMap.get(key);

  if (!entry || now - entry.windowStart > windowMs) {
    fallbackMap.set(key, { windowStart: now, count: 1 });
    return false;
  }

  entry.count += 1;
  return entry.count > max;
}

const MAX_FALLBACK_ENTRIES = 10000;

// Periodically clean up the fallback map to prevent unbounded growth
setInterval(() => {
  if (fallbackMap.size > MAX_FALLBACK_ENTRIES) {
    fallbackMap.clear();
    return;
  }
  const now = Date.now();
  const windowMs = RATE_LIMIT_WINDOW_SEC * 1000 * 2;
  for (const [key, entry] of fallbackMap.entries()) {
    if (now - entry.windowStart > windowMs) fallbackMap.delete(key);
  }
}, RATE_LIMIT_WINDOW_SEC * 1000);

// Short-lived JSON cache. Same fallback rule as the limiter: memory while Redis is down.
const fallbackCache = new Map();
const MAX_FALLBACK_CACHE_ENTRIES = 5000;

function writeFallbackCache(key, raw, ttlSeconds) {
  if (fallbackCache.size >= MAX_FALLBACK_CACHE_ENTRIES) fallbackCache.clear();
  fallbackCache.set(key, { raw, expiresAt: Date.now() + ttlSeconds * 1000 });
}

function readFallbackCache(key) {
  const entry = fallbackCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    fallbackCache.delete(key);
    return null;
  }
  return entry.raw;
}

/**
 * @param {string} key
 * @returns {Promise<any | null>} the cached value, or null on a miss or corrupt data
 */
export async function readCache(key) {
  const client = getRedis();
  let raw = null;

  if (client && client.status === "ready") {
    try {
      raw = await client.get(`cache:${key}`);
    } catch {
      raw = readFallbackCache(key);
    }
  } else {
    raw = readFallbackCache(key);
  }

  if (raw === null) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Removes the Redis copy and this instance's memory copy. Other instances keep
 * their memory copy until its TTL ends, because nothing can reach them from here.
 * @param {string} key
 * @returns {Promise<void>}
 * @throws when Redis is ready but the delete fails, so callers can report it
 */
export async function deleteCache(key) {
  fallbackCache.delete(key);
  const client = getRedis();
  if (client && client.status === "ready") {
    await client.del(`cache:${key}`);
  }
}

/**
 * @param {string} key
 * @param {unknown} value - JSON-serializable
 * @param {number} ttlSeconds
 * @returns {Promise<void>}
 */
export async function writeCache(key, value, ttlSeconds) {
  const raw = JSON.stringify(value);
  const client = getRedis();

  if (client && client.status === "ready") {
    try {
      await client.set(`cache:${key}`, raw, "EX", ttlSeconds);
      return;
    } catch {
      // Redis error — fall through to in-memory
    }
  }
  writeFallbackCache(key, raw, ttlSeconds);
}
