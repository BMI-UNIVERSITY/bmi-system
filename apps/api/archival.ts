import type { Env } from './lib/types';

const RETENTION_RULES = [
  { table: 'admin_audit_logs', dateCol: 'created_at', days: 90 },
  { table: 'sync_event_log', dateCol: 'created_at', days: 30 },
  { table: 'lifecycle_events', dateCol: 'created_at', days: 365 },
  { table: 'provisioning_jobs', dateCol: 'created_at', days: 30 },
  { table: 'webhook_dead_letters', dateCol: 'created_at', days: 90 },
  { table: 'documents', dateCol: 'uploaded_at', days: 1825 }, // 5 years
];

export async function runArchivalJob(env: Env) {
  const now = new Date();
  
  for (const rule of RETENTION_RULES) {
    // Calculate cutoff date
    const cutoffDate = new Date(now.getTime() - rule.days * 24 * 60 * 60 * 1000);
    const cutoffIso = cutoffDate.toISOString();
    
    try {
      // 1. Fetch old rows in batches to avoid D1 limits
      const { results } = await env.PLATFORM_CONTEXT!.db.prepare(
        `SELECT * FROM ${rule.table} WHERE ${rule.dateCol} < ? LIMIT 1000`
      ).bind(cutoffIso).all();
      
      if (!results || results.length === 0) continue;
      
      // 2. Export to R2 as JSONL
      const filename = `archives/${rule.table}/${now.toISOString().replace(/[:.]/g, '-')}.jsonl`;
      const jsonl = results.map(row => JSON.stringify(row)).join('\n');
      
      await env.BACKUP_BUCKET.put(filename, jsonl, {
        customMetadata: { table: rule.table, archivedAt: now.toISOString() }
      });
      
      // CRITICAL: Verify the upload exists before deleting
      const head = await env.BACKUP_BUCKET.head(filename);
      if (!head) {
        throw new Error(`Upload verification failed for ${filename} - aborting delete`);
      }

      if ((env as unknown as { DRY_RUN?: string }).DRY_RUN === 'true') {
        console.log(`[DRY_RUN] Exported ${results.length} rows to ${filename}. Skipping D1 delete.`);
        continue;
      }

      // 3. Handle document files from R2 if it's the documents table
      if (rule.table === 'documents') {
        const r2Keys = (results as Array<Record<string, unknown>>).map(r => r.r2_key as string);
        await Promise.all(r2Keys.map(key => env.PLATFORM_CONTEXT!.storage.delete(key)));
      }

      // 4. Purge from D1 using fetched IDs
      const ids = (results as Array<Record<string, unknown>>).map(r => r.id as string);
      
      // Use transaction for atomic deletes
      await env.PLATFORM_CONTEXT!.db.transaction(async (tx) => {
        for (const id of ids) {
          await tx.prepare(`DELETE FROM ${rule.table} WHERE id = ?`).bind(id).run();
        }
      });
      
    } catch (e) {
      console.error(`Error processing archival for ${rule.table}:`, e);
    }
  }

  // Phase 4: Backup Rotation (clean files older than 1 year)
  await rotateOldBackups(env);
}

async function rotateOldBackups(env: Env) {
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  let cursor: string | undefined = undefined;
  do {
    const list = await env.BACKUP_BUCKET.list({ cursor });
    const oldKeys = list.objects
      .filter(obj => new Date(obj.uploaded) < oneYearAgo)
      .map(obj => obj.key);
      
    if (oldKeys.length > 0) {
      if ((env as unknown as { DRY_RUN?: string }).DRY_RUN === 'true') {
        console.log(`[DRY_RUN] Would delete ${oldKeys.length} old backups`);
      } else {
        await Promise.all(oldKeys.map(key => env.BACKUP_BUCKET.delete(key)));
      }
    }
    cursor = list.truncated ? list.cursor : undefined;
  } while (cursor);
}
