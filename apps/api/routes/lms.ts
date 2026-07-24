import { Env, ok, error } from '../lib/types';

export async function handleLmsCourses(_req: Request, env: Env, studentId: string): Promise<Response> {
  try {
    const courses = await env.PLATFORM_CONTEXT!.lms.getCourses(studentId);
    return ok({ courses });
  } catch {
    return error('Failed to fetch LMS courses', 500);
  }
}

export async function handleLmsGrades(req: Request, env: Env, studentId: string): Promise<Response> {
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
