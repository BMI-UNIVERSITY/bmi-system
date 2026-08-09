#!/usr/bin/env node
/**
 * upload-worker-secrets.mjs
 *
 * One-shot script to upload all production secrets to the bmi-api Cloudflare Worker.
 * Run this ONCE from the workspace root after setting CLOUDFLARE_API_TOKEN in your shell.
 *
 * Usage:
 *   set CLOUDFLARE_API_TOKEN=<your-token>   (Windows)
 *   export CLOUDFLARE_API_TOKEN=<your-token> (Linux/macOS)
 *   node scripts/upload-worker-secrets.mjs
 *
 * The values are read from apps/api/.dev.vars — ensure that file is up to date.
 */

import { readFileSync } from 'fs';
import { execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const devVarsPath = resolve(__dirname, '../apps/api/.dev.vars');

// ── Parse .dev.vars ────────────────────────────────────────────────────────────
const raw = readFileSync(devVarsPath, 'utf8');
const vars = {};
for (const line of raw.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const idx = trimmed.indexOf('=');
  if (idx === -1) continue;
  const key = trimmed.slice(0, idx).trim();
  const val = trimmed.slice(idx + 1).trim();
  vars[key] = val;
}

// ── Secrets to upload to the Worker ───────────────────────────────────────────
// Only secrets go here — non-secret vars (ENVIRONMENT, ALLOWED_ORIGINS_OVERRIDE)
// are set as `vars` in wrangler.jsonc directly.
const SECRETS_TO_UPLOAD = [
  'JWT_SECRET',
  'PASSWORD_PEPPER',
  'RESEND_API_KEY',
  'DATABASE_URL',
  'DATABASE_URL_CORE',
  'DATABASE_URL_HR',
  'DATABASE_URL_LIBRARY',
  'DATABASE_URL_ALUMNI',
];

const WORKER_DIR = resolve(__dirname, '../apps/api');

console.log('\n🔐 BMI Worker Secrets Upload');
console.log('════════════════════════════════════════');
console.log(`📂 Reading from: ${devVarsPath}`);
console.log(`🚀 Uploading to worker: bmi-api\n`);

let success = 0;
let failed = 0;

for (const key of SECRETS_TO_UPLOAD) {
  const value = vars[key];
  if (!value) {
    console.warn(`⚠️  Skipping ${key} — not found in .dev.vars`);
    failed++;
    continue;
  }
  try {
    // Use echo to pipe the value into wrangler secret put (non-interactive)
    const cmd = process.platform === 'win32'
      ? `echo ${value}| pnpm exec wrangler secret put ${key}`
      : `printf '%s' '${value.replace(/'/g, "'\\''")}' | pnpm exec wrangler secret put ${key}`;

    execSync(cmd, {
      cwd: WORKER_DIR,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env },
    });
    console.log(`✅ ${key}`);
    success++;
  } catch (err) {
    const msg = err.stderr?.toString().trim() || err.message;
    console.error(`❌ ${key} — ${msg}`);
    failed++;
  }
}

console.log('\n════════════════════════════════════════');
console.log(`✅ Uploaded: ${success}  ❌ Failed: ${failed}`);

if (failed > 0) {
  console.log('\n💡 Ensure CLOUDFLARE_API_TOKEN is set in your environment.');
  process.exit(1);
}
