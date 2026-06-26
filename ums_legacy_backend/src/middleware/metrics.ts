import { MiddlewareHandler } from 'hono';
import { metrics } from '../services/metrics.js';

/**
 * Middleware to record request metrics
 */
export const metricsMiddleware: MiddlewareHandler = async (c, next) => {
  const start = Date.now();
  
  await next();
  
  const duration = Date.now() - start;
  const { method, path } = c.req;
  const status = c.res.status;

  metrics.recordRequest({
    timestamp: Date.now(),
    duration,
    method,
    path,
    status
  });
};






