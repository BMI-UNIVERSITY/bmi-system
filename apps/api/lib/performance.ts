import type { IDatabase, IPreparedStatement } from '@bmi/ports';
/**
 * Performance Monitoring and Database Optimization Utilities
 * Provides query performance tracking, batch operations, and monitoring
 */



export interface QueryMetrics {
  query: string;
  duration: number;
  timestamp: string;
  success: boolean;
  error?: string;
  rowsAffected?: number;
}

export interface ResponseTimeMetrics {
  endpoint: string;
  method: string;
  duration: number;
  timestamp: string;
  status: number;
  userAgent?: string;
  ip?: string;
}

export interface BatchOperationResult {
  success: boolean;
  totalOperations: number;
  successfulOperations: number;
  failures: Array<{ index: number; error: string }>;
  totalDuration: number;
}

export interface PerformanceAlert {
  type: 'slow_endpoint' | 'high_error_rate' | 'db_performance' | 'rate_limit_breach';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

// In-memory performance metrics storage (for this Worker instance)
const performanceMetrics: QueryMetrics[] = [];
const responseTimeMetrics: ResponseTimeMetrics[] = [];
const performanceAlerts: PerformanceAlert[] = [];
const MAX_METRICS_STORED = 1000;
const MAX_RESPONSE_METRICS_STORED = 500;
const MAX_ALERTS_STORED = 100;

// Response time thresholds
const RESPONSE_TIME_THRESHOLDS = {
  fast: 200,    // < 200ms - excellent
  good: 500,    // < 500ms - good
  slow: 1000,   // < 1000ms - acceptable
  critical: 2000 // > 2000ms - critical
};

/**
 * Wraps a D1 query with performance monitoring
 */
export async function executeWithMonitoring<T = unknown>(
  query: IPreparedStatement,
  operation: string = 'unknown'
): Promise<{ result: T; metrics: QueryMetrics }> {
  const startTime = performance.now();
  const timestamp = new Date().toISOString();
  let success = true;
  let error: string | undefined;
  let result: T;
  let rowsAffected: number | undefined;

  try {
    type RunResult = { success: boolean; meta?: { changes?: number }; changes?: number };
    const queryResult = await query.run() as unknown as RunResult;
    result = queryResult as unknown as T;
    rowsAffected = queryResult?.changes ?? queryResult?.meta?.changes;
  } catch (e) {
    success = false;
    error = e instanceof Error ? e.message : String(e);
    throw e;
  } finally {
    const duration = performance.now() - startTime;
    const metrics: QueryMetrics = {
      query: operation,
      duration,
      timestamp,
      success,
      error,
      rowsAffected
    };

    // Store metrics (with circular buffer)
    performanceMetrics.push(metrics);
    if (performanceMetrics.length > MAX_METRICS_STORED) {
      performanceMetrics.shift();
    }

    // Generate alerts for slow queries
    if (duration > 1000) {
      addPerformanceAlert({
        type: 'db_performance',
        severity: duration > 3000 ? 'critical' : 'high',
        message: `Slow database query detected: ${operation} took ${duration.toFixed(2)}ms`,
        timestamp,
        metadata: { operation, duration, success }
      });
    }
  }

  return { result, metrics: performanceMetrics[performanceMetrics.length - 1] };
}

/**
 * Track API endpoint response times
 */
export function trackResponseTime(
  endpoint: string,
  method: string,
  duration: number,
  status: number,
  request?: Request
): void {
  const timestamp = new Date().toISOString();
  
  const metric: ResponseTimeMetrics = {
    endpoint,
    method,
    duration,
    timestamp,
    status,
    userAgent: request?.headers.get('User-Agent') || undefined,
    ip: request?.headers.get('CF-Connecting-IP') || undefined
  };

  responseTimeMetrics.push(metric);
  if (responseTimeMetrics.length > MAX_RESPONSE_METRICS_STORED) {
    responseTimeMetrics.shift();
  }

  // Generate performance alerts based on response times
  let severity: PerformanceAlert['severity'] = 'low';
  if (duration > RESPONSE_TIME_THRESHOLDS.critical) {
    severity = 'critical';
  } else if (duration > RESPONSE_TIME_THRESHOLDS.slow) {
    severity = 'high';
  } else if (duration > RESPONSE_TIME_THRESHOLDS.good) {
    severity = 'medium';
  }

  if (severity !== 'low') {
    addPerformanceAlert({
      type: 'slow_endpoint',
      severity,
      message: `Slow endpoint detected: ${method} ${endpoint} took ${duration.toFixed(2)}ms`,
      timestamp,
      metadata: { endpoint, method, duration, status }
    });
  }

  // Track error rates
  if (status >= 500) {
    addPerformanceAlert({
      type: 'high_error_rate',
      severity: 'high',
      message: `Server error detected: ${method} ${endpoint} returned ${status}`,
      timestamp,
      metadata: { endpoint, method, status, duration }
    });
  }
}

/**
 * Add a performance alert
 */
function addPerformanceAlert(alert: PerformanceAlert): void {
  performanceAlerts.push(alert);
  if (performanceAlerts.length > MAX_ALERTS_STORED) {
    performanceAlerts.shift();
  }
  
  // Log critical alerts immediately
  if (alert.severity === 'critical') {
    console.error(`[CRITICAL ALERT] ${alert.message}`, alert.metadata);
  }
}

/**
 * Execute multiple operations in an optimized batch
 * Provides better performance than sequential operations
 */
export async function executeBatch(
  db: IDatabase,
  operations: IPreparedStatement[],
  maxBatchSize: number = 25
): Promise<BatchOperationResult> {
  const startTime = performance.now();
  const failures: Array<{ index: number; error: string }> = [];
  let successfulOperations = 0;

  // Split operations into chunks to respect D1 batch size limits
  const chunks: IPreparedStatement[][] = [];
  for (let i = 0; i < operations.length; i += maxBatchSize) {
    chunks.push(operations.slice(i, i + maxBatchSize));
  }

  // Process operations sequentially within transactions for portability
  try {
    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
      const chunk = chunks[chunkIndex];
      try {
        await db.transaction(async (tx) => {
          for (const stmt of chunk) {
            await stmt.run();
          }
        });
        successfulOperations += chunk.length;
      } catch {
        // If transaction fails, try operations individually to identify failures
        for (let opIndex = 0; opIndex < chunk.length; opIndex++) {
          const globalIndex = chunkIndex * maxBatchSize + opIndex;
          try {
            await chunk[opIndex].run();
            successfulOperations++;
          } catch (opError) {
            failures.push({
              index: globalIndex,
              error: opError instanceof Error ? opError.message : String(opError)
            });
          }
        }
      }
    }
  } catch (e) {
    console.error('Unexpected batch execution error:', e);
  }

  const totalDuration = performance.now() - startTime;

  return {
    success: failures.length === 0,
    totalOperations: operations.length,
    successfulOperations,
    failures,
    totalDuration
  };
}

/**
 * Optimized user lookup with caching-friendly query patterns
 */
export async function findUserByEmail(db: IDatabase, email: string): Promise<Record<string, unknown> | null> {
  const { result } = await executeWithMonitoring(
    db.prepare('SELECT id, email, password_hash, first_name, last_name, role, is_verified, mfa_secret, mfa_enabled, session_version FROM users WHERE email = ? LIMIT 1')
      .bind(email.toLowerCase()),
    'user_lookup_by_email'
  );
  return result;
}

/**
 * Optimized application submission with batch operations
 */
export async function createApplicationWithDependencies(
  db: IDatabase,
  applicationData: {
    appId: string;
    userId: string;
    program: string;
    degreeLevel: string;
    personalStatement?: string;
    priorEducation?: string;
  }
): Promise<string> {
  const { appId, userId, program, degreeLevel, personalStatement, priorEducation } = applicationData;
  
  const operations = [
    // Main application record
    db.prepare(
      `INSERT INTO applications (id, user_id, program, degree_level, status, personal_statement, prior_education, submitted_at)
       VALUES (?, ?, ?, ?, 'submitted', ?, ?, datetime('now'))`
    ).bind(appId, userId, program, degreeLevel, personalStatement, priorEducation),
    
    // Initial status log
    db.prepare(
      `INSERT INTO application_status_logs (id, application_id, changed_by, old_status, new_status, notes)
       VALUES (?, ?, ?, NULL, 'submitted', 'Initial submission')`
    ).bind(crypto.randomUUID(), appId, userId)
  ];

  const result = await executeBatch(db, operations);
  
  if (!result.success) {
    throw new Error(`Application creation failed: ${result.failures.map(f => f.error).join(', ')}`);
  }

  return appId;
}

/**
 * Optimized admission pipeline with parallel operations where possible
 */
export async function executeAdmissionPipelineOptimized(
  db: IDatabase,
  context: {
    applicationId: string;
    userId: string;
    actorId: string;
    program: string;
  }
): Promise<{ uid: string | null; regNo: string | null }> {
  const { applicationId, userId, actorId, program } = context;

  // Step 1: Parallel data gathering (no dependencies)
  type UserRow = { first_name: string; last_name: string; person_id: string | null };
  type PersonRow = { uid: string };
  const [user, existingPerson] = await Promise.all([
    db.prepare('SELECT first_name, last_name, person_id FROM users WHERE id = ?').bind(userId).first<UserRow>(),
    db.prepare('SELECT p.uid FROM users u LEFT JOIN persons p ON u.person_id = p.id WHERE u.id = ?').bind(userId).first<PersonRow>()
  ]);

  let uid = existingPerson?.uid;

  // Step 2: UID generation (only if needed)
  if (!uid) {
    const { generateUID } = await import('./uid');
    uid = await generateUID(db);
    
    const personId = crypto.randomUUID().replace(/-/g, '');
    const now = new Date().toISOString();

    const personOps = [
      db.prepare(
        `INSERT INTO persons (id, uid, first_name, last_name, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).bind(personId, uid, user?.first_name ?? '', user?.last_name ?? '', now, now),
      
      db.prepare(
        `UPDATE users SET person_id = ?, updated_at = ? WHERE id = ?`
      ).bind(personId, now, userId)
    ];

    await executeBatch(db, personOps);
  }

  // Step 3: Create student record and lifecycle events in parallel
  const studentOps = [];
  
  // Check if student record exists
  const existingStudent = await db.prepare('SELECT user_id FROM students WHERE user_id = ?').bind(userId).first();
  
  if (!existingStudent) {
    const now = new Date().toISOString();
    const placeholderRegNo = `PENDING-${userId.slice(0, 8).toUpperCase()}`;
    
    studentOps.push(
      db.prepare(
        `INSERT INTO students (user_id, reg_no, admission_date, programme, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'Active', ?, ?)`
      ).bind(userId, placeholderRegNo, now.split('T')[0], program, now, now)
    );
  }

  // Add lifecycle events
  const lifecycleOps = [
    db.prepare(
      `INSERT OR IGNORE INTO lifecycle_events
       (id, uid, application_id, stage, status, idempotency_key, actor_id, notes)
       VALUES (lower(hex(randomblob(16))), ?, ?, 'application_accepted', 'completed', ?, ?, 'Application accepted')`
    ).bind(uid, applicationId, `${applicationId}:application_accepted`, actorId),
    
    db.prepare(
      `INSERT OR IGNORE INTO lifecycle_events
       (id, uid, application_id, stage, status, idempotency_key, actor_id, notes)
       VALUES (lower(hex(randomblob(16))), ?, ?, 'student_record_created', 'completed', ?, ?, 'Student record created')`
    ).bind(uid, applicationId, `${applicationId}:student_record_created`, actorId)
  ];

  const allOps = [...studentOps, ...lifecycleOps];
  await executeBatch(db, allOps);

  // Step 4: Generate registration number (sequential due to counter dependency)
  let regNo: string | null = null;
  try {
    const { generateRegNo } = await import('./reg_number');
    
    // Try to match programme for RegNo generation
    const progInfo = await db.prepare(
      `SELECT id, code, level FROM programs WHERE lower(trim(name)) = lower(trim(?)) OR lower(trim(code)) = lower(trim(?)) LIMIT 1`
    ).bind(program, program).first<{ id: string; code: string; level: string }>();

    if (progInfo) {
      const year = new Date().getUTCFullYear();
      regNo = await generateRegNo(db, progInfo.id, progInfo.code, year, progInfo.level);
      
      const updateOps = [
        db.prepare('UPDATE students SET reg_no = ?, updated_at = ? WHERE user_id = ?')
          .bind(regNo, new Date().toISOString(), userId),
        
        db.prepare(
          `INSERT OR IGNORE INTO lifecycle_events
           (id, uid, application_id, stage, status, idempotency_key, actor_id, notes)
           VALUES (lower(hex(randomblob(16))), ?, ?, 'registration_number_generated', 'completed', ?, ?, ?)`
        ).bind(uid, applicationId, `${applicationId}:registration_number_generated`, actorId, `Registration number: ${regNo}`)
      ];
      
      await executeBatch(db, updateOps);
    }
  } catch (e) {
    console.error('RegNo generation failed:', e);
  }

  return { uid, regNo };
}

/**
 * Get performance metrics for monitoring
 */
export function getPerformanceMetrics(): {
  recentQueries: QueryMetrics[];
  averageQueryTime: number;
  slowQueries: QueryMetrics[];
  errorRate: number;
  responseTimeMetrics: ResponseTimeMetrics[];
  averageResponseTime: number;
  endpointPerformance: Record<string, { count: number; avgDuration: number; errorRate: number }>;
} {
  const recent = performanceMetrics.slice(-100);
  const slowQueries = performanceMetrics.filter(m => m.duration > 100).slice(-20);
  
  const avgQueryTime = recent.length > 0 
    ? recent.reduce((sum, m) => sum + m.duration, 0) / recent.length 
    : 0;
    
  const queryErrors = recent.filter(m => !m.success).length;
  const queryErrorRate = recent.length > 0 ? queryErrors / recent.length : 0;

  // Response time analysis
  const recentResponses = responseTimeMetrics.slice(-100);
  const avgResponseTime = recentResponses.length > 0
    ? recentResponses.reduce((sum, m) => sum + m.duration, 0) / recentResponses.length
    : 0;

  // Endpoint performance breakdown
  const endpointPerformance: Record<string, { count: number; avgDuration: number; errorRate: number }> = {};
  
  recentResponses.forEach(metric => {
    const key = `${metric.method} ${metric.endpoint}`;
    if (!endpointPerformance[key]) {
      endpointPerformance[key] = { count: 0, avgDuration: 0, errorRate: 0 };
    }
    
    const current = endpointPerformance[key];
    const newCount = current.count + 1;
    current.avgDuration = (current.avgDuration * current.count + metric.duration) / newCount;
    current.errorRate = metric.status >= 400 ? (current.errorRate * current.count + 1) / newCount : current.errorRate * current.count / newCount;
    current.count = newCount;
  });

  return {
    recentQueries: recent,
    averageQueryTime: avgQueryTime,
    slowQueries,
    errorRate: queryErrorRate,
    responseTimeMetrics: recentResponses,
    averageResponseTime: avgResponseTime,
    endpointPerformance
  };
}

/**
 * Get performance alerts
 */
export function getPerformanceAlerts(): {
  alerts: PerformanceAlert[];
  criticalCount: number;
  highCount: number;
  mediumCount: number;
} {
  const recent = performanceAlerts.slice(-50);
  
  return {
    alerts: recent,
    criticalCount: recent.filter(a => a.severity === 'critical').length,
    highCount: recent.filter(a => a.severity === 'high').length,
    mediumCount: recent.filter(a => a.severity === 'medium').length
  };
}

/**
 * Clear expired tokens and sessions (maintenance operation)
 */
export async function cleanupExpiredData(db: IDatabase): Promise<BatchOperationResult> {
  const now = new Date().toISOString();
  
  const cleanupOps = [
    db.prepare(`DELETE FROM email_verifications WHERE expires_at < ?`).bind(now),
    db.prepare(`DELETE FROM password_reset_tokens WHERE expires_at < ?`).bind(now),
    db.prepare(`DELETE FROM sessions WHERE expires_at < ?`).bind(now),
    db.prepare(`DELETE FROM rate_limits WHERE datetime(window_start, '+1 hour') < ?`).bind(now),
    db.prepare(`DELETE FROM oauth_accounts WHERE expires_at IS NOT NULL AND expires_at < ?`).bind(now)
  ];

  return executeBatch(db, cleanupOps);
}

/**
 * Analyze query performance and identify bottlenecks
 */
export function analyzePerformance(): {
  summary: string;
  recommendations: string[];
  criticalIssues: string[];
} {
  const metrics = getPerformanceMetrics();
  const alerts = getPerformanceAlerts();
  const recommendations: string[] = [];
  const criticalIssues: string[] = [];

  // Query performance analysis
  if (metrics.averageQueryTime > 50) {
    recommendations.push('Average query time is high - consider adding more indexes');
  }

  if (metrics.errorRate > 0.05) {
    criticalIssues.push(`High query error rate detected: ${(metrics.errorRate * 100).toFixed(1)}%`);
  }

  // Response time analysis
  if (metrics.averageResponseTime > RESPONSE_TIME_THRESHOLDS.good) {
    recommendations.push(`High average response time: ${metrics.averageResponseTime.toFixed(2)}ms`);
  }

  // Endpoint-specific analysis
  Object.entries(metrics.endpointPerformance).forEach(([endpoint, perf]) => {
    if (perf.avgDuration > RESPONSE_TIME_THRESHOLDS.slow) {
      recommendations.push(`Slow endpoint detected: ${endpoint} (${perf.avgDuration.toFixed(2)}ms avg)`);
    }
    if (perf.errorRate > 0.1) {
      criticalIssues.push(`High error rate for ${endpoint}: ${(perf.errorRate * 100).toFixed(1)}%`);
    }
  });

  // Alert analysis
  if (alerts.criticalCount > 0) {
    criticalIssues.push(`${alerts.criticalCount} critical performance alerts in recent period`);
  }

  const slowQueryTypes = metrics.slowQueries
    .reduce((acc, q) => {
      acc[q.query] = (acc[q.query] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

  if (Object.keys(slowQueryTypes).length > 0) {
    recommendations.push(`Slow query patterns detected: ${Object.keys(slowQueryTypes).join(', ')}`);
  }

  const summary = `Avg query: ${metrics.averageQueryTime.toFixed(2)}ms, Avg response: ${metrics.averageResponseTime.toFixed(2)}ms, Query errors: ${(metrics.errorRate * 100).toFixed(1)}%, Alerts: ${alerts.criticalCount}C/${alerts.highCount}H/${alerts.mediumCount}M`;

  return {
    summary,
    recommendations,
    criticalIssues
  };
}