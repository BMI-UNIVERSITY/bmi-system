import { makeEnv, makeChainDB } from './test-helpers';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  handleSaveRegistrationStep,
  handleGetRegistrationStatus,
  handleCompleteRegistration,
  handleGetAvailableModules,
} from './registration';

vi.mock('../lib/email', () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
  buildEmailLayout: vi.fn().mockReturnValue('<html></html>'),
}));

vi.mock('../lib/provisioning', () => ({
  enqueueProvisioningJobs: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../lib/reg_number', () => ({
  generateRegNo: vi.fn().mockResolvedValue('BMI/UG-CS/226/001'),
}));

describe('Registration routes — handleSaveRegistrationStep', () => {
  let env: ReturnType<typeof makeEnv>;

  beforeEach(() => {
    vi.clearAllMocks();
    env = makeEnv();
  });

  it('saves a registration step successfully', async () => {
    const req = new Request('http://localhost/api/registration/personal_details', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ first_name: 'Jane', last_name: 'Doe', date_of_birth: '2000-01-01', gender: 'female', nationality: 'Liberian' }),
    });
    const res = await handleSaveRegistrationStep(req, env, 'user-123', 'personal_details');
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.message).toContain('personal_details');
    expect(body.data.completed_steps).toContain('personal_details');
  });

  it('returns 405 for non-POST requests', async () => {
    const req = new Request('http://localhost/api/registration/personal_details', {
      method: 'GET',
    });
    const res = await handleSaveRegistrationStep(req, env, 'user-123', 'personal_details');

    expect(res.status).toBe(405);
  });

  it('returns 400 for invalid step name', async () => {
    const req = new Request('http://localhost/api/registration/invalid_step', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const res = await handleSaveRegistrationStep(req, env, 'user-123', 'invalid_step');
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
  });

  it('returns 400 when required fields are missing', async () => {
    const req = new Request('http://localhost/api/registration/personal_details', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const res = await handleSaveRegistrationStep(req, env, 'user-123', 'personal_details');
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe('First name is required');
  });

  it('validates all step fields', async () => {
    const req = new Request('http://localhost/api/registration/programme', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ programme_id: '', study_mode: '' }),
    });
    const res = await handleSaveRegistrationStep(req, env, 'user-123', 'programme');
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe('Programme selection is required');
  });

  it('returns 500 when database write fails', async () => {
    const db = {
      prepare: vi.fn().mockReturnThis(),
      bind: vi.fn().mockReturnThis(),
      run: vi.fn().mockRejectedValue(new Error('DB unavailable')),
      first: vi.fn().mockResolvedValue(null),
      all: vi.fn().mockResolvedValue({ results: [] }),
      batch: vi.fn().mockResolvedValue([]),
      transaction: vi.fn().mockImplementation(async (cb: any) => cb(db)),
      query: vi.fn().mockResolvedValue([]),
      queryOne: vi.fn().mockResolvedValue(null),
      getPlatform: vi.fn().mockReturnValue('test'),
    };
    const brokenEnv = makeEnv(db);

    const req = new Request('http://localhost/api/registration/address', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ current_address: '123 Main St', emergency_contact_name: 'Mom', emergency_contact_phone: '+231' }),
    });
    const res = await handleSaveRegistrationStep(req, brokenEnv, 'user-123', 'address');
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
  });

  it('preserves step data across multiple steps', async () => {
    const req1 = new Request('http://localhost/api/registration/personal_details', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ first_name: 'John', last_name: 'Doe', date_of_birth: '2000-01-01', gender: 'male', nationality: 'Liberian' }),
    });
    const res1 = await handleSaveRegistrationStep(req1, env, 'user-456', 'personal_details');
    expect(res1.status).toBe(200);

    const req2 = new Request('http://localhost/api/registration/address', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ current_address: '123 Main St', emergency_contact_name: 'Mom', emergency_contact_phone: '+231' }),
    });
    const res2 = await handleSaveRegistrationStep(req2, env, 'user-456', 'address');
    expect(res2.status).toBe(200);
  });

  it('reports all_completed false when steps remain', async () => {
    const req = new Request('http://localhost/api/registration/personal_details', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ first_name: 'A', last_name: 'B', date_of_birth: '2000-01-01', gender: 'male', nationality: 'Liberian' }),
    });
    const res = await handleSaveRegistrationStep(req, env, 'user-789', 'personal_details');
    const body = await res.json();

    expect(body.data.all_completed).toBe(false);
  });

  it('validates modules step requires at least one course', async () => {
    const req = new Request('http://localhost/api/registration/modules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ selected_course_ids: [] }),
    });
    const res = await handleSaveRegistrationStep(req, env, 'user-123', 'modules');
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe('At least one module must be selected');
  });

  it('validates confirm step requires terms, accuracy, and signature', async () => {
    const req = new Request('http://localhost/api/registration/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accepted_terms: false, data_accuracy_confirmed: false, signed_name: '' }),
    });
    const res = await handleSaveRegistrationStep(req, env, 'user-123', 'confirm');
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe('You must accept the terms and conditions');
  });
});

describe('Registration routes — handleGetRegistrationStatus', () => {
  let env: ReturnType<typeof makeEnv>;

  beforeEach(() => {
    vi.clearAllMocks();
    env = makeEnv();
  });

  it('returns empty status when no data exists', async () => {
    const res = await handleGetRegistrationStatus(new Request('http://localhost/api/registration/status'), env, 'user-123');
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.completed_steps).toEqual([]);
    expect(body.data.next_step).toBe('personal_details');
    expect(body.data.registration_complete).toBe(false);
  });

  it('returns correct completed steps', async () => {
    const db = makeChainDB([{ value: JSON.stringify({ personal_details: { first_name: 'Jane' } }) }]);
    const localEnv = makeEnv(db);

    const res = await handleGetRegistrationStatus(new Request('http://localhost/api/registration/status'), localEnv, 'user-123');
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.completed_steps).toEqual(['personal_details']);
    expect(body.data.next_step).toBe('address');
    expect(body.data.registration_complete).toBe(false);
  });

  it('returns 500 on db failure', async () => {
    const db = makeChainDB([new Error('DB error')]);
    // Override first to reject
    const chain = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockRejectedValue(new Error('DB error')),
          all: vi.fn().mockResolvedValue({ results: [] }),
          run: vi.fn().mockResolvedValue({ success: true }),
        }),
        first: vi.fn().mockResolvedValue(null),
        all: vi.fn().mockResolvedValue({ results: [] }),
        run: vi.fn().mockResolvedValue({ success: true }),
      }),
      query: vi.fn().mockResolvedValue([]),
      queryOne: vi.fn().mockResolvedValue(null),
      transaction: vi.fn().mockImplementation(async (cb: any) => cb(db)),
      getPlatform: vi.fn().mockReturnValue('test-mock'),
    };
    const localEnv = makeEnv(chain);

    const res = await handleGetRegistrationStatus(new Request('http://localhost/api/registration/status'), localEnv, 'user-123');
    expect(res.status).toBe(500);
  });
});

describe('Registration routes — handleCompleteRegistration', () => {
  let env: ReturnType<typeof makeEnv>;

  beforeEach(() => {
    vi.clearAllMocks();
    env = makeEnv();
  });

  it('returns 400 when no registration data exists', async () => {
    const res = await handleCompleteRegistration(new Request('http://localhost/api/registration/complete', { method: 'POST' }), env, 'user-123');
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe('No registration data found');
  });

  it('returns 400 when steps are missing', async () => {
    const db = makeChainDB([{ value: JSON.stringify({ personal_details: { first_name: 'Jane' } }) }]);
    const localEnv = makeEnv(db);

    const res = await handleCompleteRegistration(new Request('http://localhost/api/registration/complete', { method: 'POST' }), localEnv, 'user-123');
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/not yet completed/);
  });

  it('completes registration successfully', async () => {
    const allSteps = {
      personal_details: { first_name: 'Jane', last_name: 'Doe', date_of_birth: '2000-01-01', gender: 'female', nationality: 'Liberian' },
      address: { current_address: '123 St', city: 'Monrovia', state: 'Montserrado', country: 'Liberia', emergency_contact_name: 'Mom', emergency_contact_phone: '+231' },
      programme: { programme_id: 'bsc-cs', programme_name: 'BSc Computer Science', level: 'undergraduate', study_mode: 'full_time' },
      modules: { selected_course_ids: ['c1', 'c2'], total_credits: 30 },
      fees: { accepted_fee_structure: true, payment_method: 'bank_transfer', scholarship_claimed: false },
      confirm: { accepted_terms: true, data_accuracy_confirmed: true, signed_name: 'Jane Doe', signed_date: new Date().toISOString() },
    };
    // Chain: 1st first() = metadata, 2nd = userRow (with uid), 3rd = progInfo
    const db = makeChainDB([
      { value: JSON.stringify(allSteps) },
      { email: 'jane@test.com', first_name: 'Jane', last_name: 'Doe', reg_no: 'PENDING-ABC12345', uid: 'UID-001' },
      { code: 'CS', level: 'UG' },
    ]);
    const localEnv = makeEnv(db);

    const ctx = { waitUntil: vi.fn(), passThroughOnException: vi.fn() };
    const res = await handleCompleteRegistration(new Request('http://localhost/api/registration/complete', { method: 'POST' }), localEnv, 'user-123', ctx as any);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.message).toBe('Registration completed successfully');
  });
});

describe('Registration routes — handleGetAvailableModules', () => {
  let env: ReturnType<typeof makeEnv>;

  beforeEach(() => {
    vi.clearAllMocks();
    env = makeEnv();
  });

  it('returns all modules when no programme selected', async () => {
    const courses = [
      { id: 'c1', code: 'CS101', name: 'Intro to CS', credits: 3, level: '100' },
      { id: 'c2', code: 'MATH101', name: 'Calculus I', credits: 4, level: '100' },
    ];
    const db = makeChainDB([null], [courses]);
    const localEnv = makeEnv(db);

    const res = await handleGetAvailableModules(new Request('http://localhost/api/registration/modules'), localEnv, 'user-123');
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(2);
  });

  it('returns programme-filtered modules when programme is selected', async () => {
    const courses = [{ id: 'c1', code: 'CS101', name: 'Intro to CS', credits: 3, level: '100' }];
    const db = makeChainDB(
      [{ value: JSON.stringify({ programme: { programme_id: 'bsc-cs' } }) }],
      [courses],
    );
    const localEnv = makeEnv(db);

    const res = await handleGetAvailableModules(new Request('http://localhost/api/registration/modules'), localEnv, 'user-123');
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(1);
  });

  it('returns 500 on db failure', async () => {
    const chain = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockRejectedValue(new Error('DB error')),
          all: vi.fn().mockResolvedValue({ results: [] }),
          run: vi.fn().mockResolvedValue({ success: true }),
        }),
        first: vi.fn().mockResolvedValue(null),
        all: vi.fn().mockResolvedValue({ results: [] }),
        run: vi.fn().mockResolvedValue({ success: true }),
      }),
      query: vi.fn().mockResolvedValue([]),
      queryOne: vi.fn().mockResolvedValue(null),
      transaction: vi.fn().mockImplementation(async (cb: any) => cb(chain)),
      getPlatform: vi.fn().mockReturnValue('test-mock'),
    };
    const localEnv = makeEnv(chain);

    const res = await handleGetAvailableModules(new Request('http://localhost/api/registration/modules'), localEnv, 'user-123');
    expect(res.status).toBe(500);
  });
});
