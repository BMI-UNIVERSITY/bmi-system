/**
 * IDatabase — Vendor Abstraction Layer
 *
 * This interface provides a thin abstraction over D1's query API.
 * All business logic in `apps/workers/*` should accept `IDatabase` instead of
 * `D1Database` directly, so that the underlying database engine can be swapped
 * (e.g., D1 → Neon PostgreSQL, PlanetScale, Turso) without rewriting routes.
 *
 * Implemented by:
 *   - `D1DatabaseAdapter` (src/adapters/d1.ts) — used in all Cloudflare Workers
 *   - Future: `PostgresAdapter` — used if migrating off Cloudflare
 *
 * Usage:
 *   // In a route handler, inject IDatabase instead of D1Database:
 *   async function handleListUsers(db: IDatabase): Promise<User[]> {
 *     const result = await db.query<User>('SELECT * FROM users WHERE role = ?', ['student']);
 *     return result.results;
 *   }
 */

export interface IQueryResult<T = Record<string, unknown>> {
  results: T[];
  success: boolean;
  meta?: {
    duration?: number;
    rows_read?: number;
    rows_written?: number;
  };
}

export interface IPreparedStatement {
  bind(...values: unknown[]): IPreparedStatement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<IQueryResult<T>>;
  run(): Promise<{ success: boolean; meta?: Record<string, unknown> }>;
}

export interface IDatabase {
  /**
   * Prepare a parameterised SQL statement. Use `?` for placeholders.
   * Equivalent to D1Database.prepare().
   */
  prepare(sql: string): IPreparedStatement;

  /**
   * Execute multiple prepared statements atomically in a single round-trip.
   * Equivalent to D1Database.batch().
   */
  batch<T = Record<string, unknown>>(statements: IPreparedStatement[]): Promise<IQueryResult<T>[]>;

  /**
   * Execute a raw SQL string (DDL only; avoid for DML in production).
   * Equivalent to D1Database.exec().
   */
  exec(sql: string): Promise<{ count: number; duration: number }>;
}

// ─── D1 Adapter ─────────────────────────────────────────────────────────────

/**
 * Wraps a `D1Database` instance (Cloudflare Workers binding) to implement
 * the `IDatabase` interface. Use this in all Workers.
 *
 * @example
 *   import { D1DatabaseAdapter } from '@bmi/shared/db';
 *   const db = new D1DatabaseAdapter(env.DB);
 *   const users = await db.prepare('SELECT * FROM users').all();
 */
export class D1DatabaseAdapter implements IDatabase {
  constructor(private readonly d1: D1Database) {}

  prepare(sql: string): IPreparedStatement {
    return this.d1.prepare(sql) as unknown as IPreparedStatement;
  }

  async batch<T = Record<string, unknown>>(
    statements: IPreparedStatement[]
  ): Promise<IQueryResult<T>[]> {
    return this.d1.batch(statements as unknown as D1PreparedStatement[]) as unknown as IQueryResult<T>[];
  }

  async exec(sql: string): Promise<{ count: number; duration: number }> {
    const res = await this.d1.exec(sql);
    return { count: res.count, duration: res.duration };
  }
}
