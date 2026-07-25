import type { IDatabase } from '@bmi/ports';
/**
 * Batch Operations for High-Performance Database Tasks
 * Optimizes bulk operations and admission pipeline processing
 */


import { executeBatch } from './performance';

export interface BulkAdmissionRequest {
  applicationIds: string[];
  adminId: string;
  batchSize?: number;
}

export interface BulkAdmissionResult {
  total: number;
  successful: number;
  failed: number;
  results: Array<{
    applicationId: string;
    success: boolean;
    uid?: string;
    regNo?: string;
    error?: string;
  }>;
  duration: number;
}

/**
 * Process multiple admissions in optimized batches
 */
export async function processBulkAdmissions(
  db: IDatabase,
  request: BulkAdmissionRequest
): Promise<BulkAdmissionResult> {
  const { applicationIds, adminId, batchSize = 10 } = request;
  const startTime = Date.now();
  const results: BulkAdmissionResult['results'] = [];

  // Process in chunks to avoid overwhelming the database
  for (let i = 0; i < applicationIds.length; i += batchSize) {
    const chunk = applicationIds.slice(i, i + batchSize);

    // Get application data for the chunk.
    // NOTE: Must use db.query() here, NOT executeWithMonitoring():
    // executeWithMonitoring calls .run() which discards .results in the D1 adapter.
    const placeholders = chunk.map(() => '?').join(',');
    type AppRow = { id: string; user_id: string; program: string; first_name: string; last_name: string };
    const applications = await db.query<AppRow>(
      `SELECT a.id, a.user_id, a.program, u.first_name, u.last_name
       FROM applications a
       JOIN users u ON a.user_id = u.id
       WHERE a.id IN (${placeholders}) AND a.status = 'under_review'`,
      chunk
    );

    // Process each application in the chunk
    for (const app of applications) {
      try {
        // Update application status and user role in batch
        const statusOps = [
          db.prepare(
            "UPDATE applications SET status = ?, reviewer_id = ?, reviewed_at = datetime('now') WHERE id = ?"
          ).bind('accepted', adminId, app.id),

          db.prepare(
            "UPDATE users SET role = 'student', updated_at = datetime('now') WHERE id = ?"
          ).bind(app.user_id),

          db.prepare(
            `INSERT INTO application_status_logs (id, application_id, changed_by, old_status, new_status, notes)
             VALUES (?, ?, ?, 'under_review', 'accepted', 'Bulk admission processed')`
          ).bind(crypto.randomUUID(), app.id, adminId)
        ];

        const batchResult = await executeBatch(db, statusOps);

        if (batchResult.success) {
          // Run simplified admission pipeline
          const { uid, regNo } = await executeSimplifiedAdmissionPipeline(db, {
            applicationId: app.id,
            userId: app.user_id,
            actorId: adminId,
            program: app.program,
            firstName: app.first_name,
            lastName: app.last_name
          });

          results.push({
            applicationId: app.id,
            success: true,
            uid: uid ?? undefined,
            regNo: regNo ?? undefined
          });
        } else {
          results.push({
            applicationId: app.id,
            success: false,
            error: `Batch operation failed: ${batchResult.failures.map(f => f.error).join(', ')}`
          });
        }
      } catch (e) {
        results.push({
          applicationId: app.id,
          success: false,
          error: e instanceof Error ? e.message : String(e)
        });
      }
    }
  }

  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  return {
    total: applicationIds.length,
    successful,
    failed,
    results,
    duration: Date.now() - startTime
  };
}

/**
 * Simplified admission pipeline optimized for bulk processing
 * Delegates to the unified provisioner for consistency.
 */
async function executeSimplifiedAdmissionPipeline(
  db: IDatabase,
  context: {
    applicationId: string;
    userId: string;
    actorId: string;
    program: string;
    firstName: string;
    lastName: string;
  }
): Promise<{ uid: string | null; regNo: string | null }> {
  const { applicationId, userId, actorId, program, firstName, lastName } = context;

  const { runUnifiedProvisioning } = await import('./unified-provisioner');

  const result = await runUnifiedProvisioning(db, {
    source: 'batch',
    userId,
    firstName,
    lastName,
    programName: program,
    applicationId,
    actorId,
  });

  return { uid: result.uid, regNo: result.regNo };
}

/**
 * Bulk cleanup of expired records with progress tracking
 */
export async function bulkCleanupExpiredRecords(db: IDatabase): Promise<{
  success: boolean;
  recordsDeleted: number;
  tablesProcessed: string[];
  duration: number;
}> {
  const startTime = Date.now();
  const now = new Date().toISOString();
  let totalDeleted = 0;
  const tablesProcessed: string[] = [];

  const cleanupTables = [
    { table: 'email_verifications',  condition: 'expires_at < ?',                              params: [now] },
    { table: 'password_reset_tokens', condition: 'expires_at < ?',                             params: [now] },
    { table: 'sessions',             condition: 'expires_at < ?',                              params: [now] },
    { table: 'rate_limits',          condition: "datetime(window_start, '+1 hour') < ?",       params: [now] },
    { table: 'oauth_accounts',       condition: 'expires_at IS NOT NULL AND expires_at < ?',   params: [now] }
  ];

  try {
    for (const cleanup of cleanupTables) {
      // DELETE is a write — .run() is correct here; it returns {success, meta:{changes}}.
      const result = await db.prepare(`DELETE FROM ${cleanup.table} WHERE ${cleanup.condition}`)
        .bind(...cleanup.params)
        .run();
      const changes = (result as unknown as { meta?: { changes?: number }; changes?: number })?.meta?.changes
        ?? (result as unknown as { changes?: number })?.changes
        ?? 0;
      totalDeleted += changes;
      tablesProcessed.push(`${cleanup.table}(${changes})`);
    }

    return { success: true, recordsDeleted: totalDeleted, tablesProcessed, duration: Date.now() - startTime };
  } catch (e) {
    console.error('Bulk cleanup failed:', e);
    return { success: false, recordsDeleted: totalDeleted, tablesProcessed, duration: Date.now() - startTime };
  }
}

/**
 * Optimize database indexes and analyze performance
 */
export async function optimizeDatabaseIndexes(db: IDatabase): Promise<{
  success: boolean;
  indexesAnalyzed: number;
  recommendations: string[];
  duration: number;
}> {
  const startTime = Date.now();
  const recommendations: string[] = [];

  try {
    // Get current indexes.
    // Must use db.query() not executeWithMonitoring():
    // executeWithMonitoring calls .run() which discards .results in the D1 adapter.
    type IndexRow = { name: string; tbl_name: string };
    type TableRow = { name: string };
    const indexes = await db.query<IndexRow>(
      "SELECT name, tbl_name FROM sqlite_master WHERE type = 'index' AND name NOT LIKE 'sqlite_%'"
    );

    // Run SQLite's built-in optimization (write-side command — .run() is correct)
    await db.prepare('PRAGMA optimize').run();

    // Analyze table statistics
    const tables = await db.query<TableRow>(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'"
    );

    // Check for tables that might need indexes
    const largeTableChecks = await Promise.all(
      tables.slice(0, 10).map(async (table: TableRow) => {
        try {
          const countResult = await db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).first<{ count: number }>();
          return { table: table.name, count: countResult?.count ?? 0 };
        } catch {
          return { table: table.name, count: 0 };
        }
      })
    );

    // Generate recommendations
    for (const tableInfo of largeTableChecks) {
      if (tableInfo.count > 10000) {
        const tableIndexes = indexes.filter((idx: IndexRow) => idx.tbl_name === tableInfo.table);
        if (tableIndexes.length < 3) {
          recommendations.push(`Consider adding more indexes to ${tableInfo.table} (${tableInfo.count} rows, ${tableIndexes.length} indexes)`);
        }
      }
    }

    if (indexes.length < 20) {
      recommendations.push('Database has relatively few indexes - monitor query performance for optimization opportunities');
    }

    return { success: true, indexesAnalyzed: indexes.length, recommendations, duration: Date.now() - startTime };
  } catch (e) {
    console.error('Database optimization failed:', e);
    return {
      success: false,
      indexesAnalyzed: 0,
      recommendations: [`Optimization failed: ${e instanceof Error ? e.message : String(e)}`],
      duration: Date.now() - startTime
    };
  }
}