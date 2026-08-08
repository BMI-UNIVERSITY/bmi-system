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

export function makeDrizzleMock(getVals: any[] = [], allVals: any[] = []) {
  let gi = 0, ai = 0;
  // .get() → one scalar from getVals queue
  const get = vi.fn().mockImplementation(() => Promise.resolve(getVals[gi++ % Math.max(getVals.length, 1)] ?? null));
  // .all() → one result-set from allVals queue
  const all = vi.fn().mockImplementation(() => Promise.resolve(allVals[ai++ % Math.max(allVals.length, 1)] ?? []));
  const run = vi.fn().mockResolvedValue({ success: true, meta: { changes: 1 } });

  const execute = vi.fn().mockImplementation(() => {
    if (getVals.length > 0 && gi < getVals.length) {
      const val = getVals[gi++];
      return Promise.resolve(val === null || val === undefined ? [] : Array.isArray(val) ? val : [val]);
    }
    const res = allVals[ai++ % Math.max(allVals.length, 1)] ?? [];
    return Promise.resolve(Array.isArray(res) ? res : [res]);
  });

  const runObj = {
    run,
    execute: vi.fn().mockResolvedValue({ success: true, meta: { changes: 1 } }),
    then: (onFulfilled: any) => Promise.resolve({ success: true, meta: { changes: 1 } }).then(onFulfilled),
  };

  // When the query chain itself is awaited (no explicit .all()/.get()/.execute()), resolve via all()
  const buildSelectBuilder = (): any => {
    const builder: any = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      offset: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      get,
      all,
      run,
      execute,
      then: (onFulfilled: any, onRejected: any) =>
        all().then(onFulfilled, onRejected),
    };
    return builder;
  };

  const mock: any = {
    select: vi.fn().mockImplementation(() => buildSelectBuilder()),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoUpdate: vi.fn().mockReturnValue(runObj),
        onConflictDoNothing: vi.fn().mockReturnValue(runObj),
        run,
        execute: vi.fn().mockResolvedValue({ success: true, meta: { changes: 1 } }),
        then: (onFulfilled: any) => Promise.resolve({ success: true, meta: { changes: 1 } }).then(onFulfilled),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue(runObj),
        run,
        execute: vi.fn().mockResolvedValue({ success: true, meta: { changes: 1 } }),
        then: (onFulfilled: any) => Promise.resolve({ success: true, meta: { changes: 1 } }).then(onFulfilled),
      }),
    }),
    delete: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue(runObj),
      run,
      execute: vi.fn().mockResolvedValue({ success: true, meta: { changes: 1 } }),
      then: (onFulfilled: any) => Promise.resolve({ success: true, meta: { changes: 1 } }).then(onFulfilled),
    }),
    transaction: vi.fn().mockImplementation(async (cb: any) => cb(mock)),
    execute: vi.fn().mockResolvedValue({ rows: [] }),
  };
  return mock;
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
      authenticate: vi.fn(),
    },
    document: {
      getTemplate: vi.fn(),
      generateDocument: vi.fn(),
      signDocument: vi.fn(),
    },
    storage: {
      uploadFile: vi.fn().mockImplementation(async (key: string, data: Buffer | Uint8Array) => {
        mockStorageFiles.set(key, Buffer.from(data));
        return { key, url: `https://storage.test/${key}`, size: data.length };
      }),
      getFile: vi.fn().mockImplementation(async (key: string) => {
        return mockStorageFiles.get(key) || null;
      }),
      deleteFile: vi.fn().mockImplementation(async (key: string) => {
        mockStorageFiles.delete(key);
      }),
    },
    lms: {
      getCourses: vi.fn(),
      getGrades: vi.fn(),
    },
    payment: {
      createPaymentIntent: vi.fn().mockResolvedValue({ id: 'pi_mock_123', amount: 1000, currency: 'USD', status: 'succeeded' }),
      handleWebhook: vi.fn(),
    },
    alumni: {
      setupEmailForwarding: vi.fn().mockResolvedValue(true),
    },
    email: {
      createMailbox: vi.fn().mockResolvedValue(true),
      sendEmail: vi.fn().mockResolvedValue(true),
    },
  };
}

/** Helper to construct Env with PLATFORM_CONTEXT attached */
export function makeEnv(db?: any, extraEnv: Record<string, any> = {}): any {
  return {
    PLATFORM_CONTEXT: makeContext(db),
    JWT_SECRET: 'test-jwt-secret-key-32-bytes-long!!',
    ENVIRONMENT: 'test',
    ADMIN_KEY: 'test-admin-key',
    ...extraEnv,
  };
}
