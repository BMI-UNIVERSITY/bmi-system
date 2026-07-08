import type { IDatabase } from '@bmi/ports';


/**
 * Atomically generates a new Application Number for a given calendar year.
 * Uses a per-year counter row with INSERT ... ON CONFLICT ... DO UPDATE to handle
 * both first-ever and subsequent calls atomically on D1/SQLite.
 *
 * Format: APP-{YYYY}-{5-digit padded serial}  e.g. APP-2026-00001
 */
export async function generateApplicationNumber(db: IDatabase, year: number): Promise<string> {
  const result = await db.prepare(
    `INSERT INTO application_number_counters (year, last_serial)
     VALUES (?, 1)
     ON CONFLICT(year) DO UPDATE SET last_serial = last_serial + 1
     RETURNING last_serial`
  ).bind(year).first<{ last_serial: number }>();

  if (!result || result.last_serial == null) {
    throw new Error('Failed to generate application number: counter table may not be initialized');
  }

  const paddedSerial = String(result.last_serial).padStart(5, '0');
  return `APP-${year}-${paddedSerial}`;
}
