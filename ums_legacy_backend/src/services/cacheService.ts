/**
 * BMI UMS - Caching Service
 *
 * Two-tier caching: Redis (when available) → In-Memory (always available).
 * Used by route handlers to cache expensive query results (dashboard stats, etc.)
 *
 * Usage:
 *   const data = await cache.getOrSet('dashboard_stats', () => fetchStats(), 30_000);
 */
import { logger } from "../utils/logger.js";

// ── In-Memory Cache ───────────────────────────────────────────────────
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const memoryCache = new Map<string, CacheEntry<any>>();

// Clean up expired entries every 60 seconds
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of memoryCache.entries()) {
    if (entry.expiresAt <= now) {
      memoryCache.delete(key);
    }
  }
}, 60 * 1000);

// ── Redis Client (shared with tokenBlacklist) ─────────────────────────
let redis: any = null;
let redisAvailable = false;
let redisInitAttempted = false;

async function getRedis(): Promise<any> {
  if (redis && redisAvailable) return redis;
  if (redisInitAttempted && !redisAvailable) return null;

  redisInitAttempted = true;

  if (process.env.REDIS_ENABLED !== "true") return null;

  try {
    const Redis = (await import("ioredis")).default as any;
    const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

    redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 2,
      connectTimeout: 3000,
      lazyConnect: true,
      retryStrategy(times: number) {
        if (times > 3) return null;
        return Math.min(times * 200, 2000);
      },
    });

    await redis.connect();
    redisAvailable = true;

    redis.on("error", () => {
      redisAvailable = false;
    });
    redis.on("ready", () => {
      redisAvailable = true;
    });
    redis.on("close", () => {
      redisAvailable = false;
    });

    return redis;
  } catch (error) { redisAvailable = false;
    return null;
  }
}

// ── Cache API ─────────────────────────────────────────────────────────

export const cache = {
  /**
   * Get a value from cache, or compute and store it if missing.
   * This is the primary API — most route handlers should use this.
   *
   * @param key Cache key (should be namespaced, e.g., 'dashboard:stats')
   * @param factory Function that produces the value if not cached
   * @param ttlMs Time-to-live in milliseconds (default: 30 seconds)
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttlMs: number = 30_000,
  ): Promise<T> {
    // Try Redis first
    const client = await getRedis();
    if (client && redisAvailable) {
      try {
        const cached = await client.get(`cache:${key}`);
        if (cached) {
          try {
            return JSON.parse(cached) as T;
          } catch (error) {
            // Corrupted cache entry — remove and recompute
            await client.del(`cache:${key}`);
          }
        }

        // Not in cache — compute
        const data = await factory();
        await client.setex(
          `cache:${key}`,
          Math.ceil(ttlMs / 1000),
          JSON.stringify(data),
        );
        return data;
      } catch (error) {
        logger.debug({ err: error }, `Redis cache error for key '${key}'`);
      }
    }

    // In-memory fallback
    const entry = memoryCache.get(key);
    if (entry && entry.expiresAt > Date.now()) {
      return entry.data as T;
    }

    // Not in cache — compute
    const data = await factory();
    memoryCache.set(key, { data, expiresAt: Date.now() + ttlMs });
    return data;
  },

  /**
   * Invalidate a cache entry
   */
  async invalidate(key: string): Promise<void> {
    // Redis
    const client = await getRedis();
    if (client && redisAvailable) {
      try {
        await client.del(`cache:${key}`);
      } catch (error) {
        /* ignore */
      }
    }

    // In-memory
    memoryCache.delete(key);
  },

  /**
   * Invalidate all cache entries matching a prefix
   */
  async invalidatePattern(prefix: string): Promise<void> {
    // Redis
    const client = await getRedis();
    if (client && redisAvailable) {
      try {
        const keys = await client.keys(`cache:${prefix}*`);
        if (keys.length > 0) {
          await client.del(...keys);
        }
      } catch (error) {
        /* ignore */
      }
    }

    // In-memory
    for (const key of memoryCache.keys()) {
      if (key.startsWith(prefix)) {
        memoryCache.delete(key);
      }
    }
  },

  /**
   * Get current cache statistics (for monitoring)
   */
  getStats() {
    return {
      memorySize: memoryCache.size,
      redisAvailable,
    };
  },
};






