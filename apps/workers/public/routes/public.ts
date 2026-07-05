/**
 * bmi-public — Route Handlers
 *
 * These are identical in logic to the monolith's routes/public.ts but:
 *  - All responses go through the two-tier cache (Cache API → KV → D1)
 *  - D1 is accessed by the scheduled cron (refreshSnapshot), not per-request
 *  - Handlers receive pre-fetched data from the cache layer, not raw DB queries
 */

import { PROGRAMS } from '@bmi/shared';
import { cachedResponse } from '../lib/cache';
import { notFound } from '../lib/types';
import type { Env } from '../lib/types';

// ─── KV cache keys ────────────────────────────────────────────────────────────
export const KV_KEYS = {
  PROGRAMS: 'public:programs',
  STATS: 'public:stats',
  POSTS_LIST: 'public:cms:posts',
  POST_BY_SLUG: (slug: string) => `public:cms:posts:${slug}`,
  PAGE_BY_SLUG: (slug: string) => `public:cms:pages:${slug}`,
} as const;

// ─── GET /api/public/programs ─────────────────────────────────────────────────
export async function handlePublicPrograms(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const level = url.searchParams.get('level');

  // If a level filter is requested, we still serve from the full cached list
  // and filter client-side — avoids per-filter KV keys
  return cachedResponse(request, env, {
    kvKey: KV_KEYS.PROGRAMS,
    ttlSeconds: 300,
    fetcher: () => fetchProgramsFromD1(env),
  }).then((res) => {
    if (!level) return res;
    // Apply filter on top of cached response (no D1 touch)
    return res.json<{ success: boolean; data: unknown[] }>().then((body) => {
      const filtered = (body.data as any[]).filter((p: any) => p.level === level);
      return new Response(JSON.stringify({ success: true, data: filtered }), {
        status: 200,
        headers: res.headers,
      });
    });
  });
}

// ─── GET /api/public/stats ────────────────────────────────────────────────────
export async function handlePublicStats(request: Request, env: Env): Promise<Response> {
  return cachedResponse(request, env, {
    kvKey: KV_KEYS.STATS,
    ttlSeconds: 300,
    fetcher: () => fetchStatsFromD1(env),
  });
}

// ─── GET /api/public/cms/posts ────────────────────────────────────────────────
export async function handlePublicListPosts(request: Request, env: Env): Promise<Response> {
  return cachedResponse(request, env, {
    kvKey: KV_KEYS.POSTS_LIST,
    ttlSeconds: 120,
    fetcher: () => fetchPostsListFromD1(env),
  });
}

// ─── GET /api/public/cms/posts/:slug ─────────────────────────────────────────
export async function handlePublicGetPost(
  request: Request,
  env: Env,
  slug: string,
): Promise<Response> {
  const res = await cachedResponse(request, env, {
    kvKey: KV_KEYS.POST_BY_SLUG(slug),
    ttlSeconds: 300,
    fetcher: () => fetchPostBySlugFromD1(env, slug),
  });
  // If fetcher returned null (post not found), cachedResponse stores null in KV.
  // We detect that and return a 404.
  const body = await res.clone().json<{ success: boolean; data: unknown }>();
  if (body.data === null) return notFound('Post not found');
  return res;
}

// ─── GET /api/public/cms/pages/:slug ─────────────────────────────────────────
export async function handlePublicGetPage(
  request: Request,
  env: Env,
  slug: string,
): Promise<Response> {
  const res = await cachedResponse(request, env, {
    kvKey: KV_KEYS.PAGE_BY_SLUG(slug),
    ttlSeconds: 600,
    fetcher: () => fetchPageBySlugFromD1(env, slug),
  });
  const body = await res.clone().json<{ success: boolean; data: unknown }>();
  if (body.data === null) return notFound('Page not found');
  return res;
}

// ─── D1 Fetchers (used by cron + cold-start fallback only) ───────────────────

export async function fetchProgramsFromD1(env: Env) {
  const courseCounts = await env.DB.prepare(
    `SELECT c.code, c.capacity,
            COUNT(CASE WHEN e.status = 'enrolled' THEN 1 END) AS enrolled
     FROM courses c
     LEFT JOIN enrollments e ON e.course_id = c.id
     GROUP BY c.id`,
  ).all<{ code: string; capacity: number; enrolled: number }>();

  const seatMap = new Map<string, number>();
  for (const row of courseCounts.results) {
    seatMap.set(row.code, Math.max(0, row.capacity - (row.enrolled ?? 0)));
  }

  return PROGRAMS.map((p) => ({
    id: p.label,
    code: p.label,
    label: p.label,
    level: p.level,
    description: p.description,
    credits: 120,
    term: 'Fall 2026',
    available_seats: seatMap.get(p.label) ?? null,
  }));
}

export async function fetchStatsFromD1(env: Env) {
  const [programCount, studentCount, appCount] = await Promise.all([
    env.DB.prepare(`SELECT COUNT(*) AS n FROM courses`).first<{ n: number }>(),
    env.DB.prepare(`SELECT COUNT(*) AS n FROM users WHERE role = 'student'`).first<{ n: number }>(),
    env.DB.prepare(
      `SELECT COUNT(*) AS n FROM applications WHERE submitted_at >= date('now', '-90 days')`,
    ).first<{ n: number }>(),
  ]);
  return {
    total_programs: programCount?.n ?? 0,
    total_enrolled_students: studentCount?.n ?? 0,
    total_applications_this_term: appCount?.n ?? 0,
  };
}

export async function fetchPostsListFromD1(env: Env) {
  const [rows, total] = await Promise.all([
    env.DB.prepare(
      `SELECT p.id, p.title, p.slug, p.excerpt, p.tags, p.published_at,
              u.first_name, u.last_name
       FROM cms_posts p
       JOIN users u ON u.id = p.author_id
       WHERE p.status = 'published'
       ORDER BY p.published_at DESC
       LIMIT 50`,
    ).all<{
      id: string; title: string; slug: string; excerpt: string | null;
      tags: string | null; published_at: string; first_name: string; last_name: string;
    }>(),
    env.DB.prepare(`SELECT COUNT(*) AS n FROM cms_posts WHERE status = 'published'`).first<{ n: number }>(),
  ]);

  return {
    results: rows.results.map((r) => ({
      id: r.id,
      title: r.title,
      slug: r.slug,
      excerpt: r.excerpt,
      tags: r.tags ? JSON.parse(r.tags) : null,
      published_at: r.published_at,
      author: { first_name: r.first_name, last_name: r.last_name },
    })),
    total: total?.n ?? 0,
  };
}

export async function fetchPostBySlugFromD1(env: Env, slug: string) {
  const row = await env.DB.prepare(
    `SELECT p.id, p.title, p.slug, p.excerpt, p.content, p.tags, p.published_at,
            u.first_name, u.last_name
     FROM cms_posts p
     JOIN users u ON u.id = p.author_id
     WHERE p.slug = ? AND p.status = 'published'`,
  ).bind(slug).first<{
    id: string; title: string; slug: string; excerpt: string | null;
    content: string | null; tags: string | null; published_at: string;
    first_name: string; last_name: string;
  }>();

  if (!row) return null;
  return { ...row, tags: row.tags ? JSON.parse(row.tags) : null, author: { first_name: row.first_name, last_name: row.last_name } };
}

export async function fetchPageBySlugFromD1(env: Env, slug: string) {
  const row = await env.DB.prepare(
    `SELECT id, title, slug, content, published_at
     FROM cms_pages
     WHERE slug = ? AND status = 'published'`,
  ).bind(slug).first<{ id: string; title: string; slug: string; content: string | null; published_at: string }>();
  return row ?? null;
}
