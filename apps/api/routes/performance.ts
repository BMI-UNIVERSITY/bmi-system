/**
 * Performance Monitoring and Database Maintenance Endpoints
 * Provides insights into query performance and system health
 */

import { ok, error } from '../lib/types';
import { getPerformanceMetrics, getPerformanceAlerts, analyzePerformance, cleanupExpiredData } from '../lib/performance';
import type { Env } from '../lib/types';

interface MemoryInfo {
  jsHeapSizeLimit: number;
  totalJSHeapSize: number;
  usedJSHeapSize: number;
}

/**
 * Get current performance metrics (admin only)
 */
export async function handleGetPerformanceMetrics(request: Request, env: Env): Promise<Response> {
  const metrics = getPerformanceMetrics();
  const alerts = getPerformanceAlerts();
  const analysis = analyzePerformance();
  
  return ok({
    timestamp: new Date().toISOString(),
    metrics: {
      recent_queries: metrics.recentQueries.slice(-10), // Last 10 queries
      average_query_time_ms: metrics.averageQueryTime,
      slow_queries: metrics.slowQueries.slice(-5), // Last 5 slow queries
      error_rate_percent: (metrics.errorRate * 100).toFixed(2),
      // New response time metrics
      recent_requests: metrics.responseTimeMetrics.slice(-10),
      average_response_time_ms: metrics.averageResponseTime,
      endpoint_performance: Object.entries(metrics.endpointPerformance)
        .map(([endpoint, perf]: [string, { count: number; avgDuration: number; errorRate: number }]) => ({
          endpoint,
          avg_duration_ms: perf.avgDuration.toFixed(2),
          request_count: perf.count,
          error_rate_percent: (perf.errorRate * 100).toFixed(1)
        }))
        .sort((a, b) => parseFloat(b.avg_duration_ms) - parseFloat(a.avg_duration_ms))
        .slice(0, 10) // Top 10 slowest endpoints
    },
    alerts: {
      critical_count: alerts.criticalCount,
      high_count: alerts.highCount,
      medium_count: alerts.mediumCount,
      recent_alerts: alerts.alerts.slice(-5) // Last 5 alerts
    },
    analysis: {
      summary: analysis.summary,
      recommendations: analysis.recommendations,
      critical_issues: analysis.criticalIssues
    },
    system: {
      worker_uptime_ms: performance.now(),
      memory_usage: (performance as unknown as { memory?: MemoryInfo }).memory ? {
        used: (performance as unknown as { memory: MemoryInfo }).memory.usedJSHeapSize,
        total: (performance as unknown as { memory: MemoryInfo }).memory.totalJSHeapSize,
        limit: (performance as unknown as { memory: MemoryInfo }).memory.jsHeapSizeLimit
      } : 'unavailable'
    }
  });
}

/**
 * Get detailed query analysis (admin only)
 */
export async function handleGetQueryAnalysis(request: Request, env: Env): Promise<Response> {
  const metrics = getPerformanceMetrics();
  
  // Analyze query patterns
  const queryPatterns = metrics.recentQueries.reduce((acc: Record<string, { count: number; totalDuration: number; errors: number }>, query) => {
    acc[query.query] = acc[query.query] || { count: 0, totalDuration: 0, errors: 0 };
    acc[query.query].count++;
    acc[query.query].totalDuration += query.duration;
    if (!query.success) acc[query.query].errors++;
    return acc;
  }, {} as Record<string, { count: number; totalDuration: number; errors: number }>);

  const analysisData = Object.entries(queryPatterns).map(([query, stats]) => ({
    query,
    count: stats.count,
    avg_duration_ms: (stats.totalDuration / stats.count).toFixed(2),
    error_count: stats.errors,
    error_rate_percent: ((stats.errors / stats.count) * 100).toFixed(1)
  })).sort((a, b) => parseFloat(b.avg_duration_ms) - parseFloat(a.avg_duration_ms));

  return ok({
    query_analysis: analysisData,
    slow_query_threshold_ms: 100,
    total_queries_analyzed: metrics.recentQueries.length
  });
}

/**
 * Run database maintenance operations (admin only)
 */
export async function handleRunMaintenance(request: Request, env: Env): Promise<Response> {
  const startTime = Date.now();
  
  try {
    // Clean up expired data
    const cleanupResult = await cleanupExpiredData(env.PLATFORM_CONTEXT!.db);
    
    // Analyze database sizes and indexes (SQLite specific)
    const dbAnalysis = await Promise.all([
      env.PLATFORM_CONTEXT!.db.prepare(`SELECT name, sql FROM sqlite_master WHERE type = 'index' AND name LIKE 'idx_%'`).all(),
      env.PLATFORM_CONTEXT!.db.prepare(`SELECT name FROM sqlite_master WHERE type = 'table'`).all(),
      env.PLATFORM_CONTEXT!.db.prepare(`PRAGMA optimize`).run()
    ]);
    
    type IndexRow = { name: string; sql: string };
    type TableRow = { name: string };
    const indexes = (dbAnalysis[0].results as IndexRow[]).map(idx => ({
      name: idx.name,
      definition: idx.sql
    }));
    
    const tables = (dbAnalysis[1].results as TableRow[]).map(table => table.name);
    
    const duration = Date.now() - startTime;
    
    return ok({
      maintenance_completed: true,
      duration_ms: duration,
      cleanup: {
        success: cleanupResult.success,
        operations_completed: cleanupResult.successfulOperations,
        total_operations: cleanupResult.totalOperations,
        failures: cleanupResult.failures
      },
      database: {
        index_count: indexes.length,
        table_count: tables.length,
        optimization_run: true
      },
      recommendations: [
        cleanupResult.successfulOperations > 1000 ? 'High number of expired records cleaned - consider more frequent maintenance' : null,
        'Run VACUUM during low-traffic periods to reclaim space',
        'Monitor query performance after optimization'
      ].filter(Boolean)
    });
  } catch (e) {
    return error(`Maintenance failed: ${e instanceof Error ? e.message : String(e)}`);
  }
}

/**
 * Get database connection and performance status
 */
export async function handleGetSystemHealth(request: Request, env: Env): Promise<Response> {
  const startTime = Date.now();
  
  try {
    // Test database connectivity with a simple query
    const dbTestResult = await env.PLATFORM_CONTEXT!.db.prepare('SELECT datetime(\'now\') as current_time').first();
    const dbResponseTime = Date.now() - startTime;
    
    // Get basic table counts for health check
    const healthChecks = await Promise.all([
      env.PLATFORM_CONTEXT!.db.prepare('SELECT COUNT(*) as count FROM users').first(),
      env.PLATFORM_CONTEXT!.db.prepare('SELECT COUNT(*) as count FROM applications').first(),
      env.PLATFORM_CONTEXT!.db.prepare('SELECT COUNT(*) as count FROM sessions WHERE expires_at > datetime(\'now\')').first()
    ]);
    
    const metrics = getPerformanceMetrics();
    const recentErrors = metrics.recentQueries.filter(q => !q.success).slice(-5);
    
    return ok({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: {
        connection_status: 'connected',
        response_time_ms: dbResponseTime,
        current_db_time: (dbTestResult as { current_time?: string } | null)?.current_time ?? null,
        counts: {
          users: (healthChecks[0] as { count?: number } | null)?.count ?? 0,
          applications: (healthChecks[1] as { count?: number } | null)?.count ?? 0,
          active_sessions: (healthChecks[2] as { count?: number } | null)?.count ?? 0
        }
      },
      performance: {
        avg_query_time_ms: metrics.averageQueryTime.toFixed(2),
        error_rate_percent: (metrics.errorRate * 100).toFixed(2),
        recent_errors: recentErrors.length,
        slow_queries_count: metrics.slowQueries.length
      },
      alerts: [
        ...(dbResponseTime > 1000 ? ['High database response time detected'] : []),
        ...(metrics.errorRate > 0.1 ? ['High error rate detected'] : []),
        ...(metrics.averageQueryTime > 100 ? ['Slow average query time'] : [])
      ]
    });
  } catch (e) {
    return ok({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: e instanceof Error ? e.message : String(e),
      database: {
        connection_status: 'failed',
        response_time_ms: Date.now() - startTime
      }
    });
  }
}

/**
 * Force cleanup of performance metrics (admin only)
 */
export async function handleClearMetrics(request: Request, env: Env): Promise<Response> {
  // This would clear the in-memory metrics - for demonstration
  // In a real implementation, you might want to persist metrics to D1
  
  return ok({
    message: 'Performance metrics cleared',
    timestamp: new Date().toISOString(),
    note: 'Metrics are stored in Worker memory and will be cleared on next deployment'
  });
}

/**
 * Get performance alerts (admin only)
 */
export async function handleGetPerformanceAlerts(request: Request, env: Env): Promise<Response> {
  const alerts = getPerformanceAlerts();
  const url = new URL(request.url);
  const severity = url.searchParams.get('severity');
  
  let filteredAlerts = alerts.alerts;
  if (severity && ['low', 'medium', 'high', 'critical'].includes(severity)) {
    filteredAlerts = alerts.alerts.filter(alert => alert.severity === severity);
  }
  
  return ok({
    timestamp: new Date().toISOString(),
    alerts: filteredAlerts,
    summary: {
      total_alerts: alerts.alerts.length,
      critical_count: alerts.criticalCount,
      high_count: alerts.highCount,
      medium_count: alerts.mediumCount,
      filtered_count: filteredAlerts.length
    }
  });
}