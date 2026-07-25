import type { IDatabase, IPreparedStatement, IDocumentGenerator } from '@bmi/ports';
/**
 * Performance Monitoring and Database Optimization Utilities
 * Provides query performance tracking, batch operations, and monitoring
 *
 * NOTE: executeAdmissionPipelineOptimized now delegates to the unified
 * provisioner so ALL registration paths converge on a single orchestrator.
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
  operation: string = 'unknown',
  method: 'run' | 'all' = 'run'
): Promise<{ result: T; metrics: QueryMetrics }> {
  const startTime = performance.now();
  const timestamp = new Date().toISOString();
  let success = true;
  let error: string | undefined;
  let result: T;
  let rowsAffected: number | undefined;

  try {
    if (method === 'all') {
      type AllResult = { results: T[]; success: boolean; meta?: { changes?: number }; changes?: number };
      const queryResult = await query.all() as unknown as AllResult;
      result = queryResult as unknown as T;
      rowsAffected = queryResult?.changes ?? queryResult?.meta?.changes;
    } else {
      type RunResult = { success: boolean; meta?: { changes?: number }; changes?: number };
      const queryResult = await query.run() as unknown as RunResult;
      result = queryResult as unknown as T;
      rowsAffected = queryResult?.changes ?? queryResult?.meta?.changes;
    }
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

  try {
    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
      const chunk = chunks[chunkIndex];
      try {
        await db.transaction(async (_tx) => {
          for (const stmt of chunk) {
            await stmt.run();
          }
        });
        successfulOperations += chunk.length;
      } catch (e) {
        throw new Error(`Batch execution failed at chunk ${chunkIndex}: ${e instanceof Error ? e.message : String(e)}`, { cause: e });
      }
    }
  } catch (e) {
    console.error('Unexpected batch execution error:', e);
    // Propagate the error rather than returning a "success: false" payload with partial commits
    throw e;
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
  // Use queryOne() (backed by .first()), NOT executeWithMonitoring:
  // executeWithMonitoring calls .run() which discards row data in the D1 adapter.
  return db.queryOne<Record<string, unknown>>(
    'SELECT id, email, password_hash, first_name, last_name, role, is_verified, mfa_secret, mfa_enabled, session_version FROM users WHERE email = ? LIMIT 1',
    [email.toLowerCase()]
  );
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
 * Optimized admission pipeline — delegates to the unified provisioner
 * so ALL registration paths converge on a single orchestrator.
 */
export async function executeAdmissionPipelineOptimized(
  db: IDatabase,
  context: {
    applicationId: string;
    userId: string;
    actorId: string;
    program: string;
  },
  document?: IDocumentGenerator
): Promise<{ uid: string | null; regNo: string | null }> {
  const { applicationId, userId, actorId, program } = context;

  const user = await db.prepare(
    'SELECT first_name, last_name FROM users WHERE id = ?'
  ).bind(userId).first<{ first_name: string; last_name: string }>();

  const { runUnifiedProvisioning } = await import('./unified-provisioner');

  const result = await runUnifiedProvisioning(db, {
    source: 'lifecycle',
    userId,
    firstName: user?.first_name || '',
    lastName: user?.last_name || '',
    programName: program,
    applicationId,
    actorId,
  }, document);

  return { uid: result.uid, regNo: result.regNo };
}

export function getPerformanceReport(): {
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
/**
 * Get current performance metrics
 */
export function getPerformanceMetrics(): ReturnType<typeof getPerformanceReport> {
  return getPerformanceReport();
}

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
  for (const perf of Object.values(metrics.endpointPerformance)) {
    if (perf.avgDuration > RESPONSE_TIME_THRESHOLDS.slow) {
      recommendations.push(`Slow endpoint detected`);
    }
    if (perf.errorRate > 0.1) {
      criticalIssues.push(`High error rate: ${(perf.errorRate * 100).toFixed(1)}%`);
    }
  }

  // Alert analysis
  if (alerts.criticalCount > 0) {
    criticalIssues.push(`${alerts.criticalCount} critical performance alerts in recent period`);
  }

  const slowQueryTypes = metrics.slowQueries
    .reduce((acc: Record<string, number>, q) => {
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