import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleRegister } from '../routes/auth';
import type { Env } from './types';
import type { RegisterRequest, RegisterSuccessResponse, AccountAlreadyExistsError } from '@bmi/shared';

// Create a mock DB for the test
const mockDB = {
  prepare: vi.fn(),
};

const mockEnv: Env = {
  DB: mockDB as unknown as any,
  DOCUMENTS: {} as any,
  BACKUP_BUCKET: {} as any,
  SESSIONS: {} as any,
  JWT_SECRET: 'test-secret',
  RESEND_API_KEY: '',
  ADMIN_EMAIL: 'admin@test.com',
  ENVIRONMENT: 'test',
  ASSETS: {} as any,
};

describe('API Contract — /api/auth/register', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('responds with RegisterSuccessResponse shape on successful registration', async () => {
    // Mock the DB check to return null (no existing user)
    const mockBindCheck = { first: vi.fn().mockResolvedValue(null) };
    const mockPrepareCheck = vi.fn().mockReturnValue({ bind: () => mockBindCheck });
    
    // Mock the insert statements
    const mockBindInsert = { run: vi.fn().mockResolvedValue({ success: true }) };
    const mockPrepareInsert = vi.fn().mockReturnValue({ bind: () => mockBindInsert });

    mockDB.prepare = vi.fn((query: string) => {
      if (query.includes('SELECT id FROM users')) return mockPrepareCheck();
      return mockPrepareInsert();
    });

    const reqPayload: RegisterRequest = {
      email: 'newuser@example.com',
      password: 'StrongPassword123!',
      first_name: 'New',
      last_name: 'User',
    };

    const request = new Request('https://apply.bmiuniversity.org/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reqPayload),
    });

    const response = await handleRegister(request, mockEnv);
    expect(response.status).toBe(200);

    const data = await response.json() as RegisterSuccessResponse;
    expect(data.success).toBe(true);
    expect(data.data).toBeDefined();
    expect(typeof data.data?.user_id).toBe('string');
    expect(typeof data.data?.message).toBe('string');
  });

  it('responds with AccountAlreadyExistsError shape on duplicate email (HTTP 409)', async () => {
    // Mock the DB check to return an existing user
    const mockBindCheck = { first: vi.fn().mockResolvedValue({ id: 'existing-id' }) };
    const mockPrepareCheck = vi.fn().mockReturnValue({ bind: () => mockBindCheck });
    mockDB.prepare = mockPrepareCheck;

    const reqPayload: RegisterRequest = {
      email: 'existing@example.com',
      password: 'StrongPassword123!',
      first_name: 'Existing',
      last_name: 'User',
    };

    const request = new Request('https://apply.bmiuniversity.org/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reqPayload),
    });

    const response = await handleRegister(request, mockEnv);
    expect(response.status).toBe(409);

    const data = await response.json() as AccountAlreadyExistsError;
    expect(data.success).toBe(false);
    expect(data.error).toBe('An account with this email already exists');
  });
});
