import { beforeAll } from 'vitest';
import { PostgresDatabaseAdapter } from '@bmi/adapters';

let smokeDb: PostgresDatabaseAdapter | null = null;

export function getSmokeDb(): PostgresDatabaseAdapter {
  if (!smokeDb) {
    throw new Error('Smoke DB not initialized. Ensure DATABASE_URL_CORE is set.');
  }
  return smokeDb;
}

beforeAll(async () => {
  const url = process.env.DATABASE_URL_CORE;
  if (!url) {
    console.warn('⚠️ DATABASE_URL_CORE not set. Smoke tests may fail or be skipped.');
    return;
  }
  smokeDb = new PostgresDatabaseAdapter(url);
  await smokeDb.health();
});

export async function cleanupSmokeData(db: PostgresDatabaseAdapter, testPrefix: string = 'smoke-test-') {
  const likeStr = `${testPrefix}%`;
  // Clean up any test users and their applications
  await db.prepare(`DELETE FROM applications WHERE user_id IN (SELECT id FROM users WHERE id LIKE ?)`).bind(likeStr).run();
  await db.prepare(`DELETE FROM users WHERE id LIKE ?`).bind(likeStr).run();
}
