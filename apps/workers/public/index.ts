/**
 * bmi-public Worker
 *
 * Serves read-only public API endpoints for the BMI marketing site.
 *
 * Architecture:
 *   - All GET requests are served from a two-tier cache (Cache API → KV).
 *   - D1 is ONLY accessed by the scheduled cron (every 5 min) which refreshes the KV snapshot.
 *   - Per-request D1 access is a fallback for cold-starts only (X-Cache: MISS in logs).
 *   - No authentication, no mutations, no write paths.
 *
 * Per cache.md §2a — max_concurrent_requests: 2 in wrangler.jsonc enforces D1 connection limit.
 */

import {
  handlePublicPrograms,
  handlePublicListPosts,
  handlePublicGetPost,
  handlePublicGetPage,
  handlePublicStats,
  KV_KEYS,
  fetchProgramsFromD1,
  fetchStatsFromD1,
  fetchPostsListFromD1,
} from './routes/public';
import { getCorsHeaders } from './lib/types';
import { invalidateCacheKey } from './lib/cache';
import type { Env } from './lib/types';
import { createLogger, requestLogger } from '@bmi/api-middleware';

const log = createLogger('bmi-public');

// ─── Route Table ──────────────────────────────────────────────────────────────

type Handler = (req: Request, env: Env, ...params: string[]) => Promise<Response>;

const ROUTES: { method: string; path: RegExp; handler: Handler }[] = [
  { method: 'GET', path: /^\/api\/public\/programs$/, handler: (req, env) => handlePublicPrograms(req, env) },
  { method: 'GET', path: /^\/api\/public\/stats$/, handler: (req, env) => handlePublicStats(req, env) },
  { method: 'GET', path: /^\/api\/public\/cms\/posts$/, handler: (req, env) => handlePublicListPosts(req, env) },
  { method: 'GET', path: /^\/api\/public\/cms\/posts\/([^/]+)$/, handler: (req, env, slug) => handlePublicGetPost(req, env, slug) },
  { method: 'GET', path: /^\/api\/public\/cms\/pages\/([^/]+)$/, handler: (req, env, slug) => handlePublicGetPage(req, env, slug) },
];

// ─── Worker Entry Point ───────────────────────────────────────────────────────

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const corsHeaders = getCorsHeaders(request, env);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    // Match route
    for (const route of ROUTES) {
      if (route.method !== request.method) continue;
      const match = path.match(route.path);
      if (!match) continue;

      try {
        const response = await route.handler(request, env, ...match.slice(1));
        // Attach CORS headers to every response
        const headers = new Headers(response.headers);
        for (const [k, v] of Object.entries(corsHeaders)) headers.set(k, v);
        return new Response(response.body, { status: response.status, headers });
      } catch (err: any) {
        requestLogger(log, request).error('Handler error', {
          err: err?.message ?? String(err),
          stack: err?.stack?.split('\n')[1]?.trim(),
        });
        return new Response(JSON.stringify({ success: false, error: 'Internal server error' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }
    }

    return new Response(JSON.stringify({ success: false, error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  },

  // ─── Cron: Refresh KV Snapshot Every 5 Minutes ─────────────────────────────
  // This is the ONLY place that queries D1 in this Worker.
  // It pre-populates KV so all GET requests are served from cache.
  async scheduled(_controller: ScheduledController, env: Env, _ctx: ExecutionContext): Promise<void> {
    log.info('Cron: refreshing KV cache snapshots');

    const results = await Promise.allSettled([
      // Programs snapshot (TTL 300s)
      fetchProgramsFromD1(env).then(async (data) => {
        await env.CF_CACHE.put(KV_KEYS.PROGRAMS, JSON.stringify(data), { expirationTtl: 300 });
        await invalidateCacheKey(env, KV_KEYS.PROGRAMS);
        log.info('Cron: programs snapshot refreshed');
      }),

      // Stats snapshot (TTL 300s)
      fetchStatsFromD1(env).then(async (data) => {
        await env.CF_CACHE.put(KV_KEYS.STATS, JSON.stringify(data), { expirationTtl: 300 });
        await invalidateCacheKey(env, KV_KEYS.STATS);
        log.info('Cron: stats snapshot refreshed');
      }),

      // CMS posts list snapshot (TTL 120s)
      fetchPostsListFromD1(env).then(async (data) => {
        await env.CF_CACHE.put(KV_KEYS.POSTS_LIST, JSON.stringify(data), { expirationTtl: 120 });
        await invalidateCacheKey(env, KV_KEYS.POSTS_LIST);
        log.info('Cron: posts list snapshot refreshed');
      }),
    ]);

    for (const result of results) {
      if (result.status === 'rejected') {
        log.error('Cron: snapshot refresh failed', { err: result.reason });
      }
    }

    // Individual post/page slugs are NOT pre-fetched by cron (too many to enumerate).
    // They are served via the D1 fallback on first request and cached with per-slug KV keys.
  },
} satisfies ExportedHandler<Env>;
