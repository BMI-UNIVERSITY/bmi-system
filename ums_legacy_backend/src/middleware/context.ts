import { MiddlewareHandler } from 'hono';
import { randomBytes } from 'crypto';
import { contextStorage, RequestContext } from '../utils/context.js';

/**
 * Middleware to generate a correlation ID and initialize the request context
 */
export const requestContextMiddleware: MiddlewareHandler = async (c, next) => {
  const correlationId = c.req.header('X-Correlation-ID') || randomBytes(8).toString('hex');
  
  const context: RequestContext = {
    correlationId
  };

  // Set response header
  c.res.headers.set('X-Correlation-ID', correlationId);

  return await contextStorage.run(context, async () => {
    return await next();
  });
};






