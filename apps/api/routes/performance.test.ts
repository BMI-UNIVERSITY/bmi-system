import { describe, it, expect, vi } from 'vitest';
import {
  handleGetPerformanceMetrics,
  handleGetQueryAnalysis,
  handleGetSystemHealth,
  handleClearMetrics,
  handleGetPerformanceAlerts,
} from './performance';

vi.mock('../lib/performance', () => ({
  getPerformanceMetrics: vi.fn().mockReturnValue({
    recentQueries: [
      { query: 'SELECT * FROM users', duration: 12, success: true },
      { query: 'SELECT * FROM applications', duration: 250, success: false },
    ],
    averageQueryTime: 131,
    slowQueries: [{ query: 'SELECT *', duration: 250 }],
    errorRate: 0.5,
    responseTimeMetrics: [],
    averageResponseTime: 50,
    endpointPerformance: {
      '/api/users': { avgDuration: 12, count: 5, errorRate: 0 },
    },
  }),
  getPerformanceAlerts: vi.fn().mockReturnValue({
    alerts: [
      { id: 'a1', severity: 'high', message: 'Slow query detected' },
      { id: 'a2', severity: 'medium', message: 'Moderate error rate' },
    ],
    criticalCount: 0,
    highCount: 1,
    mediumCount: 1,
  }),
  analyzePerformance: vi.fn().mockReturnValue({
    summary: 'System healthy',
    recommendations: ['Add indexes'],
    criticalIssues: [],
  }),
  cleanupExpiredData: vi.fn().mockResolvedValue({
    success: true,
    successfulOperations: 42,
    totalOperations: 42,
    failures: [],
  }),
}));

describe('performance routes', () => {
  it('handleGetPerformanceMetrics returns metrics and analysis', async () => {
    const db = {
      prepare: vi.fn().mockReturnValue({
        all: vi.fn().mockResolvedValue({ results: [] }),
        run: vi.fn().mockResolvedValue({}),
        first: vi.fn().mockResolvedValue({ current_time: '2026-01-01' }),
      })
    };
    const req = new Request('http://localhost/api/performance');
    const res = await handleGetPerformanceMetrics(req, { DB: db as any } as any);
    const body = await res.json() as any;

    expect(res.status).toBe(200);
    expect(body.data.metrics).toHaveProperty('average_query_time_ms');
    expect(body.data.alerts).toHaveProperty('critical_count');
    expect(body.data.analysis.summary).toBe('System healthy');
  });

  it('handleGetQueryAnalysis returns aggregated query patterns', async () => {
    const req = new Request('http://localhost/api/performance/queries');
    const res = await handleGetQueryAnalysis(req, {} as any);
    const body = await res.json() as any;

    expect(res.status).toBe(200);
    expect(body.data).toHaveProperty('query_analysis');
    expect(body.data.total_queries_analyzed).toBe(2);
    // 'SELECT * FROM applications' appears once with 250ms duration
    const slowQuery = body.data.query_analysis.find((q: any) => q.query === 'SELECT * FROM applications');
    expect(slowQuery.error_count).toBe(1);
  });

  it('handleGetSystemHealth returns healthy status when DB is up', async () => {
    const db = {
      prepare: vi.fn().mockReturnValue({
        first: vi.fn().mockResolvedValue({ current_time: '2026-01-01', count: 10 }),
      })
    };
    const req = new Request('http://localhost/api/performance/health');
    const res = await handleGetSystemHealth(req, { DB: db as any } as any);
    const body = await res.json() as any;

    expect(body.data.status).toBe('healthy');
    expect(body.data.database.connection_status).toBe('connected');
  });

  it('handleGetSystemHealth returns unhealthy status when DB throws', async () => {
    const db = {
      prepare: vi.fn().mockReturnValue({
        first: vi.fn().mockRejectedValue(new Error('DB down')),
      })
    };
    const req = new Request('http://localhost/api/performance/health');
    const res = await handleGetSystemHealth(req, { DB: db as any } as any);
    const body = await res.json() as any;

    expect(body.data.status).toBe('unhealthy');
    expect(body.data.database.connection_status).toBe('failed');
  });

  it('handleClearMetrics returns confirmation message', async () => {
    const req = new Request('http://localhost/api/performance/clear');
    const res = await handleClearMetrics(req, {} as any);
    const body = await res.json() as any;

    expect(res.status).toBe(200);
    expect(body.data.message).toContain('metrics cleared');
  });

  it('handleGetPerformanceAlerts returns all alerts without filter', async () => {
    const req = new Request('http://localhost/api/performance/alerts');
    const res = await handleGetPerformanceAlerts(req, {} as any);
    const body = await res.json() as any;

    expect(body.data.alerts).toHaveLength(2);
    expect(body.data.summary.total_alerts).toBe(2);
  });

  it('handleGetPerformanceAlerts filters by severity', async () => {
    const req = new Request('http://localhost/api/performance/alerts?severity=high');
    const res = await handleGetPerformanceAlerts(req, {} as any);
    const body = await res.json() as any;

    expect(body.data.alerts).toHaveLength(1);
    expect(body.data.alerts[0].severity).toBe('high');
    expect(body.data.summary.filtered_count).toBe(1);
  });

  it('handleGetPerformanceAlerts ignores unknown severity', async () => {
    const req = new Request('http://localhost/api/performance/alerts?severity=unknown');
    const res = await handleGetPerformanceAlerts(req, {} as any);
    const body = await res.json() as any;

    // Unknown severity → all alerts returned (no filter applied)
    expect(body.data.alerts).toHaveLength(2);
  });
});
