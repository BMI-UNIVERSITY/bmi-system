import { logger } from '../utils/logger.js';

interface MetricRecord {
  timestamp: number;
  duration: number;
  method: string;
  path: string;
  status: number;
  error?: string;
}

class MetricsService {
  private static instance: MetricsService;
  private history: MetricRecord[] = [];
  private readonly MAX_HISTORY = 1000;

  private stats = {
    totalRequests: 0,
    errorCount: 0,
    totalLatency: 0,
    methods: {} as Record<string, number>,
    statuses: {} as Record<number, number>,
  };

  private constructor() {}

  public static getInstance(): MetricsService {
    if (!MetricsService.instance) {
      MetricsService.instance = new MetricsService();
    }
    return MetricsService.instance;
  }

  /**
   * Record a request metric
   */
  public recordRequest(metric: MetricRecord) {
    this.stats.totalRequests++;
    this.stats.totalLatency += metric.duration;
    
    if (metric.status >= 400) {
      this.stats.errorCount++;
    }

    this.stats.methods[metric.method] = (this.stats.methods[metric.method] || 0) + 1;
    this.stats.statuses[metric.status] = (this.stats.statuses[metric.status] || 0) + 1;

    // Keep history limited
    this.history.push(metric);
    if (this.history.length > this.MAX_HISTORY) {
      this.history.shift();
    }

    // Log slow requests (> 500ms)
    if (metric.duration > 500) {
      logger.warn(
        {
          duration: `${metric.duration}ms`,
          path: metric.path,
          method: metric.method,
        },
        "Slow request detected",
      );
    }

    // Alert on high latency (> 2000ms)
    if (metric.duration > 2000) {
      logger.error(
        {
          duration: `${metric.duration}ms`,
          path: metric.path,
        },
        "CRITICAL: Extremely high latency detected",
      );
    }

    // Alert on error bursts (more than 5 errors in last 10 requests)
    const recent = this.history.slice(-10);
    const recentErrors = recent.filter(r => r.status >= 500).length;
    if (recentErrors >= 5) {
      logger.error(
        {
          errorCount: recentErrors,
          window: 10,
        },
        "CRITICAL: Server error burst detected",
      );
    }
  }

  /**
   * Get current aggregated stats
   */
  public getStats() {
    const avgLatency = this.stats.totalRequests > 0 
      ? Math.round(this.stats.totalLatency / this.stats.totalRequests) 
      : 0;

    const last100 = this.history.slice(-100);
    const last100AvgLatency = last100.length > 0
      ? Math.round(last100.reduce((acc, m) => acc + m.duration, 0) / last100.length)
      : 0;

    return {
      total_requests: this.stats.totalRequests,
      error_count: this.stats.errorCount,
      error_rate: this.stats.totalRequests > 0 
        ? `${((this.stats.errorCount / this.stats.totalRequests) * 100).toFixed(2)}%` 
        : '0%',
      avg_latency_ms: avgLatency,
      last_100_avg_latency_ms: last100AvgLatency,
      method_distribution: this.stats.methods,
      status_distribution: this.stats.statuses,
      uptime_seconds: Math.floor(process.uptime()),
    };
  }

  /**
   * Get recent history for diagnostics
   */
  public getRecentHistory(limit: number = 50) {
    return this.history.slice(-limit);
  }
}

export const metrics = MetricsService.getInstance();






