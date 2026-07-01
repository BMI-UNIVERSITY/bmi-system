/**
 * BMI UMS — Retention Archival Job
 * ─────────────────────────────────────────────────────────────────────────────
 * Exports rows older than the retention window from unbounded audit tables
 * to R2 (as JSONL), then purges them from D1 to prevent 5GB storage exhaustion.
 *
 * Targeted tables:
 *   - admin_audit_logs (90 days)
 *   - sync_event_log (30 days)
 *   - lifecycle_events (365 days)
 *   - provisioning_jobs (30 days)
 *   - webhook_dead_letters (90 days)
 *
 * Designed to be run daily via a Cloudflare Cron Trigger or GitHub Actions.
 *
 * Usage:
 *   npx tsx scripts/archival_job.ts
 */

import { D1Database } from '@cloudflare/workers-types';
import fs from 'fs';
import path from 'path';

// Mock types for local dev script
type MockEnv = {
  DB: D1Database;
};

const RETENTION_RULES = [
  { table: 'admin_audit_logs', dateCol: 'timestamp', days: 90 },
  { table: 'sync_event_log', dateCol: 'created_at', days: 30 },
  { table: 'lifecycle_events', dateCol: 'created_at', days: 365 },
  { table: 'provisioning_jobs', dateCol: 'created_at', days: 30 },
  { table: 'webhook_dead_letters', dateCol: 'created_at', days: 90 },
];

export async function runArchivalJob(env: MockEnv) {
  console.log(`\n🧹 Starting Retention Archival Job...`);
  
  const now = new Date();
  
  for (const rule of RETENTION_RULES) {
    console.log(`\nProcessing table: ${rule.table} (Retention: ${rule.days} days)`);
    
    // Calculate cutoff date
    const cutoffDate = new Date(now.getTime() - rule.days * 24 * 60 * 60 * 1000);
    const cutoffIso = cutoffDate.toISOString();
    
    console.log(`Cutoff date: ${cutoffIso}`);
    
    try {
      // 1. Fetch old rows
      // Note: we fetch and delete in batches of 1000 to avoid D1 limits
      const { results } = await env.DB.prepare(
        `SELECT * FROM ${rule.table} WHERE ${rule.dateCol} < ? LIMIT 1000`
      ).bind(cutoffIso).all();
      
      if (!results || results.length === 0) {
        console.log(`✅ No old rows to archive.`);
        continue;
      }
      
      console.log(`Found ${results.length} rows to archive.`);
      
      // 2. Export to "R2" (simulated as local files in this script for dev)
      const archiveDir = path.join(process.cwd(), 'archives');
      if (!fs.existsSync(archiveDir)) fs.mkdirSync(archiveDir);
      
      const filename = `${rule.table}_${now.toISOString().replace(/[:.]/g, '-')}.jsonl`;
      const filepath = path.join(archiveDir, filename);
      
      const jsonl = results.map(row => JSON.stringify(row)).join('\n');
      fs.writeFileSync(filepath, jsonl);
      console.log(`💾 Exported to ${filepath}`);
      
      // 3. Purge from D1 using the fetched IDs
      // Using batch operation for atomic delete
      const ids = results.map((r: any) => r.id);
      
      // D1 doesn't support 'WHERE id IN (?)' with arrays nicely, so we use batch prepared statements
      const batchOps = ids.map(id => 
        env.DB.prepare(`DELETE FROM ${rule.table} WHERE id = ?`).bind(id)
      );
      
      await env.DB.batch(batchOps);
      console.log(`🗑️  Purged ${ids.length} rows from D1.`);
      
    } catch (e) {
      console.error(`❌ Error processing ${rule.table}:`, e);
    }
  }
  
  console.log(`\n✨ Archival job completed.`);
}

// If run directly via CLI (mocking env for testing)
if (require.main === module) {
  console.log('⚠️ Running in local dev mode. Skipping real DB execution.');
  console.log('Deploy this as a Scheduled Worker (Cron) or run via wrangler d1 execute in production.');
}
