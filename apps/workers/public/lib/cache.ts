/**
 * bmi-public — KV Cache Layer
 *
 * Strategy: KV Snapshot + Cloudflare Cache API (two-tier)
 *
 * Tier 1 — Cloudflare Cache API (edge, ~0ms): populated from KV on first request
 * Tier 2 — KV namespace (regional, <5ms): populated by the scheduled cron
 * Tier 3 — D1 (fallback only, ~10ms): queried only on cache MISS, never during cron
 *
 * Per-request D1 access is never intentional. The cron owns D1 exclusively.
 *
 * TTL Reference (cache.md §8):
 *   programs, stats  → 300s
 *   cms/posts list   → 120s
 *   cms/posts/:slug  → 300s
 *   cms/pages/:slug  → 600s
 */

import type { Env } from './types';
import { createLogger } from '@bmi/api-middleware';

const log = createLogger('bmi-public');

export interface CacheOptions {
  /** KV key for storing the snapshot */
  kvKey: string;
  /** TTL in seconds for both KV expiration and Cache-Control header */
  ttlSeconds: number;
  /** D1 fallback fetcher — called only on complete cache miss */
  fetcher: () => Promise<unknown>;
}

/**
 * Serve a public GET response from cache. Order of resolution:
 * 1. Cloudflare Cache API (edge-level, fastest)
 * 2. KV namespace (regional snapshot from cron)
 * 3. D1 direct query (cold-start fallback only)
 */
export async function cachedResponse(
  request: Request,
  env: Env,
  opts: CacheOptions,
): Promise<Response> {
  const cache = caches.default;
  // Use a stable synthetic URL as the cache key (avoids query-string variance)
  const cacheKey = new Request(`https://cache.bmi-public/${opts.kvKey}`);

  // ── Tier 1: Cloudflare Cache API ────────────────────────────────────────────
  const edgeCached = await cache.match(cacheKey);
  if (edgeCached) {
    const h = new Headers(edgeCached.headers);
    h.set('X-Cache', 'HIT-EDGE');
    return new Response(edgeCached.body, { status: 200, headers: h });
  }

  // ── Tier 2: KV Snapshot ──────────────────────────────────────────────────────
  const kvData = await env.CF_CACHE.get(opts.kvKey, 'json');
  if (kvData !== null) {
    const res = buildResponse(kvData, opts.ttlSeconds, 'HIT-KV');
    // Backfill edge cache from KV so next request is instant
    await cache.put(cacheKey, res.clone());
    return res;
  }

  // ── Tier 3: D1 Fallback (cold-start only) ───────────────────────────────────
  log.warn('Cache MISS — falling through to D1', { key: opts.kvKey });
  const data = await opts.fetcher();

  // Populate KV so the cron has something to work with on first boot
  await env.CF_CACHE.put(opts.kvKey, JSON.stringify(data), {
    expirationTtl: opts.ttlSeconds,
  });

  const res = buildResponse(data, opts.ttlSeconds, 'MISS');
  await cache.put(cacheKey, res.clone());
  return res;
}

/**
 * Invalidate a specific KV key. Called by the cron when it has written a
 * fresh snapshot so the next request triggers a Cache API backfill.
 */
export async function invalidateCacheKey(env: Env, kvKey: string): Promise<void> {
  const cache = caches.default;
  await cache.delete(new Request(`https://cache.bmi-public/${kvKey}`));
  // KV is updated by the cron directly — no delete needed here
}

function buildResponse(data: unknown, ttlSeconds: number, cacheStatus: string): Response {
  return new Response(JSON.stringify({ success: true, data }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': `public, max-age=${ttlSeconds}, stale-while-revalidate=${ttlSeconds * 2}`,
      'Surrogate-Control': `max-age=${ttlSeconds * 12}`,
      'X-Cache': cacheStatus,
    },
  });
}
