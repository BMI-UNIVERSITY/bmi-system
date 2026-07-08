import { describe, it, expect, beforeEach } from 'vitest';
import { env } from 'cloudflare:test';
import { handleListStudents } from '../routes/ums-students';
import type { Env } from '../lib/types';

describe('API Contract — /api/student/ums-students', () => {
  beforeEach(async () => {
    // Clear out tables before each test
    await (env as any).DB.prepare('DELETE FROM students').run();
    await (env as any).DB.prepare('DELETE FROM users').run();
  });

  it('responds with empty list when no students exist', async () => {
    const request = new Request('https://api.hkmministries.org/api/student/ums-students', {
      method: 'GET',
    });

    const response = await handleListStudents(request, env as unknown as Env);
    expect(response.status).toBe(200);

    const data: any = await response.json();
    expect(data.data).toEqual([]);
    expect(data.meta.total).toBe(0);
  });

  it('responds with student data when students exist', async () => {
    // Insert a test user and student
    const userId = 'test-user-id';
    await (env as any).DB.prepare(
      `INSERT INTO users (id, email, password_hash, first_name, last_name, role, is_verified) VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(userId, 'student@test.com', 'hash', 'John', 'Doe', 'student', 1).run();

    await (env as any).DB.prepare(
      `INSERT INTO students (user_id, reg_no, status, current_level, programme) VALUES (?, ?, ?, ?, ?)`
    ).bind(userId, 'REG123', 'active', 100, 'BSc Computer Science').run();

    const request = new Request('https://api.hkmministries.org/api/student/ums-students', {
      method: 'GET',
    });

    const response = await handleListStudents(request, env as unknown as Env);
    expect(response.status).toBe(200);

    const data: any = await response.json();
    expect(data.data.length).toBe(1);
    expect(data.data[0].email).toBe('student@test.com');
    expect(data.data[0].reg_no).toBe('REG123');
    expect(data.meta.total).toBe(1);
  });
});
