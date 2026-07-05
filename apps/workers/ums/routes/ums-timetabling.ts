import { Env } from '../lib/types';
import { ok, error } from '../lib/types';

export async function handleListTimetabling(request: Request, env: Env): Promise<Response> {
  const rows = await env.DB.prepare(
    `SELECT t.*, 
            c.code as course_code, c.title as course_name,
            u.first_name, u.last_name
     FROM timetabling t
     LEFT JOIN courses c ON t.course_id = c.id
     LEFT JOIN users u ON t.instructor_id = u.id
     ORDER BY t.day_of_week ASC, t.start_time ASC`
  ).all();

  // Format into PocketBase-like expand payload for the frontend
  const formatted = rows.results.map(row => ({
    id: row.id,
    day_of_week: row.day_of_week,
    start_time: row.start_time,
    end_time: row.end_time,
    course_id: row.course_id,
    instructor_id: row.instructor_id,
    classroom_id: row.classroom_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
    expand: {
      course_id: { code: row.course_code, title: row.course_name },
      instructor_id: { name: `${row.first_name || ''} ${row.last_name || ''}`.trim() },
      classroom_id: { name: row.classroom_id || 'TBD' }
    }
  }));

  return ok(formatted);
}

export async function handleCreateTimetabling(request: Request, env: Env): Promise<Response> {
  const body = await request.json() as Record<string, string>;
  const id = crypto.randomUUID().replace(/-/g, '');

  await env.DB.prepare(
    `INSERT INTO timetabling (id, course_id, instructor_id, classroom_id, day_of_week, start_time, end_time)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id, body.course_id, body.instructor_id || null, body.classroom_id || null, 
    body.day_of_week, body.start_time, body.end_time
  ).run();

  return handleListTimetabling(request, env);
}
