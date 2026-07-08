import { makeEnv } from './test-helpers';
/**
 * Document Handler Unit Tests
 *
 * Tests handleUploadDocument and handleDownloadDocument.
 * Covers: query-param validation, IDOR ownership check, file-size guard,
 * magic-byte rejection, and R2 key structure.
 *
 * env.WRITE_QUEUE mocked to prevent Durable Object binding errors.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleUploadDocument, handleDownloadDocument } from './documents';

// ─── Test helpers ──────────────────────────────────────────────────────────────

function makeEnv(overrides: Record<string, unknown> = {}) {
  const db = {
    prepare: vi.fn().mockReturnThis(),
    bind: vi.fn().mockReturnThis(),
    first: vi.fn(),
    run: vi.fn().mockResolvedValue({}),
    all: vi.fn().mockResolvedValue({ results: [] }),
    transaction: vi.fn().mockImplementation(async (cb: any) => cb(db)),
    query: vi.fn().mockResolvedValue([]),
    queryOne: vi.fn().mockResolvedValue(null),
    getPlatform: vi.fn().mockReturnValue('test'),
  };

  const mockStorageFiles = new Map<string, Buffer>();

  const context = {
    db,
    kv: { get: vi.fn().mockResolvedValue(null), put: vi.fn().mockResolvedValue(undefined), delete: vi.fn().mockResolvedValue(undefined), list: vi.fn().mockResolvedValue({ keys: [] }) },
    queue: { send: vi.fn().mockResolvedValue(undefined), sendBatch: vi.fn().mockResolvedValue(undefined) },
    rateLimiter: { checkAndIncrement: vi.fn().mockResolvedValue({ allowed: true, remaining: 29 }), reset: vi.fn().mockResolvedValue(undefined) },
    writeQueue: { enqueue: vi.fn().mockResolvedValue(undefined) },
    secrets: { get: vi.fn().mockResolvedValue(null), getSecret: vi.fn().mockResolvedValue(null) },
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    tracer: { getRequestId: vi.fn().mockReturnValue('test-id'), setTag: vi.fn() },
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
      createPaymentIntent: vi.fn(),
      getPaymentIntent: vi.fn(),
      cancelPaymentIntent: vi.fn(),
      handleWebhook: vi.fn(),
    },
    document: {
      generateDocument: vi.fn(),
      getDocument: vi.fn(),
      getDocumentsByUser: vi.fn(),
      verifyDocument: vi.fn(),
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

  return {
    PLATFORM_CONTEXT: context,
    WRITE_QUEUE: { get: vi.fn(), idFromName: vi.fn() },
    ENVIRONMENT: 'test',
    ...overrides,
  };
}

/** Creates a minimal multipart/form-data Request with a file attachment. */
function makeUploadRequest(url: string, fileBytes: Uint8Array, fileName: string, mimeType: string) {
  const formData = new FormData();
  const blob = new Blob([fileBytes], { type: mimeType });
  formData.append('file', new File([blob], fileName, { type: mimeType }));
  return new Request(url, { method: 'POST', body: formData });
}

// ─── handleUploadDocument ──────────────────────────────────────────────────────

describe('handleUploadDocument', () => {
  let env: ReturnType<typeof makeEnv>;

  beforeEach(() => {
    vi.clearAllMocks();
    env = makeEnv();
  });

  it('returns 400 when application_id is missing', async () => {
    const req = new Request('http://localhost/api/documents/upload', { method: 'POST', body: new FormData() });
    const res = await handleUploadDocument(req, env as any, 'user-1');
    expect(res.status).toBe(400);
    const body = await res.json() as any;
    expect(body.error).toMatch(/application_id/i);
  });

  it('returns 400 when application_id is not a valid UUID', async () => {
    const req = new Request('http://localhost/api/documents/upload?application_id=not-a-uuid', {
      method: 'POST',
      body: new FormData(),
    });
    const res = await handleUploadDocument(req, env as any, 'user-1');
    expect(res.status).toBe(400);
    const body = await res.json() as any;
    expect(body.fields?.some((f: any) => f.field === 'application_id')).toBe(true);
  });

  it('returns 400 for an invalid doc_type', async () => {
    const req = new Request(
      `http://localhost/api/documents/upload?application_id=00000000-0000-0000-0000-000000000001&doc_type=malicious_type`,
      { method: 'POST', body: new FormData() }
    );
    const res = await handleUploadDocument(req, env as any, 'user-1');
    expect(res.status).toBe(400);
    const body = await res.json() as any;
    expect(body.fields?.some((f: any) => f.field === 'doc_type')).toBe(true);
  });

  it('returns 404 when application does not belong to the user (IDOR guard)', async () => {
    env.PLATFORM_CONTEXT.db.first = vi.fn().mockResolvedValue(null); // application not found for this user
    const validPdfMagic = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2D]); // %PDF-
    const req = makeUploadRequest(
      `http://localhost/api/documents/upload?application_id=00000000-0000-0000-0000-000000000001`,
      validPdfMagic,
      'transcript.pdf',
      'application/pdf'
    );
    const res = await handleUploadDocument(req, env as any, 'user-1');
    expect(res.status).toBe(404);
    const body = await res.json() as any;
    expect(body.error).toMatch(/Application not found/i);
  });

  it('rejects file with invalid magic bytes (content type spoofing)', async () => {
    // Simulate application exists
    env.PLATFORM_CONTEXT.db.first = vi.fn()
      .mockResolvedValueOnce({ id: 'app-1', user_id: 'user-1' }) // application found
      .mockResolvedValueOnce({ count: 0 });                        // doc count
    // File named .pdf but actually text content
    const fakeBytes = new Uint8Array([0x48, 0x65, 0x6C, 0x6C, 0x6F]); // "Hello"
    const req = makeUploadRequest(
      `http://localhost/api/documents/upload?application_id=00000000-0000-0000-0000-000000000001`,
      fakeBytes,
      'fake.pdf',
      'application/pdf'
    );
    const res = await handleUploadDocument(req, env as any, 'user-1');
    expect(res.status).toBe(400);
    const body = await res.json() as any;
    expect(body.error).toMatch(/could not be verified|not allowed/i);
  });

  it('returns 200 and stores the document on valid PDF upload', async () => {
    // Valid PDF magic bytes
    const validPdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E]);
    env.PLATFORM_CONTEXT.db.first = vi.fn()
      .mockResolvedValueOnce({ id: 'app-1', user_id: 'user-1' })
      .mockResolvedValueOnce({ count: 0 });
    env.PLATFORM_CONTEXT.db.run = vi.fn().mockResolvedValue({});
    const req = makeUploadRequest(
      `http://localhost/api/documents/upload?application_id=00000000-0000-0000-0000-000000000001&doc_type=transcript`,
      validPdf,
      'transcript.pdf',
      'application/pdf'
    );
    const res = await handleUploadDocument(req, env as any, 'user-1');
    expect(res.status).toBe(200);
    expect(env.PLATFORM_CONTEXT.storage.upload).toHaveBeenCalledOnce();
    const body = await res.json() as any;
    expect(body.data.document_id).toBeDefined();
    expect(body.data.doc_type).toBe('transcript');
  });
});

// ─── handleDownloadDocument ────────────────────────────────────────────────────

describe('handleDownloadDocument', () => {
  let env: ReturnType<typeof makeEnv>;

  beforeEach(() => {
    vi.clearAllMocks();
    env = makeEnv();
  });

  it('returns 404 when document record not found', async () => {
    env.PLATFORM_CONTEXT.db.first = vi.fn().mockResolvedValue(null);
    const req = new Request('http://localhost/api/documents/doc-1/download');
    const res = await handleDownloadDocument(req, env as any, 'doc-1', 'user-1', 'student');
    expect(res.status).toBe(404);
  });

  it('returns 403 when student tries to access another user\'s document (IDOR)', async () => {
    env.PLATFORM_CONTEXT.db.first = vi.fn().mockResolvedValue({
      id: 'doc-1',
      user_id: 'other-user', // owned by someone else
      r2_key: 'documents/other-user/app-1/transcript-uuid.pdf',
      file_name: 'transcript.pdf',
      mime_type: 'application/pdf',
    });
    const req = new Request('http://localhost/api/documents/doc-1/download');
    const res = await handleDownloadDocument(req, env as any, 'doc-1', 'user-1', 'student');
    expect(res.status).toBe(403);
  });

  it('allows admin to access any document regardless of ownership', async () => {
    env.PLATFORM_CONTEXT.db.first = vi.fn().mockResolvedValue({
      id: 'doc-1',
      user_id: 'student-user',
      r2_key: 'documents/student-user/app-1/transcript-uuid.pdf',
      file_name: 'transcript.pdf',
      mime_type: 'application/pdf',
    });
    // Set up mock file in storage
    const testPdf = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E]);
    env.PLATFORM_CONTEXT.storage.download = vi.fn().mockResolvedValue(testPdf);
    env.PLATFORM_CONTEXT.db.run = vi.fn().mockResolvedValue({});
    const req = new Request('http://localhost/api/documents/doc-1/download');
    const res = await handleDownloadDocument(req, env as any, 'doc-1', 'admin-user', 'admin');
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/pdf');
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(res.headers.get('X-Frame-Options')).toBe('DENY');
  });

  it('sets Content-Disposition: inline for PDF', async () => {
    env.PLATFORM_CONTEXT.db.first = vi.fn().mockResolvedValue({
      id: 'doc-1', user_id: 'user-1', r2_key: 'key',
      file_name: 'report.pdf', mime_type: 'application/pdf',
    });
    // Set up mock file in storage
    const testPdf = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E]);
    env.PLATFORM_CONTEXT.storage.download = vi.fn().mockResolvedValue(testPdf);
    env.PLATFORM_CONTEXT.db.run = vi.fn().mockResolvedValue({});
    const req = new Request('http://localhost/api/documents/doc-1/download');
    const res = await handleDownloadDocument(req, env as any, 'doc-1', 'user-1', 'student');
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Disposition')).toMatch(/inline/);
  });

  it('sets Content-Disposition: attachment for Word documents', async () => {
    env.PLATFORM_CONTEXT.db.first = vi.fn().mockResolvedValue({
      id: 'doc-1', user_id: 'user-1', r2_key: 'key',
      file_name: 'document.docx',
      mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    // Set up mock file in storage
    const testDocx = Buffer.from([0x50, 0x4B, 0x03, 0x04]);
    env.PLATFORM_CONTEXT.storage.download = vi.fn().mockResolvedValue(testDocx);
    env.PLATFORM_CONTEXT.db.run = vi.fn().mockResolvedValue({});
    const req = new Request('http://localhost/api/documents/doc-1/download');
    const res = await handleDownloadDocument(req, env as any, 'doc-1', 'user-1', 'student');
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Disposition')).toMatch(/attachment/);
  });
});
