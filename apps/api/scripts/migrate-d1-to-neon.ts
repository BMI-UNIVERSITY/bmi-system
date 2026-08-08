/**
 * Phase 5: Cloudflare D1 → Neon PostgreSQL Data Migration Script
 * ─────────────────────────────────────────────────────────────────────────────
 * Extracts records from D1, performs type transformations (booleans, timestamps,
 * JSON objects), and loads them into Neon PostgreSQL in strict topological dependency order.
 *
 * Usage:
 *   npx tsx scripts/migrate-d1-to-neon.ts [--local|--remote]
 */

import { execSync } from 'child_process';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
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
const db = drizzle(neonSql);

const isRemote = process.argv.includes('--remote');
const d1Flag = isRemote ? '--remote' : '--local';

console.log(`\n🚀 Starting D1 → Neon Data Migration (${isRemote ? 'Remote D1' : 'Local D1'})`);
console.log(`Target Postgres DB: ${NEON_URL.replace(/:[^:@]+@/, ':****@')}\n`);

// ─── Topological Table Execution Order ────────────────────────────────────────

const MIGRATION_TABLES = [
  // 1. Reference & Core Infrastructure
  { name: 'schools', pkey: 'id' },
  { name: 'faculties', pkey: 'id' },
  { name: 'departments', pkey: 'id' },
  { name: 'programs', pkey: 'id' },
  { name: 'academic_terms', pkey: 'id' },
  { name: 'isced_fields', pkey: 'code' },
  
  // 2. Persons, Users & Auth
  { name: 'persons', pkey: 'id' },
  { name: 'users', pkey: 'id' },
  { name: 'oauth_accounts', pkey: 'id' },
  { name: 'sessions', pkey: 'id' },
  { name: 'student_settings', pkey: 'student_id' },

  // 3. Academic Core & Curriculum
  { name: 'students', pkey: 'user_id' },
  { name: 'student_profiles', pkey: 'id' },
  { name: 'student_programs', pkey: 'id' },
  { name: 'courses', pkey: 'id' },
  { name: 'program_curriculum', pkey: 'id' },
  { name: 'program_courses', pkey: 'id' },
  { name: 'course_sections', pkey: 'id' },

  // 4. Admissions & Student Operations
  { name: 'applications', pkey: 'id' },
  { name: 'application_drafts', pkey: 'user_id' },
  { name: 'application_status_logs', pkey: 'id' },
  { name: 'documents', pkey: 'id' },
  { name: 'recommendation_requests', pkey: 'id' },
  { name: 'student_holds', pkey: 'id' },
  { name: 'student_course_registrations', pkey: 'id' },
  { name: 'enrollments', pkey: 'id' },
  { name: 'grades', pkey: 'id' },
  { name: 'invoices', pkey: 'id' },
  
  // 5. Domain Modules & Governance
  { name: 'admin_audit_logs', pkey: 'id' },
  { name: 'standing_rules', pkey: 'id' },
  { name: 'academic_standing_records', pkey: 'id' },
  { name: 'cms_pages', pkey: 'id' },
  { name: 'cms_posts', pkey: 'id' },
  { name: 'cms_media', pkey: 'id' },
  { name: 'contact_submissions', pkey: 'id' },
  { name: 'newsletter_subscribers', pkey: 'id' },
  { name: 'support_tickets', pkey: 'id' },
];

function fetchD1Data(tableName: string): any[] {
  try {
    const cmd = `npx wrangler d1 execute bmi-portal-db ${d1Flag} --command="SELECT * FROM ${tableName};" --json`;
    const output = execSync(cmd, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });
    const parsed = JSON.parse(output);
    if (Array.isArray(parsed) && parsed[0]?.results) {
      return parsed[0].results;
    }
    return [];
  } catch {
    console.warn(`  ⚠️ Warning: Could not read table ${tableName} from D1 (it may be empty or not created yet).`);
    return [];
  }
}

// Format SQLite types to Postgres types
function transformRow(row: Record<string, any>): Record<string, any> {
  const transformed: Record<string, any> = {};

  for (const [key, val] of Object.entries(row)) {
    if (val === null || val === undefined) {
      transformed[key] = null;
      continue;
    }

    // Convert ISO date strings to Postgres timestamp format
    if (typeof val === 'string' && (key.endsWith('_at') || key.endsWith('_date') || key === 'date_of_birth')) {
      const parsedDate = new Date(val);
      if (!isNaN(parsedDate.getTime())) {
        transformed[key] = parsedDate.toISOString();
        continue;
      }
    }

    // Parse stringified JSON columns into real JSON objects
    if (typeof val === 'string' && (key === 'metadata' || key === 'details' || key === 'application_data' || key === 'criteria')) {
      try {
        transformed[key] = JSON.parse(val);
        continue;
      } catch {
        // keep as string if not valid json
      }
    }

    transformed[key] = val;
  }

  return transformed;
}

async function getPostgresColumns(tableName: string): Promise<Set<string>> {
  try {
    const rows = await (neonSql as any).query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = $1;`,
      [tableName]
    );
    return new Set(rows.map((r: any) => r.column_name));
  } catch {
    return new Set();
  }
}

const isFresh = process.argv.includes('--fresh');

async function runMigration() {
  let totalMigrated = 0;

  for (const table of MIGRATION_TABLES) {
    console.log(`📦 Processing table [${table.name}]...`);
    const rawRows = fetchD1Data(table.name);

    if (rawRows.length === 0) {
      console.log(`   └─ 0 rows found in D1.`);
      continue;
    }

    if (isFresh) {
      try {
        await (neonSql as any).query(`DELETE FROM "${table.name}";`);
      } catch {
        // ignore if empty
      }
    }

    const pgColumns = await getPostgresColumns(table.name);
    const transformedRows = rawRows.map(row => {
      const transformed = transformRow(row);
      if (pgColumns.size > 0) {
        const filtered: Record<string, any> = {};
        for (const [k, v] of Object.entries(transformed)) {
          if (pgColumns.has(k)) {
            filtered[k] = v;
          }
        }
        return filtered;
      }
      return transformed;
    });

    // Batch insert in chunks of 50
    const chunkSize = 50;
    let tableInserted = 0;

    for (let i = 0; i < transformedRows.length; i += chunkSize) {
      const chunk = transformedRows.slice(i, i + chunkSize);
      
      // Build raw SQL insert query with ON CONFLICT DO NOTHING for idempotency
      const columns = Object.keys(chunk[0]);
      if (columns.length === 0) continue;

      const colList = columns.map(c => `"${c}"`).join(', ');

      const valuePlaceholders: string[] = [];
      const valueParams: any[] = [];

      chunk.forEach((row) => {
        const placeholders = columns.map((col) => {
          valueParams.push(row[col]);
          return `$${valueParams.length}`;
        });
        valuePlaceholders.push(`(${placeholders.join(', ')})`);
      });

      const rawSqlStr = `
        INSERT INTO "${table.name}" (${colList})
        VALUES ${valuePlaceholders.join(', ')}
        ON CONFLICT ("${table.pkey}") DO NOTHING;
      `;

      try {
        await (neonSql as any).query(rawSqlStr, valueParams);
        tableInserted += chunk.length;
      } catch (err: any) {
        console.error(`  ❌ Error inserting batch into ${table.name}:`, err?.message || err);
      }
    }

    console.log(`   └─ Migrated ${tableInserted}/${rawRows.length} rows to Neon.`);
    totalMigrated += tableInserted;
  }

  console.log(`\n🎉 Migration Phase 5 complete! Total records processed: ${totalMigrated}\n`);
}

runMigration().catch(err => {
  console.error('Fatal migration error:', err);
  process.exit(1);
});
