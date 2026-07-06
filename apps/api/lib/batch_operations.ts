/**
 * Batch Operations for High-Performance Database Tasks
 * Optimizes bulk operations and admission pipeline processing
 */

import type { D1Database } from '@cloudflare/workers-types';
import { executeBatch, executeWithMonitoring } from './performance';

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
  db: D1Database,
  request: BulkAdmissionRequest
): Promise<BulkAdmissionResult> {
  const { applicationIds, adminId, batchSize = 10 } = request;
  const startTime = Date.now();
  const results: BulkAdmissionResult['results'] = [];

  // Process in chunks to avoid overwhelming the database
  for (let i = 0; i < applicationIds.length; i += batchSize) {
    const chunk = applicationIds.slice(i, i + batchSize);
    
    // Get application data for the chunk
    const placeholders = chunk.map(() => '?').join(',');
    const appsResult = await executeWithMonitoring(
      db.prepare(`
        SELECT a.id, a.user_id, a.program, u.first_name, u.last_name
        FROM applications a 
        JOIN users u ON a.user_id = u.id 
        WHERE a.id IN (${placeholders}) AND a.status = 'under_review'
      `).bind(...chunk),
      'bulk_admission_get_applications'
    );

    const applications = (appsResult.result as any)?.results || [];

    // Process each application in the chunk
    for (const app of applications) {
      try {
        // Update application status and user role in batch
        const statusOps = [
          db.prepare(
            'UPDATE applications SET status = ?, reviewer_id = ?, reviewed_at = datetime(\'now\') WHERE id = ?'
          ).bind('accepted', adminId, app.id),
          
          db.prepare(
            'UPDATE users SET role = \'student\', updated_at = datetime(\'now\') WHERE id = ?'
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
 */
async function executeSimplifiedAdmissionPipeline(
  db: D1Database,
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

  // Check for existing UID
  const existingPersonResult = await executeWithMonitoring(
    db.prepare('SELECT p.uid FROM users u LEFT JOIN persons p ON u.person_id = p.id WHERE u.id = ?').bind(userId),
    'bulk_admission_check_uid'
  );
  
  let uid = (existingPersonResult.result as any)?.uid;

  // Generate UID if needed
  if (!uid) {
    const { generateUID } = await import('./uid');
    uid = await generateUID(db);
    
    const personId = crypto.randomUUID().replace(/-/g, '');
    const now = new Date().toISOString();

    const personOps = [
      db.prepare(
        'INSERT INTO persons (id, uid, first_name, last_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(personId, uid, firstName, lastName, now, now),
      
      db.prepare(
        'UPDATE users SET person_id = ?, updated_at = ? WHERE id = ?'
      ).bind(personId, now, userId)
    ];

    await executeBatch(db, personOps);
  }

  // Create student record if not exists
  const existingStudentResult = await executeWithMonitoring(
    db.prepare('SELECT user_id FROM students WHERE user_id = ?').bind(userId),
    'bulk_admission_check_student'
  );

  if (!(existingStudentResult.result as any)) {
    const now = new Date().toISOString();
    const placeholderRegNo = `PENDING-${userId.slice(0, 8).toUpperCase()}`;
    
    await executeWithMonitoring(
      db.prepare(
        'INSERT INTO students (user_id, reg_no, admission_date, programme, status, created_at, updated_at) VALUES (?, ?, ?, ?, \'Active\', ?, ?)'
      ).bind(userId, placeholderRegNo, now.split('T')[0], program, now, now),
      'bulk_admission_create_student'
    );
  }

  // Generate registration number
  let regNo: string | null = null;
  try {
    const progResult = await executeWithMonitoring(
      db.prepare('SELECT id, code, level FROM programs WHERE lower(trim(name)) = lower(trim(?)) OR lower(trim(code)) = lower(trim(?)) LIMIT 1')
        .bind(program, program),
      'bulk_admission_find_program'
    );
    
    const progInfo = progResult.result as any;
    if (progInfo) {
      const { generateRegNo } = await import('./reg_number');
      const year = new Date().getUTCFullYear();
      regNo = await generateRegNo(db, progInfo.id, progInfo.code, year, progInfo.level);
      
      await executeWithMonitoring(
        db.prepare('UPDATE students SET reg_no = ?, updated_at = ? WHERE user_id = ?')
          .bind(regNo, new Date().toISOString(), userId),
        'bulk_admission_set_regno'
      );
    }
  } catch (e) {
    console.error('RegNo generation failed in bulk admission:', e);
  }

  // Add lifecycle events in batch
  const lifecycleOps = [
    db.prepare(
      `INSERT OR IGNORE INTO lifecycle_events
       (id, uid, application_id, stage, status, idempotency_key, actor_id, notes)
       VALUES (lower(hex(randomblob(16))), ?, ?, 'application_accepted', 'completed', ?, ?, 'Bulk admission processed')`
    ).bind(uid, applicationId, `${applicationId}:bulk_accepted`, actorId),
    
    db.prepare(
      `INSERT OR IGNORE INTO lifecycle_events
       (id, uid, application_id, stage, status, idempotency_key, actor_id, notes)
       VALUES (lower(hex(randomblob(16))), ?, ?, 'student_active', 'completed', ?, ?, 'Student activated via bulk admission')`
    ).bind(uid, applicationId, `${applicationId}:bulk_active`, actorId)
  ];

  await executeBatch(db, lifecycleOps);

  return { uid, regNo };
}

/**
 * Bulk cleanup of expired records with progress tracking
 */
export async function bulkCleanupExpiredRecords(db: D1Database): Promise<{
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
    {
      table: 'email_verifications',
      condition: 'expires_at < ?',
      params: [now]
    },
    {
      table: 'password_reset_tokens', 
      condition: 'expires_at < ?',
      params: [now]
    },
    {
      table: 'sessions',
      condition: 'expires_at < ?',
      params: [now]
    },
    {
      table: 'rate_limits',
      condition: 'datetime(window_start, \'+1 hour\') < ?',
      params: [now]
    },
    {
      table: 'oauth_accounts',
      condition: 'expires_at IS NOT NULL AND expires_at < ?',
      params: [now]
    }
  ];

  try {
    for (const cleanup of cleanupTables) {
      const result = await executeWithMonitoring(
        db.prepare(`DELETE FROM ${cleanup.table} WHERE ${cleanup.condition}`)
          .bind(...cleanup.params),
        `bulk_cleanup_${cleanup.table}`
      );
      
      const changes = (result.result as any)?.changes || 0;
      totalDeleted += changes;
      tablesProcessed.push(`${cleanup.table}(${changes})`);
    }

    return {
      success: true,
      recordsDeleted: totalDeleted,
      tablesProcessed,
      duration: Date.now() - startTime
    };
  } catch (e) {
    console.error('Bulk cleanup failed:', e);
    return {
      success: false,
      recordsDeleted: totalDeleted,
      tablesProcessed,
      duration: Date.now() - startTime
    };
  }
}

/**
 * Optimize database indexes and analyze performance
 */
export async function optimizeDatabaseIndexes(db: D1Database): Promise<{
  success: boolean;
  indexesAnalyzed: number;
  recommendations: string[];
  duration: number;
}> {
  const startTime = Date.now();
  const recommendations: string[] = [];

  try {
    // Get current indexes
    const indexesResult = await executeWithMonitoring(
      db.prepare('SELECT name, tbl_name FROM sqlite_master WHERE type = \'index\' AND name NOT LIKE \'sqlite_%\''),
      'analyze_database_indexes'
    );
    
    const indexes = (indexesResult.result as any)?.results || [];

    // Run SQLite's built-in optimization
    await executeWithMonitoring(
      db.prepare('PRAGMA optimize'),
      'pragma_optimize'
    );

    // Analyze table statistics
    const tablesResult = await executeWithMonitoring(
      db.prepare('SELECT name FROM sqlite_master WHERE type = \'table\' AND name NOT LIKE \'sqlite_%\''),
      'get_table_names'
    );
    
    const tables = (tablesResult.result as any)?.results || [];

    // Check for tables that might need indexes
    const largeTableChecks = await Promise.all(
      tables.slice(0, 10).map(async (table: any) => {
        try {
          const countResult = await db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).first();
          return { table: table.name, count: (countResult as any)?.count || 0 };
        } catch {
          return { table: table.name, count: 0 };
        }
      })
    );

    // Generate recommendations
    for (const tableInfo of largeTableChecks) {
      if (tableInfo.count > 10000) {
        const tableIndexes = indexes.filter((idx: any) => idx.tbl_name === tableInfo.table);
        if (tableIndexes.length < 3) {
          recommendations.push(`Consider adding more indexes to ${tableInfo.table} (${tableInfo.count} rows, ${tableIndexes.length} indexes)`);
        }
      }
    }

    if (indexes.length < 20) {
      recommendations.push('Database has relatively few indexes - monitor query performance for optimization opportunities');
    }

    return {
      success: true,
      indexesAnalyzed: indexes.length,
      recommendations,
      duration: Date.now() - startTime
    };
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