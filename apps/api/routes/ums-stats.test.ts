import { makeEnv } from './test-helpers';
import { describe, it, expect, vi } from 'vitest';
import {
  handleCatalogFaculties,
  handleCatalogDepartments,
  handleCatalogPrograms,
  handleCatalogTerms,
  handleStudentStatsOverview,
  handleStaffStatsOverview,
  handleCourseStatsOverview,
  handleFinanceStats,
  handleVerifyCertificate,
  handleCertificateVerificationStats,
} from './ums-stats';



function makeAllMock(results: any[] = []) {
  return { results };
}

describe('ums-stats catalog routes', () => {
  it('handleCatalogFaculties returns active faculties', async () => {
    const db = {
      prepare: vi.fn().mockReturnValue({
        all: vi.fn().mockResolvedValue(makeAllMock([{ id: 'f1', name: 'Science' }]))
      })
    };
    const req = new Request('http://localhost/api/catalog/faculties');
    const res = await handleCatalogFaculties(req, makeEnv(db));
    const body = await res.json() as any;
    expect(body.data[0].name).toBe('Science');
  });

  it('handleCatalogDepartments filters by facultyId', async () => {
    const bindMock = vi.fn().mockReturnValue({
      all: vi.fn().mockResolvedValue(makeAllMock([{ id: 'd1', name: 'Physics' }]))
    });
    const db = { prepare: vi.fn().mockReturnValue({ bind: bindMock, all: vi.fn().mockResolvedValue(makeAllMock([])) }) };
    const req = new Request('http://localhost/api/catalog/departments?facultyId=f1');
    await handleCatalogDepartments(req, makeEnv(db));
    expect(bindMock).toHaveBeenCalledWith('f1');
  });

  it('handleCatalogPrograms filters by deptId', async () => {
    const bindMock = vi.fn().mockReturnValue({
      all: vi.fn().mockResolvedValue(makeAllMock([]))
    });
    const db = { prepare: vi.fn().mockReturnValue({ bind: bindMock, all: vi.fn().mockResolvedValue(makeAllMock([])) }) };
    const req = new Request('http://localhost/api/catalog/programs?deptId=d1');
    await handleCatalogPrograms(req, makeEnv(db));
    expect(bindMock).toHaveBeenCalledWith('d1');
  });

  it('handleCatalogTerms returns all terms', async () => {
    const db = {
      prepare: vi.fn().mockReturnValue({
        all: vi.fn().mockResolvedValue(makeAllMock([{ id: 't1', name: 'Fall 2026' }]))
      })
    };
    const res = await handleCatalogTerms(new Request('http://localhost'), makeEnv(db));
    const body = await res.json() as any;
    expect(body.data[0].name).toBe('Fall 2026');
  });
});

describe('ums-stats overview routes', () => {
  function makeMultiFirstDB(values: any[]) {
    let callIndex = 0;
    return {
      prepare: vi.fn().mockImplementation(() => ({
        first: vi.fn().mockImplementation(() => Promise.resolve(values[callIndex++ % values.length])),
        all: vi.fn().mockResolvedValue(makeAllMock([])),
      }))
    };
  }

  it('handleStudentStatsOverview returns aggregated counts', async () => {
    const db = makeMultiFirstDB([{ c: 100 }, { c: 80 }, { c: 10 }, { c: 5 }, { c: 3 }, { c: 2 }]);
    (db as any).prepare = vi.fn().mockReturnValue({
      first: vi.fn().mockResolvedValue({ c: 42 }),
      all: vi.fn().mockResolvedValue(makeAllMock([])),
    });
    const res = await handleStudentStatsOverview(new Request('http://localhost'), makeEnv(db));
    const body = await res.json() as any;
    expect(res.status).toBe(200);
    expect(body.data).toHaveProperty('total');
    expect(body.data).toHaveProperty('byGender');
  });

  it('handleStaffStatsOverview returns total and byDepartment', async () => {
    const db = {
      prepare: vi.fn().mockReturnValue({
        first: vi.fn().mockResolvedValue({ c: 15 }),
        all: vi.fn().mockResolvedValue(makeAllMock([{ department: 'CS', count: 5 }])),
      })
    };
    const res = await handleStaffStatsOverview(new Request('http://localhost'), makeEnv(db));
    const body = await res.json() as any;
    expect(body.data.total).toBe(15);
    expect(body.data.byDepartment[0].department).toBe('CS');
  });

  it('handleCourseStatsOverview returns published/draft/enrollment counts', async () => {
    const db = {
      prepare: vi.fn().mockReturnValue({
        first: vi.fn().mockResolvedValue({ c: 10 }),
        all: vi.fn().mockResolvedValue(makeAllMock([])),
      })
    };
    const res = await handleCourseStatsOverview(new Request('http://localhost'), makeEnv(db));
    const body = await res.json() as any;
    expect(body.data).toHaveProperty('total');
    expect(body.data).toHaveProperty('enrollments');
  });

  it('handleFinanceStats returns revenue and outstanding', async () => {
    const db = {
      prepare: vi.fn().mockReturnValue({
        first: vi.fn().mockResolvedValue({ c: 20, s: 5000 }),
      })
    };
    const res = await handleFinanceStats(new Request('http://localhost'), makeEnv(db));
    const body = await res.json() as any;
    expect(body.data).toHaveProperty('totalRevenue');
    expect(body.data).toHaveProperty('outstanding');
  });
});

describe('ums-stats certificate verification', () => {
  it('handleVerifyCertificate returns 400 if no serial', async () => {
    const db = { prepare: vi.fn() };
    const req = new Request('http://localhost/api/certs/verify', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const res = await handleVerifyCertificate(req, makeEnv(db));
    expect(res.status).toBe(400);
  });

  it('handleVerifyCertificate returns not found for unknown serial', async () => {
    const db = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({ first: vi.fn().mockResolvedValue(null) })
      })
    };
    const req = new Request('http://localhost/api/certs/verify', {
      method: 'POST',
      body: JSON.stringify({ serial: 'UNKNOWN-123' }),
    });
    const res = await handleVerifyCertificate(req, makeEnv(db));
    const body = await res.json() as any;
    expect(body.data.valid).toBe(false);
  });

  it('handleVerifyCertificate returns valid certificate', async () => {
    const cert = {
      id: 'cert1', serial_number: 'BMI-001', status: 'ISSUED',
      student_name: 'Alice Smith', degree_title: 'BSc CS',
      issue_date: '2026-06-01', gpa: '3.8', content_hash: 'abc123',
      verification_count: 0,
    };
    const db = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(cert),
          run: vi.fn().mockResolvedValue({})
        })
      })
    };
    const req = new Request('http://localhost/api/certs/verify', {
      method: 'POST',
      body: JSON.stringify({ serial: 'BMI-001', hash: 'abc123' }),
    });
    const res = await handleVerifyCertificate(req, makeEnv(db));
    const body = await res.json() as any;
    expect(body.data.valid).toBe(true);
    expect(body.data.verification.hash_verified).toBe(true);
  });

  it('handleCertificateVerificationStats returns issued/revoked counts', async () => {
    const db = {
      prepare: vi.fn().mockReturnValue({
        first: vi.fn().mockResolvedValue({ c: 5, s: 100 }),
      })
    };
    const res = await handleCertificateVerificationStats(new Request('http://localhost'), makeEnv(db));
    const body = await res.json() as any;
    expect(body.data).toHaveProperty('issued');
    expect(body.data).toHaveProperty('totalVerifications');
  });
});
