import pino from 'pino';
import { CONFIG } from '../config/index.js';
import { getCorrelationId } from './context.js';

const isDev = CONFIG.NODE_ENV === 'development';

export const logger = pino({
  level: CONFIG.LOG_LEVEL || 'info',
  base: { service: 'bmi-ums-api' },
  mixin() {
    return { correlationId: getCorrelationId() };
  },
  transport: isDev
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          ignore: 'pid,hostname',
          translateTime: 'SYS:standard',
        },
      }
    : undefined,
});

export const auditLogger = logger.child({ module: 'audit' });





