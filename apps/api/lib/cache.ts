/**
 * KV Cache-Aside Helper for Cloudflare Workers & Neon Database.
 *
 * Implements the cache-aside pattern:
 * 1. Read from KV cache first.
 * 2. On hit -> return cached data immediately (skips DB query, zero compute).
 * 3. On miss -> execute DB query (Neon/D1), populate KV cache with TTL, return data.
 * 4. On write -> invalidate cache key(s).
 */

export interface CacheAsideOptions {
  ttlSeconds?: number;
}

export interface CacheResult<T> {
  data: T;
  hit: boolean;
}

/**
 * Execute cache-aside lookup against KV storage.
 *
 * @param kv The Cloudflare KV namespace binding (or mock KV)
 * @param key The unique cache key (e.g. `catalog:courses:p1:per20`)
 * @param fetcher Async fallback function to execute on cache miss
 * @param options Options including TTL in seconds (default: 3600 = 1 hr)
 */
export async function cacheAside<T>(
  kv: { get: (key: string, type?: string) => Promise<any>; put: (key: string, val: string, opts?: any) => Promise<void> } | null | undefined,
  key: string,
  fetcher: () => Promise<T>,
  options: CacheAsideOptions = {}
): Promise<CacheResult<T>> {
  const ttlSeconds = options.ttlSeconds ?? 3600;

  // Fallback if KV is not configured or in test environments without KV
  if (!kv) {
    const data = await fetcher();
    return { data, hit: false };
  }

  try {
    const cached = await kv.get(key, 'json');
    if (cached !== null && cached !== undefined) {
      return { data: cached as T, hit: true };
    }
  } catch {
    // If KV get fails, fall through gracefully to DB fetcher
  }

  const data = await fetcher();

  try {
    if (data !== undefined && data !== null) {
      await kv.put(key, JSON.stringify(data), { expirationTtl: ttlSeconds });
    }
  } catch {
    // Non-blocking catch on cache write failure
  }

  return { data, hit: false };
}

/**
 * Invalidate a single cache key from KV.
 */
export async function invalidateCacheKey(
  kv: { delete: (key: string) => Promise<void> } | null | undefined,
  key: string
): Promise<void> {
  if (!kv) return;
  try {
    await kv.delete(key);
  } catch {
    // Non-blocking catch
  }
}

/**
 * Invalidate multiple cache keys from KV.
 */
export async function invalidateCacheKeys(
  kv: { delete: (key: string) => Promise<void> } | null | undefined,
  keys: string[]
): Promise<void> {
  if (!kv || keys.length === 0) return;
  await Promise.all(keys.map((k) => invalidateCacheKey(kv, k)));
}

/**
 * Invalidate all cached keys sharing a prefix (e.g. `catalog:courses:`).
 * KV list() supports prefix listing; used on writes so page/query variants
 * of a catalog entry are evicted together instead of waiting for TTL.
 */
export async function invalidateCachePrefix(
  kv: { list?: (prefix?: string) => Promise<string[]>; delete: (key: string) => Promise<void> } | null | undefined,
  prefix: string
): Promise<void> {
  if (!kv || typeof kv.list !== 'function') return;
  try {
    const keys = await kv.list(prefix);
    if (keys.length > 0) {
      await Promise.all(keys.map((k) => invalidateCacheKey(kv, k)));
    }
  } catch {
    // Non-blocking catch
  }
}
