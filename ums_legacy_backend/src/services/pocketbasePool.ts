/**
 * BMI UMS — PocketBase Connection Helper
 *
 * PocketBase is a single-process SQLite server accessed over HTTP.
 * The JS SDK (`PocketBase`) is a stateless HTTP client — creating multiple
 * instances adds object-allocation overhead with no throughput benefit.
 *
 * This module preserves the `withPocketBase` / `getPoolStats` public API so
 * that no callers need to change, but the implementation now delegates
 * directly to the shared singleton from `pocketbase.ts`.
 */

import { getPocketBase } from "./pocketbase.js";
import { logger } from "../utils/logger.js";

// ── Public API (identical signatures to the old pool) ─────────────────────────

/**
 * Execute `fn` with the shared PocketBase client.
 * Drop-in replacement for the old pool's `withConnection`.
 */
export async function withPocketBase<T>(
  fn: (pb: ReturnType<typeof getPocketBase>) => Promise<T>,
): Promise<T> {
  return fn(getPocketBase());
}

/**
 * Returns a stats object with the same shape as the old pool stats,
 * but always reflects a single-connection model.
 */
export function getPoolStats(): {
  total: number;
  inUse: number;
  available: number;
  waiting: number;
} {
  return { total: 1, inUse: 0, available: 1, waiting: 0 };
}

/** Backwards-compat: returns a trivial pool object. */
export function getConnectionPool() {
  return {
    isReady: true,
    getStats: getPoolStats,
    withConnection: withPocketBase,
    waitUntilReady: async () => {},
    close: async () => {
      logger.info("PocketBase connection pool closed (no-op — singleton mode)");
    },
  };
}






