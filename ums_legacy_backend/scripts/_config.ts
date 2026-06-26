/**
 * Shared configuration for BMI UMS development scripts.
 * All scripts should import credentials from here instead of hardcoding them.
 *
 * Usage:
 *   import { PB_URL, PB_EMAIL, PB_PASSWORD } from './_config.js';
 *
 * Set credentials in backend/.env before running scripts.
 */
import * as dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env from the backend/ directory
dotenv.config({ path: resolve(__dirname, '../.env') });

export const PB_URL =
  process.env.POCKETBASE_URL ?? 'http://127.0.0.1:8090';

export const PB_EMAIL =
  process.env.POCKETBASE_ADMIN_EMAIL ?? 'admin@bmi.edu';

export const PB_PASSWORD = (() => {
  const p = process.env.POCKETBASE_ADMIN_PASSWORD;
  if (!p || p.length < 12) {
    console.error(
      '\n❌  POCKETBASE_ADMIN_PASSWORD is not set (or is too short).\n' +
      '    Copy backend/.env.example → backend/.env and fill in the values.\n'
    );
    process.exit(1);
  }
  return p;
})();
