import { makeEnv } from './test-helpers';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleLmsCourses, handleLmsGrades } from './lms';

describe('LMS routes — handleLmsCourses', () => {
  let env: ReturnType<typeof makeEnv>;

  beforeEach(() => {
    vi.clearAllMocks();
    env = makeEnv();
  });

  it('returns courses from the lms adapter', async () => {
    const mockCourses = [
      { id: '1', name: 'Intro to CS', code: 'CS101', credits: 3, semester: 'Fall', year: 2026 },
      { id: '2', name: 'Data Structures', code: 'CS201', credits: 3, semester: 'Fall', year: 2026 },
    ];
    env.PLATFORM_CONTEXT.lms.getCourses.mockResolvedValue(mockCourses);

    const req = new Request('http://localhost/api/lms/courses');
    const res = await handleLmsCourses(req, env, 'student-123');
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.courses).toEqual(mockCourses);
    expect(env.PLATFORM_CONTEXT.lms.getCourses).toHaveBeenCalledWith('student-123');
  });

  it('returns 500 when lms adapter throws', async () => {
    env.PLATFORM_CONTEXT.lms.getCourses.mockRejectedValue(new Error('LMS unreachable'));

    const req = new Request('http://localhost/api/lms/courses');
    const res = await handleLmsCourses(req, env, 'student-123');
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
  });
});

describe('LMS routes — handleLmsGrades', () => {
  let env: ReturnType<typeof makeEnv>;

  beforeEach(() => {
    vi.clearAllMocks();
    env = makeEnv();
  });

  it('returns grades for a given course and student', async () => {
    const now = new Date();
    const mockGrades = [
      { id: 'g1', userId: 'student-123', courseId: 'c1', value: 'A', percentage: 95, timestamp: now },
    ];
    env.PLATFORM_CONTEXT.lms.getGrades.mockResolvedValue(mockGrades);

    const req = new Request('http://localhost/api/lms/grades?courseId=c1');
    const res = await handleLmsGrades(req, env, 'student-123');
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.grades).toHaveLength(1);
    expect(body.data.grades[0].id).toBe('g1');
    expect(body.data.grades[0].value).toBe('A');
    expect(body.data.grades[0].courseId).toBe('c1');
    expect(env.PLATFORM_CONTEXT.lms.getGrades).toHaveBeenCalledWith('student-123', 'c1');
  });

  it('returns 400 when courseId is missing', async () => {
    const req = new Request('http://localhost/api/lms/grades');
    const res = await handleLmsGrades(req, env, 'student-123');
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(env.PLATFORM_CONTEXT.lms.getGrades).not.toHaveBeenCalled();
  });

  it('returns 500 when lms adapter throws', async () => {
    env.PLATFORM_CONTEXT.lms.getGrades.mockRejectedValue(new Error('LMS error'));

    const req = new Request('http://localhost/api/lms/grades?courseId=c1');
    const res = await handleLmsGrades(req, env, 'student-123');
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
  });
});
