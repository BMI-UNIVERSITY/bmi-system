/**
 * Phase 5 Audit: D1 vs. Neon Data Verification Script
 * ─────────────────────────────────────────────────────────────────────────────
 * Compares record counts for all core and module tables between D1 and Neon Postgres.
 *
 * Usage:
 *   npx tsx scripts/verify-data-migration.ts [--local|--remote]
 */

import { execSync } from 'child_process';
import { neon } from '@neondatabase/serverless';
import * as fs from 'fs';
import * as path from 'path';

try {
  const devVarsPath = path.resolve(process.cwd(), '.dev.vars');
  if (fs.existsSync(devVarsPath)) {
    const lines = fs.readFileSync(devVarsPath, 'utf-8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx > 0) {
        const key = trimmed.slice(0, idx).trim();
        let val = trimmed.slice(idx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
} catch {
  // Ignore fallback
}

const NEON_URL = process.env.DATABASE_URL_CORE || process.env.DATABASE_URL;

if (!NEON_URL) {
  console.error('❌ Error: DATABASE_URL_CORE or DATABASE_URL must be set in .dev.vars or environment');
  process.exit(1);
}

const neonSql = neon(NEON_URL);

const isRemote = process.argv.includes('--remote');
const d1Flag = isRemote ? '--remote' : '--local';

const AUDIT_TABLES = [
  'schools',
  'faculties',
  'departments',
  'programs',
  'academic_terms',
  'persons',
  'users',
  'oauth_accounts',
  'sessions',
  'students',
  'student_profiles',
  'student_programs',
  'courses',
  'program_curriculum',
  'program_courses',
  'course_sections',
  'applications',
  'application_drafts',
  'application_status_logs',
  'documents',
  'recommendation_requests',
  'student_holds',
  'student_course_registrations',
  'enrollments',
  'grades',
  'invoices',
  'admin_audit_logs',
  'standing_rules',
  'academic_standing_records',
  'cms_pages',
  'cms_posts',
];

function getD1Count(tableName: string): number {
  try {
    const cmd = `npx wrangler d1 execute bmi-portal-db ${d1Flag} --command="SELECT COUNT(*) as cnt FROM ${tableName};" --json`;
    const output = execSync(cmd, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });
    const parsed = JSON.parse(output);
    if (Array.isArray(parsed) && parsed[0]?.results?.[0]) {
      return Number(parsed[0].results[0].cnt || parsed[0].results[0]['COUNT(*)'] || 0);
    }
    return 0;
  } catch {
    return 0;
  }
}

async function getNeonCount(tableName: string): Promise<number> {
  try {
    const res = await (neonSql as any).query(`SELECT COUNT(*) as cnt FROM "${tableName}";`);
    return Number(res[0]?.cnt || 0);
  } catch {
    return 0;
  }
}

async function runVerification() {
  console.log(`\n🔍 Verifying Data Consistency (D1 ${isRemote ? '[Remote]' : '[Local]'} vs. Neon Postgres)...`);
  console.log('─'.repeat(65));
  console.log(
    `${'Table Name'.padEnd(30)} | ${'D1 Count'.padStart(10)} | ${'Neon Count'.padStart(10)} | Status`
  );
  console.log('─'.repeat(65));

  let passed = 0;
  let mismatched = 0;

  for (const tableName of AUDIT_TABLES) {
    const d1Cnt = getD1Count(tableName);
    const neonCnt = await getNeonCount(tableName);

    const match = d1Cnt === neonCnt;
    if (match) passed++;
    else mismatched++;

    const statusStr = match ? '✅ MATCH' : `❌ MISMATCH (${d1Cnt} vs ${neonCnt})`;

    console.log(
      `${tableName.padEnd(30)} | ${String(d1Cnt).padStart(10)} | ${String(neonCnt).padStart(10)} | ${statusStr}`
    );
  }

  console.log('─'.repeat(65));
  console.log(`Summary: ${passed} matched, ${mismatched} mismatched out of ${AUDIT_TABLES.length} tables.\n`);

  if (mismatched > 0) {
    process.exit(1);
  }
}

runVerification().catch(err => {
  console.error('Fatal verification error:', err);
  process.exit(1);
});
