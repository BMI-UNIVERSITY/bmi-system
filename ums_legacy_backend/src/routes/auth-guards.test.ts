import { describe, it, expect, vi } from 'vitest';
import studentsRouter from './students.js';
import financeRouter from './finance.js';
import certificatesRouter from './certificates.js';
import gradeRouter from './grades.js';
import { gradingScalesRouter } from './grading-scales.js';
import { gradeAppealsRouter } from './grade-appeals.js';

vi.mock('../services/tokenBlacklist.js', () => ({
  isTokenRevoked: vi.fn(() => false),
}));

vi.mock('../config/index.js', () => ({
  CONFIG: {
    JWT_SECRET: 'test-secret',
    NODE_ENV: 'test',
  },
}));

vi.mock('../utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
  auditLogger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('Route auth guards', () => {
  it('blocks unauthenticated students list', async () => {
    const req = new Request('http://localhost/', { method: 'GET' });
    const res = await studentsRouter.fetch(req);
    expect(res.status).toBe(401);
  });

  it('blocks unauthenticated finance transactions list', async () => {
    const req = new Request('http://localhost/transactions', { method: 'GET' });
    const res = await financeRouter.fetch(req);
    expect(res.status).toBe(401);
  });

  it('blocks unauthenticated certificates list', async () => {
    const req = new Request('http://localhost/', { method: 'GET' });
    const res = await certificatesRouter.fetch(req);
    expect(res.status).toBe(401);
  });

  it('blocks unauthenticated grades list', async () => {
    const req = new Request('http://localhost/', { method: 'GET' });
    const res = await gradeRouter.fetch(req);
    expect(res.status).toBe(401);
  });

  it('blocks unauthenticated grade update (PUT)', async () => {
    const req = new Request('http://localhost/123', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ letterGrade: 'A' }),
    });
    const res = await gradeRouter.fetch(req);
    expect(res.status).toBe(401);
  });

  it('blocks unauthenticated grade update (PATCH)', async () => {
    const req = new Request('http://localhost/123', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ letterGrade: 'A' }),
    });
    const res = await gradeRouter.fetch(req);
    expect(res.status).toBe(401);
  });

  it('blocks unauthenticated grading scales list', async () => {
    const req = new Request('http://localhost/', { method: 'GET' });
    const res = await gradingScalesRouter.fetch(req);
    expect(res.status).toBe(401);
  });

  it('blocks unauthenticated grade appeals list', async () => {
    const req = new Request('http://localhost/', { method: 'GET' });
    const res = await gradeAppealsRouter.fetch(req);
    expect(res.status).toBe(401);
  });
});






