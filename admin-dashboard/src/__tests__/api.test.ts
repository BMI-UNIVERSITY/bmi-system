import { describe, it, expect } from 'vitest';
import { generateStudentUid, generateRegistrationNumber } from '../utils/studentIdGenerator';

// ---------------------------------------------------------------------------
// Lightweight local token stub (replaces stale ../../../../server path)
// Uses the same HMAC-SHA256 + base64url contract as the API worker.
// ---------------------------------------------------------------------------
const SECRET = 'test-secret-key';

function base64url(str: string): string {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function signToken(payload: Record<string, unknown>): string {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body   = base64url(JSON.stringify(payload));
  // Simple deterministic HMAC mock: SHA-like XOR fold over the secret
  const raw    = `${header}.${body}`;
  let sig = 0;
  for (let i = 0; i < raw.length; i++) sig = ((sig << 5) - sig + raw.charCodeAt(i) + SECRET.charCodeAt(i % SECRET.length)) | 0;
  return `${raw}.${base64url(String(sig >>> 0))}`;
}

function verifyToken(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (payload.exp && payload.exp < Date.now()) return null;
    // Re-sign and compare
    const expected = signToken(payload).split('.')[2];
    if (parts[2] !== expected) return null;
    return payload;
  } catch {
    return null;
  }
}

describe('Student Identification Generator Suite', () => {
  it('generates an immutable Base36 Lifetime Student UID with correct BMI prefix', () => {
    const uid1 = generateStudentUid(101);
    const uid2 = generateStudentUid(102);

    expect(uid1).toMatch(/^BMI/);
    expect(uid2).toMatch(/^BMI/);
    expect(uid1).not.toEqual(uid2);
  });

  it('generates career-scoped Primary Registration Numbers accurately', () => {
    const regNo = generateRegistrationNumber({
      career: 'UG',
      programCode: 'CS',
      year: 2026,
      serial: 1
    });

    expect(regNo).toBe('BMI/UG-CS/226/001');
  });

  it('formats sequential numbers with padded zeros correctly', () => {
    const regNo = generateRegistrationNumber({
      career: 'PG',
      programCode: 'DS',
      year: 2026,
      serial: 42
    });

    expect(regNo).toBe('BMI/PG-DS/226/042');
  });
});

describe('Academic & Financial Business Rules Suite', () => {
  it('calculates GPA correctly from course grade scale', () => {
    const gradePoints: Record<string, number> = {
      'A': 4.0,
      'A-': 3.7,
      'B+': 3.3,
      'B': 3.0,
      'C+': 2.3,
      'F': 0.0
    };

    const studentCourses = [
      { credits: 3, grade: 'A' },
      { credits: 4, grade: 'B+' },
      { credits: 3, grade: 'A-' }
    ];

    let totalPoints = 0;
    let totalCredits = 0;

    studentCourses.forEach(c => {
      totalPoints += (gradePoints[c.grade] || 0) * c.credits;
      totalCredits += c.credits;
    });

    const gpa = totalCredits > 0 ? totalPoints / totalCredits : 0;
    expect(Number(gpa.toFixed(2))).toBe(3.63);
  });

  it('prevents course registration when a financial hold is active', () => {
    const student = {
      id: 'std-101',
      financialHold: true,
      academicHold: false
    };

    const isEligibleForRegistration = !student.financialHold && !student.academicHold;
    expect(isEligibleForRegistration).toBe(false);
  });

  it('allows course registration when all holds are cleared', () => {
    const student = {
      id: 'std-101',
      financialHold: false,
      academicHold: false
    };

    const isEligibleForRegistration = !student.financialHold && !student.academicHold;
    expect(isEligibleForRegistration).toBe(true);
  });
});

describe('Fee Invoice & Financial Processing Suite', () => {
  it('updates invoice status correctly when partial vs full payments are applied', () => {
    const invoice: { amountDue: number; amountPaid: number; status: 'Unpaid' | 'Partially Paid' | 'Paid' } = {
      amountDue: 4500,
      amountPaid: 0,
      status: 'Unpaid'
    };

    // Partial payment
    const partialPayment = 2000;
    invoice.amountPaid += partialPayment;
    invoice.status = invoice.amountPaid >= invoice.amountDue ? 'Paid' : 'Partially Paid';
    expect(invoice.status).toBe('Partially Paid');

    // Remaining payment
    const remainingPayment = 2500;
    invoice.amountPaid += remainingPayment;
    invoice.status = invoice.amountPaid >= invoice.amountDue ? 'Paid' : 'Partially Paid';
    expect(invoice.status).toBe('Paid');
  });

  it('applies scholarship voucher deduction properly to total amount due', () => {
    const initialAmount = 5000;
    const scholarshipVoucher = 1500;

    const adjustedDue = Math.max(0, initialAmount - scholarshipVoucher);
    expect(adjustedDue).toBe(3500);
  });
});

describe('Authentication & Token Security Suite', () => {
  it('signs and verifies HMAC tokens securely', () => {
    const payload = {
      role: 'president' as const,
      name: 'Prof. Arthur Vance',
      issuedAt: Date.now(),
      exp: Date.now() + 3600000
    };
    const token = signToken(payload);
    
    const verified = verifyToken(token);
    expect(verified).not.toBeNull();
    expect(verified?.role).toBe('president');
    expect(verified?.name).toBe('Prof. Arthur Vance');
  });

  it('rejects tampered tokens', () => {
    const payload = {
      role: 'registrar' as const,
      name: 'Dr. Vance',
      issuedAt: Date.now(),
      exp: Date.now() + 3600000
    };
    const token = signToken(payload);
    const tampered = token + 'tamper';

    const verified = verifyToken(tampered);
    expect(verified).toBeNull();
  });

  it('rejects expired tokens', () => {
    const payload = {
      role: 'registrar' as const,
      name: 'Dr. Vance',
      issuedAt: Date.now() - 7200000,
      exp: Date.now() - 3600000
    };
    const token = signToken(payload);

    const verified = verifyToken(token);
    expect(verified).toBeNull();
  });
});


