import { Env, ok, error } from '../lib/types';

export async function handleLmsCourses(req: Request, env: Env, studentId: string): Promise<Response> {
  try {
    // We would map studentId to LMS ID here if they differ
    // For now we mock the course fetch
    // Real implementation uses env.PLATFORM_CONTEXT!.lms.getCourse()
    
    // As a shortcut, return some dummy LMS data
    return ok({
      courses: [
        { id: '1', name: 'Intro to Computer Science' },
        { id: '2', name: 'Data Structures' },
      ]
    });
  } catch (e: any) {
    return error('Failed to fetch LMS courses', 500);
  }
}

export async function handleLmsGrades(req: Request, env: Env, studentId: string): Promise<Response> {
  try {
    const url = new URL(req.url);
    const courseId = url.searchParams.get('courseId');
    if (!courseId) return error('courseId is required', 400);

    const grades = await env.PLATFORM_CONTEXT!.lms.getGrades(courseId, studentId);
    return ok({ grades });
  } catch (e: any) {
    return error('Failed to fetch LMS grades', 500);
  }
}
