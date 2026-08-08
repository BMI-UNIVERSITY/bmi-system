import { vi } from 'vitest';
import type { PostgresDatabaseAdapter } from '@bmi/adapters';

/** Build a minimal mock PlatformContext using a REAL db adapter */
export function makeContextWithRealDb(db: PostgresDatabaseAdapter) {
  return {
    db, // <--- REAL DB ADAPTER
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
      getRequestId: vi.fn().mockReturnValue('smoke-test-request'),
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
      verifyDocument: vi.fn().mockResolvedValue({ valid: true, document: {}, hashVerified: true }),
    },
    notification: {
      send: vi.fn(),
      getNotifications: vi.fn(),
      markAsRead: vi.fn(),
      markAllAsRead: vi.fn(),
    },
    storage: {
      upload: vi.fn().mockResolvedValue({ url: 'https://mock.storage/smoke.jpg' }),
      download: vi.fn().mockResolvedValue(Buffer.from('')),
      delete: vi.fn().mockResolvedValue(undefined),
      getUrl: vi.fn().mockResolvedValue('https://mock.storage/smoke.jpg'),
    },
  };
}

export function makeNeonEnv(db: PostgresDatabaseAdapter, extraProps: Record<string, any> = {}) {
  return {
    PLATFORM_CONTEXT: makeContextWithRealDb(db),
    JWT_SECRET: 'test-secret',
    PASSWORD_PEPPER: 'test-pepper',
    RESEND_API_KEY: 'test-resend',
    ADMIN_EMAIL: 'admin@bmi.edu',
    ENVIRONMENT: 'test',
    ALLOWED_ORIGINS_OVERRIDE: '',
    WRITE_QUEUE: { get: vi.fn(), idFromName: vi.fn() },
    EMAIL_QUEUE: { send: vi.fn() },
    ...extraProps,
  };
}
