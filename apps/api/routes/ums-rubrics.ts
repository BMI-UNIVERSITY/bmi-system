import type { Env } from '../lib/types';
import { ok, error, typedJson } from '../lib/types';

interface CreateRubricBody {
  title: string;
  description?: string;
  course_id?: string;
  criteria?: unknown[];
  total_points?: number;
}

export async function handleListRubrics(_request: Request, env: Env): Promise<Response> {
  try {
    const rows = await env.PLATFORM_CONTEXT!.db.prepare(
      `SELECT r.*, c.title as course_name 
       FROM rubrics r
       LEFT JOIN courses c ON r.course_id = c.id
       ORDER BY r.created_at DESC`
    ).all();

    const formatted = rows.results.map(row => {
      let criteria = [];
      try {
        criteria = JSON.parse(row.criteria as string || '[]');
      } catch {
        criteria = [];
      }
      return {
        ...row,
        criteria
      };
    });

    return ok(formatted);
  } catch {
    return error('Failed to fetch rubrics');
  }
}

export async function handleCreateRubric(request: Request, env: Env): Promise<Response> {
  try {
    const body = await typedJson<CreateRubricBody>(request);
    const id = crypto.randomUUID().replace(/-/g, '');
    
    await env.PLATFORM_CONTEXT!.db.prepare(
      `INSERT INTO rubrics (id, title, description, course_id, criteria, total_points)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(
      id,
      body.title,
      body.description || null,
      body.course_id || null,
      JSON.stringify(body.criteria || []),
      body.total_points || 100
    ).run();

    return handleListRubrics(request, env);
  } catch {
    return error('Failed to create rubric');
  }
}

export async function handleDeleteRubric(_request: Request, env: Env, id: string): Promise<Response> {
  try {
    await env.PLATFORM_CONTEXT!.db.prepare(`DELETE FROM rubrics WHERE id = ?`).bind(id).run();
    return ok({ id });
  } catch {
    return error('Failed to delete rubric');
  }
}
