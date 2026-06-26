/**
 * worker/routes/cms.ts
 *
 * Admin/staff-authenticated CMS write routes for managing cms_posts and cms_pages.
 * Public read routes live in routes/public.ts.
 */

import { ok, error, logAdminAction } from '../lib/types';
import type { Env } from '../lib/types';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

// ── POSTS ──────────────────────────────────────────────────────────────────

/** GET /api/cms/posts — list all posts (admin/staff, includes drafts) */
export async function handleListPosts(_request: Request, env: Env): Promise<Response> {
  const rows = await env.DB.prepare(
    `SELECT p.id, p.title, p.slug, p.excerpt, p.status, p.tags, p.published_at, p.created_at,
            u.first_name, u.last_name
     FROM cms_posts p
     JOIN users u ON u.id = p.author_id
     ORDER BY p.created_at DESC
     LIMIT 100`,
  ).all<{
    id: string; title: string; slug: string; excerpt: string | null;
    status: string; tags: string | null; published_at: string | null;
    created_at: string; first_name: string; last_name: string;
  }>();

  const posts = rows.results.map((r) => ({
    ...r,
    tags: r.tags ? JSON.parse(r.tags) : null,
    author: { first_name: r.first_name, last_name: r.last_name },
  }));

  return ok(posts);
}

/** POST /api/cms/posts — create a post */
export async function handleCreatePost(
  request: Request,
  env: Env,
  authorId: string,
): Promise<Response> {
  let body: {
    title: string;
    excerpt?: string;
    content?: string;
    tags?: string[];
    status?: 'draft' | 'published';
  };
  try {
    body = await request.json();
  } catch {
    return error('Invalid JSON body');
  }

  if (!body.title?.trim()) return error('Title is required');

  const slug = slugify(body.title);
  const existing = await env.DB.prepare(
    'SELECT id FROM cms_posts WHERE slug = ?',
  ).bind(slug).first();
  if (existing) return error('A post with this title already exists', 409);

  const status = body.status ?? 'draft';
  const id = crypto.randomUUID();
  const tagsJson = body.tags ? JSON.stringify(body.tags) : null;
  const publishedAt = status === 'published' ? new Date().toISOString() : null;

  await env.DB.prepare(
    `INSERT INTO cms_posts (id, title, slug, excerpt, content, tags, status, author_id, published_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(id, body.title.trim(), slug, body.excerpt ?? null, body.content ?? null, tagsJson, status, authorId, publishedAt)
    .run();

  await logAdminAction(env, authorId, 'cms_post_created', 'cms_post', id);
  return ok({ id, slug, status });
}

/** PUT /api/cms/posts/:id — update a post */
export async function handleUpdatePost(
  request: Request,
  env: Env,
  postId: string,
  editorId: string,
): Promise<Response> {
  const existing = await env.DB.prepare('SELECT id, status FROM cms_posts WHERE id = ?')
    .bind(postId)
    .first<{ id: string; status: string }>();
  if (!existing) return error('Post not found', 404);

  let body: {
    title?: string;
    excerpt?: string;
    content?: string;
    tags?: string[];
    status?: 'draft' | 'published';
  };
  try {
    body = await request.json();
  } catch {
    return error('Invalid JSON body');
  }

  const newStatus = body.status ?? existing.status;
  const tagsJson = body.tags ? JSON.stringify(body.tags) : undefined;
  const publishedAt =
    newStatus === 'published' && existing.status !== 'published'
      ? new Date().toISOString()
      : undefined;

  const sets: string[] = ['updated_at = datetime(\'now\')'];
  const binds: unknown[] = [];

  if (body.title !== undefined) { sets.push('title = ?'); binds.push(body.title); }
  if (body.excerpt !== undefined) { sets.push('excerpt = ?'); binds.push(body.excerpt); }
  if (body.content !== undefined) { sets.push('content = ?'); binds.push(body.content); }
  if (tagsJson !== undefined) { sets.push('tags = ?'); binds.push(tagsJson); }
  if (body.status !== undefined) { sets.push('status = ?'); binds.push(newStatus); }
  if (publishedAt !== undefined) { sets.push('published_at = ?'); binds.push(publishedAt); }

  binds.push(postId);
  await env.DB.prepare(`UPDATE cms_posts SET ${sets.join(', ')} WHERE id = ?`)
    .bind(...binds)
    .run();

  await logAdminAction(env, editorId, 'cms_post_updated', 'cms_post', postId);
  return ok({ id: postId, status: newStatus });
}

/** DELETE /api/cms/posts/:id — delete a post */
export async function handleDeletePost(
  _request: Request,
  env: Env,
  postId: string,
  adminId: string,
): Promise<Response> {
  const existing = await env.DB.prepare('SELECT id FROM cms_posts WHERE id = ?')
    .bind(postId).first();
  if (!existing) return error('Post not found', 404);

  await env.DB.prepare('DELETE FROM cms_posts WHERE id = ?').bind(postId).run();
  await logAdminAction(env, adminId, 'cms_post_deleted', 'cms_post', postId);
  return ok({ deleted: true });
}

// ── PAGES ──────────────────────────────────────────────────────────────────

/** GET /api/cms/pages — list all pages (admin/staff) */
export async function handleListPages(_request: Request, env: Env): Promise<Response> {
  const rows = await env.DB.prepare(
    `SELECT id, title, slug, status, published_at, created_at FROM cms_pages ORDER BY created_at DESC`,
  ).all<{ id: string; title: string; slug: string; status: string; published_at: string | null; created_at: string }>();
  return ok(rows.results);
}

/** POST /api/cms/pages — create a page */
export async function handleCreatePage(
  request: Request,
  env: Env,
  authorId: string,
): Promise<Response> {
  let body: { title: string; content?: string; status?: 'draft' | 'published' };
  try { body = await request.json(); } catch { return error('Invalid JSON body'); }
  if (!body.title?.trim()) return error('Title is required');

  const slug = slugify(body.title);
  const existing = await env.DB.prepare('SELECT id FROM cms_pages WHERE slug = ?').bind(slug).first();
  if (existing) return error('A page with this slug already exists', 409);

  const status = body.status ?? 'draft';
  const id = crypto.randomUUID();
  const publishedAt = status === 'published' ? new Date().toISOString() : null;

  await env.DB.prepare(
    `INSERT INTO cms_pages (id, title, slug, content, status, author_id, published_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).bind(id, body.title.trim(), slug, body.content ?? null, status, authorId, publishedAt).run();

  await logAdminAction(env, authorId, 'cms_page_created', 'cms_page', id);
  return ok({ id, slug, status });
}

/** DELETE /api/cms/pages/:id */
export async function handleDeletePage(
  _request: Request,
  env: Env,
  pageId: string,
  adminId: string,
): Promise<Response> {
  const existing = await env.DB.prepare('SELECT id FROM cms_pages WHERE id = ?').bind(pageId).first();
  if (!existing) return error('Page not found', 404);
  await env.DB.prepare('DELETE FROM cms_pages WHERE id = ?').bind(pageId).run();
  await logAdminAction(env, adminId, 'cms_page_deleted', 'cms_page', pageId);
  return ok({ deleted: true });
}
