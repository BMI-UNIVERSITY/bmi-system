import type { D1Database } from '@cloudflare/workers-types';

/**
 * Atomically generates a new UID using the singleton `uid_counters` table.
 * The UID format is `BMI` followed by a 9-digit padded serial number (e.g., `BMI000000001`).
 */
export async function generateUID(db: D1Database): Promise<string> {
  // Use UPDATE ... RETURNING to ensure atomic increments on D1
  const result = await db.prepare(
    `UPDATE uid_counters 
     SET last_serial = last_serial + 1 
     WHERE id = 1 
     RETURNING last_serial`
  ).first<{ last_serial: number }>();

  if (!result || result.last_serial == null) {
    throw new Error('Failed to generate UID: uid_counters table may not be initialized');
  }

  const paddedSerial = String(result.last_serial).padStart(9, '0');
  return `BMI${paddedSerial}`;
}
