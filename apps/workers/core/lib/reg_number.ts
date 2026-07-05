import type { D1Database } from '@cloudflare/workers-types';

/**
 * BMI UMS — Registration Number Generator
 * ─────────────────────────────────────────────────────────────────────────────
 * Format: BMI/{Career}-{ProgrammeCode}/{ShortYear}/{Serial padded to 3 digits}
 * Example: BMI/UG-CS/226/001
 *
 * ShortYear: remove the zero from the century prefix.
 *   2026 → '2' + '26' = '226'
 *   2027 → '2' + '27' = '227'
 *   2030 → '2' + '30' = '230'
 *
 * Concurrency strategy:
 *   A single atomic `INSERT ... ON CONFLICT ... DO UPDATE ... RETURNING` statement.
 *   SQLite executes this under an implicit exclusive write lock, so concurrent
 *   Workers cannot observe the same `last_serial` value before either increments it.
 *   This is the correct D1-native substitute for PostgreSQL `SELECT ... FOR UPDATE`.
 */

export async function generateRegNo(
  db: D1Database,
  programmeId: string,
  programmeCode: string,
  admissionYear: number,
  career: string
): Promise<string> {
  const result = await db.prepare(
    `INSERT INTO regno_counters (programme_id, admission_year, last_serial)
     VALUES (?, ?, 1)
     ON CONFLICT(programme_id, admission_year)
     DO UPDATE SET last_serial = last_serial + 1
     RETURNING last_serial`
  ).bind(programmeId, admissionYear).first<{ last_serial: number }>();

  if (!result || result.last_serial == null) {
    throw new Error('Failed to generate registration number: regno_counters may not be initialized');
  }

  // ShortYear: '20XX' → '2XX' (remove the '0' after '2')
  const shortYear = '2' + String(admissionYear).slice(2);

  // 3-digit padded serial
  const serial = String(result.last_serial).padStart(3, '0');

  // Sanitise inputs: uppercase, alphanumeric only
  const safeCareer = career.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const safeCode   = programmeCode.toUpperCase().replace(/[^A-Z0-9]/g, '');

  return `BMI/${safeCareer}-${safeCode}/${shortYear}/${serial}`;
}
