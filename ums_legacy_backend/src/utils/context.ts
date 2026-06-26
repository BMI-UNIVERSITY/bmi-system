import { AsyncLocalStorage } from 'async_hooks';

export interface RequestContext {
  correlationId: string;
  userId?: string;
  role?: string;
}

export const contextStorage = new AsyncLocalStorage<RequestContext>();

/**
 * Get the current correlation ID from the async storage
 */
export function getCorrelationId(): string | undefined {
  return contextStorage.getStore()?.correlationId;
}

/**
 * Get the full current context
 */
export function getContext(): RequestContext | undefined {
  return contextStorage.getStore();
}






