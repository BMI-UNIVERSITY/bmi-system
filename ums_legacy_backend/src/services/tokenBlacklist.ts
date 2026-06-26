/**
 * BMI UMS - Token Blacklist (Redis + In-Memory Fallback)
 *
 * Architecture:
 * - Primary: Redis (works across multiple API instances)
 * - Fallback: In-memory Map (for single-instance / development)
 *
 * Redis keys: `blacklist:{jti}` with TTL = remaining token lifetime
 * Automatically falls back to in-memory when Redis is unavailable.
 *
 * Migration from Sprint 1-2: The in-memory blacklist is replaced with
 * a dual-mode blacklist that uses Redis when available.
 */
import { createHash } from "crypto";
import { logger } from "../utils/logger.js";

// ── In-Memory Fallback ────────────────────────────────────────────────
interface BlacklistEntry {
  expiresAt: number;
}

const inMemoryBlacklist = new Map<string, BlacklistEntry>();

// Clean up expired entries every 5 minutes
setInterval(
  () => {
    const now = Date.now();
    for (const [token, entry] of inMemoryBlacklist.entries()) {
      if (entry.expiresAt <= now) {
        inMemoryBlacklist.delete(token);
      }
    }
  },
  5 * 60 * 1000,
);

// ── Redis Client (lazy init) ──────────────────────────────────────────
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
        if (times > 3) {
          logger.warn(
            "Redis connection failed after 3 retries, using in-memory blacklist",
          );
          return null; // Stop retrying
        }
        return Math.min(times * 200, 2000);
      },
    });

    await redis.connect();
    redisAvailable = true;

    redis.on("error", (error: Error) => {
      logger.warn({ err: error }, "Redis error");
      redisAvailable = false;
    });

    redis.on("ready", () => {
      redisAvailable = true;
      logger.info("Redis connected — token blacklist using Redis");
    });

    redis.on("close", () => {
      redisAvailable = false;
      logger.warn(
        "Redis connection closed — falling back to in-memory blacklist",
      );
    });

    logger.info("Token blacklist: Redis mode enabled");
    return redis;
  } catch (error) {
    logger.warn(
      { err: error },
      "Redis unavailable, using in-memory token blacklist",
    );
    redisAvailable = false;
    return null;
  }
}

// ── Public API ────────────────────────────────────────────────────────



/**
 * Add a token to the blacklist until it naturally expires.
 * Uses Redis when available, otherwise falls back to in-memory.
 */
export async function revokeToken(
  token: string,
  expiresAtMs: number,
): Promise<void> {
  const ttlSeconds = Math.max(1, Math.floor((expiresAtMs - Date.now()) / 1000));

  // Try Redis first
  const client = await getRedis();
  if (client && redisAvailable) {
    try {
      // Use a hash of the token as the key (avoid storing full token in Redis)
      const key = `blacklist:${hashToken(token)}`;
      await client.setex(key, ttlSeconds, "1");
      logger.debug(`Token revoked in Redis, TTL=${ttlSeconds}s`);
      return;
    } catch (error) {
      logger.warn({ err: error }, "Redis revoke failed, falling back to in-memory");
    }
  }

  // In-memory fallback — store the HASHED token to avoid keeping raw JWTs in
  // process memory (same security property as the Redis path).
  inMemoryBlacklist.set(hashToken(token), { expiresAt: expiresAtMs });
}

/**
 * Check if a token has been revoked.
 * Uses Redis when available, otherwise falls back to in-memory.
 */
export async function isTokenRevoked(token: string): Promise<boolean> {
  // Try Redis first
  const client = await getRedis();
  if (client && redisAvailable) {
    try {
      const key = `blacklist:${hashToken(token)}`;
      const result = await client.get(key);
      return result === "1";
    } catch (error) {
      logger.warn({ err: error }, "Redis check failed, falling back to in-memory");
    }
  }

  // In-memory fallback — look up by hashed token to match the revokeToken path.
  const hashedToken = hashToken(token);
  const entry = inMemoryBlacklist.get(hashedToken);
  if (!entry) return false;
  if (entry.expiresAt <= Date.now()) {
    inMemoryBlacklist.delete(hashedToken);
    return false;
  }
  return true;
}

/**
 * Synchronous version of isTokenRevoked for backward compatibility.
 * Only checks the in-memory blacklist (not Redis).
 * Use the async version for full Redis-backed checks.
 */
export function isTokenRevokedSync(token: string): boolean {
  const hashedToken = hashToken(token);
  const entry = inMemoryBlacklist.get(hashedToken);
  if (!entry) return false;
  if (entry.expiresAt <= Date.now()) {
    inMemoryBlacklist.delete(hashedToken);
    return false;
  }
  return true;
}

/**
 * Get current blacklist size (for monitoring)
 */
export function getBlacklistSize(): number {
  return inMemoryBlacklist.size;
}

/**
 * Check if Redis is currently available
 */
export function isRedisAvailable(): boolean {
  return redisAvailable;
}

// ── Helpers ────────────────────────────────────────────────────────────

/**
 * SHA-256 hash of token for Redis key.
 * Avoids storing the full JWT while providing 128-bit collision resistance.
 */
function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex").slice(0, 32);
}






