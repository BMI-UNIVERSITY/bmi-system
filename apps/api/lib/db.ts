/**
 * Database connection utilities for the Neon-Centric architecture.
 *
 * Provides:
 *   - `createCoreDb(env)` / `createHrDb(env)` / `createLibraryDb(env)` / `createAlumniDb(env)`
 *     Drizzle instances bound to the four Neon projects.
 *   - A D1 fallback (`getD1()` / `createD1Drizzle(env)`) so local development and the
 *     strangler-fig migration phase keep working against the existing SQLite database.
 *   - `setRequestContext(db, userId)` to configure Postgres RLS
 *     (`set_config('request.jwt.claim.sub', ...)`) on each request.
 *
 * The Neon connection string is read from env vars in this priority order:
 *   1. Per-module binding: DATABASE_URL_CORE, DATABASE_URL_HR, DATABASE_URL_LIBRARY, DATABASE_URL_ALUMNI
 *   2. A generic DATABASE_URL
 *   3. A Cloudflare Hyperdrive binding: CORE_HYPERDRIVE / HR_HYPERDRIVE / LIBRARY_HYPERDRIVE / ALUMNI_HYPERDRIVE
 *   4. Empty (falls back to D1)
 */
import { neon } from '@neondatabase/serverless';
import { drizzle as drizzleNeonHttp } from 'drizzle-orm/neon-http';
import { drizzle as drizzleD1 } from 'drizzle-orm/d1';
import { sql } from 'drizzle-orm';
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import { PostgresDatabaseAdapter } from '@bmi/adapters';
import type { IDatabase } from '@bmi/ports';
import * as coreSchema from '../schema/core';
import * as academicSchema from '../schema/academic';
import * as hrSchema from '../schema/hr';
import * as librarySchema from '../schema/library';
import * as alumniSchema from '../schema/alumni';
import * as campusSchema from '../schema/campus';
import type { Env } from './types';

export type CoreSchema = typeof coreSchema & typeof academicSchema & typeof hrSchema & typeof librarySchema & typeof alumniSchema & typeof campusSchema;
export type CoreDb = NeonHttpDatabase<CoreSchema>;
export type HrDb = NeonHttpDatabase<typeof hrSchema>;
export type LibraryDb = NeonHttpDatabase<typeof librarySchema>;
export type AlumniDb = NeonHttpDatabase<typeof alumniSchema & typeof campusSchema>;

function getConnectionUrl(env: Env, perModuleVar: string): string | undefined {
  const url =
    env[perModuleVar as keyof Env] ??
    env.DATABASE_URL ??
    env.DATABASE_URL_CORE ??
    // Hyperdrive binding (Connection String is available on the binding itself)
    (env.CORE_HYPERDRIVE as any)?.connectionString ??
    (env.HR_HYPERDRIVE as any)?.connectionString ??
    (env.LIBRARY_HYPERDRIVE as any)?.connectionString ??
    (env.ALUMNI_HYPERDRIVE as any)?.connectionString;
  return typeof url === 'string' && url.length > 0 ? url : undefined;
}

function createNeon(url: string, schema: Record<string, unknown>): NeonHttpDatabase<any> {
  const client = neon(url);
  return drizzleNeonHttp(client as any, { schema: schema as any });
}

/** D1 fallback — only active in local dev or when DATABASE_URL_CORE is absent. */
function createD1(env: Env): DrizzleD1Database<any> | null {
  const binding = env.DB ?? (env.PLATFORM_CONTEXT?.db as any);
  if (!binding) return null;
  return drizzleD1(binding as any, { schema: {} as any });
}

/**
 * Returns an `IDatabase`-compatible handle for the CORE database.
 *
 * When a Neon connection string is configured, this returns the
 * `PostgresDatabaseAdapter` so every existing `db.prepare()` route runs
 * against Postgres unchanged (SQLite→Postgres SQL translation). Otherwise it
 * returns the D1 adapter via the existing `env.DB` binding.
 */
export function createCoreIdb(env: Env): IDatabase {
  const url = getConnectionUrl(env, 'DATABASE_URL_CORE');
  if (url) return new PostgresDatabaseAdapter(url);
  return new D1FallbackAdapter(env);
}

/**
 * Minimal IDatabase wrapper around the D1 binding so callers get a uniform
 * interface. In practice routes receive this via `PLATFORM_CONTEXT.db`.
 * Only used when DATABASE_URL_CORE is not configured (local dev / fallback).
 */
export class D1FallbackAdapter implements IDatabase {
  private readonly db: IDatabase;
  constructor(env: Env) {
    const binding = env.DB ?? (env.PLATFORM_CONTEXT?.db as IDatabase | undefined);
    if (!binding) {
      throw new Error(
        'D1FallbackAdapter: env.DB is not set and no PLATFORM_CONTEXT.db is available. ' +
        'Set DATABASE_URL_CORE to use Neon instead.'
      );
    }
    this.db = binding;
  }
  query<T = any>(sql: string, params?: any[]): Promise<T[]> {
    return this.db.query(sql, params);
  }
  queryOne<T = any>(sql: string, params?: any[]): Promise<T | null> {
    return this.db.queryOne(sql, params);
  }
  prepare(sql: string) {
    return this.db.prepare(sql);
  }
  transaction<T>(callback: (db: IDatabase) => Promise<T>): Promise<T> {
    return this.db.transaction(callback);
  }
  batch<T = any>(statements: import('@bmi/ports').IPreparedStatement[]): Promise<T[]> {
    return this.db.batch(statements);
  }
  getPlatform(): string {
    return 'cloudflare-d1';
  }
}


export function createCoreDb(env: Env): CoreDb {
  const url = getConnectionUrl(env, 'DATABASE_URL_CORE');
  if (url) return createNeon(url, { ...coreSchema, ...academicSchema, ...hrSchema, ...librarySchema, ...alumniSchema, ...campusSchema });
  const d1 = createD1(env);
  if (!d1) throw new Error('createCoreDb: no Neon URL and no D1 binding available. Set DATABASE_URL_CORE.');
  return d1 as unknown as CoreDb;
}

export function createHrDb(env: Env): HrDb {
  const url = getConnectionUrl(env, 'DATABASE_URL_HR');
  if (url) return createNeon(url, hrSchema as unknown as Record<string, unknown>);
  const d1 = createD1(env);
  if (!d1) throw new Error('createHrDb: no Neon URL and no D1 binding available. Set DATABASE_URL_HR.');
  return d1 as unknown as HrDb;
}

export function createLibraryDb(env: Env): LibraryDb {
  const url = getConnectionUrl(env, 'DATABASE_URL_LIBRARY');
  if (url) return createNeon(url, librarySchema as unknown as Record<string, unknown>);
  const d1 = createD1(env);
  if (!d1) throw new Error('createLibraryDb: no Neon URL and no D1 binding available. Set DATABASE_URL_LIBRARY.');
  return d1 as unknown as LibraryDb;
}

export function createAlumniDb(env: Env): AlumniDb {
  const url = getConnectionUrl(env, 'DATABASE_URL_ALUMNI');
  if (url) return createNeon(url, { ...alumniSchema, ...campusSchema });
  const d1 = createD1(env);
  if (!d1) throw new Error('createAlumniDb: no Neon URL and no D1 binding available. Set DATABASE_URL_ALUMNI.');
  return d1 as unknown as AlumniDb;
}


/**
 * Set the request-level identity for Row-Level Security.
 * Call this once per request after authentication so Postgres RLS policies
 * can restrict rows to the requesting user.
 */
export async function setRequestContext(db: NeonHttpDatabase<any>, userId: string): Promise<void> {
  await db.execute(
    sql`select set_config('request.jwt.claim.sub', ${userId}, true), set_config('request.jwt.claim.role', 'authenticated', true)`,
  );
}

/** Return true when the given db handle is a Neon (Postgres) connection. */
export function isNeon(db: unknown): boolean {
  return typeof db === 'object' && db !== null && 'execute' in db && !('prepare' in db);
}
