import { Env, ok, error } from '../lib/types';

export async function handleLmsCourses(_req: Request, env: Env, studentId: string): Promise<Response> {
  const hold = await env.PLATFORM_CONTEXT!.db.prepare(
    `SELECT id FROM student_holds WHERE student_id = ? AND hold_type = 'payment' AND is_active = 1`
  ).bind(studentId).first();
  if (hold) return error('Access denied: Active payment hold.', 403);

  try {
    const courses = await env.PLATFORM_CONTEXT!.lms.getCourses(studentId);
    return ok({ courses });
  } catch {
    return error('Failed to fetch LMS courses', 500);
  }
}

export async function handleLmsGrades(req: Request, env: Env, studentId: string): Promise<Response> {
  const hold = await env.PLATFORM_CONTEXT!.db.prepare(
    `SELECT id FROM student_holds WHERE student_id = ? AND hold_type = 'payment' AND is_active = 1`
  ).bind(studentId).first();
  if (hold) return error('Access denied: Active payment hold.', 403);

  try {
    const url = new URL(req.url);
    const courseId = url.searchParams.get('courseId');
    if (!courseId) return error('courseId is required', 400);

    const grades = await env.PLATFORM_CONTEXT!.lms.getGrades(studentId, courseId);
    return ok({ grades });
  } catch {
    return error('Failed to fetch LMS grades', 500);
  }
}
