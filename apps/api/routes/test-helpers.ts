/**
 * Test helper: wraps a mock DB object into a PlatformContext shape that
 * routes now expect from env.PLATFORM_CONTEXT.
 *
 * Usage:
 *   const db = makeDB(...);
 *   const env = makeEnv(db, { JWT_SECRET: 'secret', ...extraEnvProps });
 */

import { vi } from 'vitest';

export type MockDB = ReturnType<typeof makeChainDB>;

/** Build a minimal chainable mock DB (prepare → bind → first/all/run) */
export function makeChainDB(firstVals: any[] = [], allVals: any[] = []) {
  let fi = 0, ai = 0;
  const db: any = {
    prepare: vi.fn().mockReturnValue({
      bind: vi.fn().mockReturnValue({
        first: vi.fn().mockImplementation(() =>
          Promise.resolve(firstVals[fi++ % Math.max(firstVals.length, 1)] ?? null)
        ),
        all: vi.fn().mockImplementation(() =>
          Promise.resolve({ results: allVals[ai++ % Math.max(allVals.length, 1)] ?? [] })
        ),
        run: vi.fn().mockResolvedValue({ success: true }),
      }),
      first: vi.fn().mockResolvedValue(firstVals[0] ?? null),
      all: vi.fn().mockResolvedValue({ results: allVals[0] ?? [] }),
      run: vi.fn().mockResolvedValue({ success: true }),
    }),
    query: vi.fn().mockImplementation(() => Promise.resolve(allVals[0] ?? [])),
    queryOne: vi.fn().mockImplementation(() => Promise.resolve(firstVals[0] ?? null)),
    transaction: vi.fn().mockImplementation(async (cb: any) => {
      return await cb(db);
    }),
    getPlatform: vi.fn().mockReturnValue('test-mock'),
  };
  return db;
}

/** Build a minimal mock PlatformContext */
export function makeContext(db?: any) {
  const rawDb = db ?? makeChainDB();
  // Ensure transaction is available on the mock db
  const mockDb = {
    ...rawDb,
    transaction: rawDb.transaction ?? vi.fn().mockImplementation(async (cb: any) => {
      return await cb(rawDb);
    }),
    query: rawDb.query ?? vi.fn().mockResolvedValue([]),
    queryOne: rawDb.queryOne ?? vi.fn().mockResolvedValue(null),
    getPlatform: rawDb.getPlatform ?? vi.fn().mockReturnValue('test-mock'),
  };

  // Mock storage with in-memory store
  const mockStorageFiles = new Map<string, Buffer>();

  return {
    db: mockDb,
    kv: {
      get: vi.fn().mockResolvedValue(null),
      put: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      list: vi.fn().mockResolvedValue({ keys: [], list_complete: true, cursor: undefined }),
    },
    queue: {
      send: vi.fn().mockResolvedValue(undefined),
      sendBatch: vi.fn().mockResolvedValue(undefined),
    },
    rateLimiter: {
      checkAndIncrement: vi.fn().mockResolvedValue({ allowed: true, remaining: 29 }),
      reset: vi.fn().mockResolvedValue(undefined),
    },
    writeQueue: {
      enqueue: vi.fn().mockResolvedValue(undefined),
    },
    secrets: {
      get: vi.fn().mockResolvedValue(null),
      getSecret: vi.fn().mockResolvedValue(null),
    },
    logger: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
    tracer: {
      getRequestId: vi.fn().mockReturnValue('test-request-id'),
      setTag: vi.fn(),
    },
    identity: {
      createUser: vi.fn(),
      getUser: vi.fn(),
      getUserByEmail: vi.fn(),
      updateUser: vi.fn(),
      deleteUser: vi.fn(),
      validateCredentials: vi.fn(),
      setupMfa: vi.fn(),
      verifyMfa: vi.fn(),
      resetPassword: vi.fn(),
    },
    lms: {
      getCourses: vi.fn(),
      getCourse: vi.fn(),
      enrollStudent: vi.fn(),
      dropStudent: vi.fn(),
      getEnrollments: vi.fn(),
      getGrades: vi.fn(),
      syncGrade: vi.fn(),
    },
    email: {
      createMailbox: vi.fn(),
      deleteMailbox: vi.fn(),
      sendEmail: vi.fn(),
      resetMailboxPassword: vi.fn(),
    },
    payment: {
      createPaymentIntent: vi.fn().mockResolvedValue({
        id: 'pi_mock_123',
        amount: 1000,
        currency: 'USD',
        status: 'succeeded'
      }),
      getPaymentIntent: vi.fn(),
      cancelPaymentIntent: vi.fn(),
      handleWebhook: vi.fn(),
    },
    document: {
      generateDocument: vi.fn(),
      getDocument: vi.fn(),
      getDocumentsByUser: vi.fn(),
      verifyDocument: vi.fn().mockImplementation((params: any) => {
        if (params.documentId === 'UNKNOWN-123') {
          return Promise.resolve({ valid: false, error: 'Certificate not found', code: 'NOT_FOUND', document: null, hashVerified: false });
        }
        return Promise.resolve({
          valid: true,
          document: {
            serial_number: params.documentId || 'TEST-123',
            student_name: 'Test Student',
            degree_title: 'Bachelor of Science',
            issue_date: '2026-05-20',
            gpa: 3.8,
            status: 'ISSUED'
          },
          hashVerified: true
        });
      }),
    },
    notification: {
      send: vi.fn(),
      getNotifications: vi.fn(),
      markAsRead: vi.fn(),
      markAllAsRead: vi.fn(),
    },
    storage: {
      upload: vi.fn().mockImplementation((input: any) => {
        mockStorageFiles.set(input.key, input.data);
        return Promise.resolve({
          id: crypto.randomUUID(),
          key: input.key,
          url: `https://mock.storage/${input.key}`,
          size: input.data.byteLength,
          mimeType: input.mimeType,
          createdAt: new Date(),
          metadata: input.metadata,
        });
      }),
      download: vi.fn().mockImplementation((key: string) => {
        return Promise.resolve(mockStorageFiles.get(key) || Buffer.from(''));
      }),
      delete: vi.fn().mockImplementation((key: string) => {
        mockStorageFiles.delete(key);
        return Promise.resolve();
      }),
      getUrl: vi.fn().mockImplementation((key: string) => {
        return Promise.resolve(`https://mock.storage/${key}`);
      }),
    },
  };
}

/** Wrap a raw env object to include PLATFORM_CONTEXT from a given db mock */
export function makeEnv(db?: any, extraProps: Record<string, any> = {}) {
  return {
    PLATFORM_CONTEXT: makeContext(db),
    JWT_SECRET: 'test-secret',
    PASSWORD_PEPPER: 'test-pepper',
    RESEND_API_KEY: 'test-resend',
    ADMIN_EMAIL: 'admin@bmi.edu',
    ENVIRONMENT: 'test',
    ALLOWED_ORIGINS_OVERRIDE: '',
    WRITE_QUEUE: { get: vi.fn() },
    EMAIL_QUEUE: { send: vi.fn() },
    ...extraProps,
  };
}
