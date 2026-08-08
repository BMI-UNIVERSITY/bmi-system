import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { getSmokeDb, cleanupSmokeData } from './setup';
import { makeNeonEnv } from './helpers';
import { translateSqliteToPostgres, rewritePlaceholders } from '@bmi/adapters';

// Mock heavy side-effects for route handlers since we only want to test DB logic
vi.mock('../../routes/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../routes/auth')>();
  return actual;
});
vi.mock('@bmi/api-middleware', () => ({
  hashPassword: vi.fn().mockResolvedValue('hashed_password'),
  verifyPassword: vi.fn().mockResolvedValue(true),
  rateLimit: vi.fn().mockResolvedValue(null),
}));
vi.mock('../../lib/jwt', () => ({
  signJWT: vi.fn().mockResolvedValue('mock_jwt_token'),
  validatePasswordStrength: vi.fn().mockReturnValue({ valid: true, errors: [] }),
  isCommonPassword: vi.fn().mockReturnValue(false),
}));
vi.mock('../../lib/webhook', () => ({
  dispatchWebhook: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../../lib/app_number', () => ({
  generateApplicationNumber: vi.fn().mockImplementation(() => Promise.resolve(`SMOKE-APP-${Date.now()}`)),
}));
vi.mock('../../lib/lifecycle', () => ({
  runAdmissionPipeline: vi.fn().mockResolvedValue(undefined),
  appendLifecycleEvent: vi.fn().mockResolvedValue(undefined),
  getLifecycleHistory: vi.fn().mockResolvedValue([]),
  STAGES: { review: 'review' },
}));
vi.mock('../../lib/provisioning', () => ({
  dispatchPendingJobs: vi.fn().mockResolvedValue(undefined),
}));

// We import routes after mocks
import { handleLogin, handleRegister } from '../../routes/auth';
import { handleSubmitApplication } from '../../routes/apply';
import { handleGetFinances } from '../../routes/student';

// Keep track of any unique IDs created during tests
const TEST_USER_ID = `smoke-test-user-${Date.now()}`;
const TEST_EMAIL = `smoke-${Date.now()}@example.com`;

describe('PostgresDatabaseAdapter Smoke Tests', () => {
  
  beforeAll(() => {
    // Check if env is present; skip if not.
    if (!process.env.DATABASE_URL_CORE) {
      console.log('Skipping smoke tests as DATABASE_URL_CORE is not set');
    }
  });

  afterAll(async () => {
    if (process.env.DATABASE_URL_CORE) {
      const db = getSmokeDb();
      await cleanupSmokeData(db);
    }
  });

  describe('1. Adapter Layer — Connection & Health', () => {
    it('should connect to the live Neon DB and return true for health()', async () => {
      const db = getSmokeDb();
      const isHealthy = await db.health();
      expect(isHealthy).toBe(true);
    });

    it('should execute a basic query (select 1)', async () => {
      const db = getSmokeDb();
      const res = await db.query('select 1 as value');
      expect(res.length).toBe(1);
      expect(res[0].value).toBe(1);
    });
  });

  describe('2. SQL Translation — Direct Adapter Calls', () => {
    it('should translate ? placeholders to $1, $2', () => {
      const sql = 'SELECT * FROM users WHERE email = ? AND role = ?';
      const translated = translateSqliteToPostgres(sql);
      const rewritten = rewritePlaceholders(translated);
      expect(rewritten).toBe('SELECT * FROM users WHERE email = $1 AND role = $2');
    });

    it('should translate datetime("now")', () => {
      const sql = 'INSERT INTO users (created_at) VALUES (datetime("now"))';
      const translated = translateSqliteToPostgres(sql);
      expect(translated).toMatch(/now\(\)/);
    });

    it('should translate INSERT OR IGNORE', () => {
      const sql = 'INSERT OR IGNORE INTO users (email) VALUES (?)';
      const translated = translateSqliteToPostgres(sql);
      expect(translated).toMatch(/^INSERT INTO/);
    });

    it('should translate strftime', () => {
      const sql = "SELECT strftime('%Y-%m', created_at) FROM users";
      const translated = translateSqliteToPostgres(sql);
      expect(translated).toMatch(/to_char\(created_at, 'YYYY-MM'\)/);
    });
  });

  describe('3. Route Handler — Auth (handleLogin)', () => {
    it('login with non-existent email returns 401 via real Neon query', async () => {
      const db = getSmokeDb();
      const env = makeNeonEnv(db);
      
      const req = new Request('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'ghost-smoke-test@example.com', password: 'Password1!' }),
      });
      
      const res = await handleLogin(req, env as any);
      expect(res.status).toBe(401);
    });
  });

  describe('4. Route Handler — Apply (handleSubmitApplication)', () => {
    it('submit with invalid program returns 400 (validation)', async () => {
      const db = getSmokeDb();
      const env = makeNeonEnv(db);
      
      const req = new Request('http://localhost/api/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          program: 'Not A Real Program',
          degree_level: 'undergraduate',
        }),
      });
      
      const res = await handleSubmitApplication(req, env as any, TEST_USER_ID);
      expect(res.status).toBe(400);
    });

    it('submit real application works end-to-end against Neon', async () => {
      const db = getSmokeDb();
      const env = makeNeonEnv(db);
      
      // First, create the user manually in the DB so the apply route can read their email
      await db.prepare(
        'INSERT INTO users (id, email, password_hash, first_name, last_name, role) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(TEST_USER_ID, TEST_EMAIL, 'hash', 'Smoke', 'Test', 'applicant').run();
      
      const req = new Request('http://localhost/api/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          program: 'BA in Biblical Studies',
          degree_level: 'undergraduate',
          personal_statement: 'I am a smoke test.',
          prior_education: 'High school',
        }),
      });
      
      const res = await handleSubmitApplication(req, env as any, TEST_USER_ID);
      expect(res.status).toBe(200);
      
      const body = await res.json() as any;
      expect(body.data?.application_id).toBeDefined();
      expect(body.data?.application_number).toMatch(/^SMOKE-APP-/);
      
      // Verify row exists in DB
      const row = await db.prepare('SELECT status FROM applications WHERE id = ?').bind(body.data.application_id).first();
      expect(row).toBeDefined();
      expect(row?.status).toBe('submitted');
    });
  });

  describe('5. Route Handler — Student (handleGetFinances)', () => {
    it('no student record returns empty invoices', async () => {
      const db = getSmokeDb();
      const env = makeNeonEnv(db);
      
      const req = new Request('http://localhost/api/student/finances');
      const res = await handleGetFinances(req, env as any, 'non-existent-student');
      
      const body = await res.json() as any;
      expect(res.status).toBe(200);
      expect(body.data.invoices).toHaveLength(0);
      expect(body.data.balance).toBe(0);
    });
  });
});
