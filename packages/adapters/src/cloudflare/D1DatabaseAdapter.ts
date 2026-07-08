import type { IDatabase, IPreparedStatement, IHealthCheck } from '@bmi/ports';

export class D1DatabaseAdapter implements IDatabase, IHealthCheck {
  constructor(private readonly d1: D1Database) {}

  async query<T = any>(sql: string, params?: any[]): Promise<T[]> {
    let stmt = this.d1.prepare(sql);
    if (params && params.length > 0) {
      stmt = stmt.bind(...params);
    }
    const result = await stmt.all<T>();
    return result.results as T[];
  }

  async queryOne<T = any>(sql: string, params?: any[]): Promise<T | null> {
    let stmt = this.d1.prepare(sql);
    if (params && params.length > 0) {
      stmt = stmt.bind(...params);
    }
    const result = await stmt.first<T>();
    return result;
  }

  prepare(sql: string): IPreparedStatement {
    let stmt = this.d1.prepare(sql);
    
    const wrapper: IPreparedStatement = {
      bind: (...params: any[]) => {
        stmt = stmt.bind(...params);
        return wrapper;
      },
      run: async () => {
        const result = await stmt.run();
        return { success: result.success, meta: result.meta };
      },
      all: async <T = any>() => {
        const result = await stmt.all<T>();
        return { results: result.results as T[], meta: result.meta };
      },
      first: async <T = any>() => {
        return await stmt.first<T>();
      }
    };
    return wrapper;
  }

  async transaction<T>(callback: (db: IDatabase) => Promise<T>): Promise<T> {
    // Implement transaction batching for D1
    const statements: D1PreparedStatement[] = [];
    
    // Create a wrapper that collects prepared statements
    const collectingDb: IDatabase = {
      query: async <U = any>(sql: string, params?: any[]): Promise<U[]> => {
        throw new Error("Cannot use query() inside D1 transaction batch collector. Use prepare().run/all/first instead.");
      },
      queryOne: async <U = any>(sql: string, params?: any[]): Promise<U | null> => {
        throw new Error("Cannot use queryOne() inside D1 transaction batch collector.");
      },
      prepare: (sql: string): IPreparedStatement => {
        let stmt = this.d1.prepare(sql);
        const wrapper: IPreparedStatement = {
          bind: (...params: any[]) => {
            stmt = stmt.bind(...params);
            return wrapper;
          },
          run: async () => {
            statements.push(stmt);
            return { success: true };
          },
          all: async <U = any>() => {
            statements.push(stmt);
            return { results: [] as U[] };
          },
          first: async <U = any>() => {
            statements.push(stmt);
            return null;
          }
        };
        return wrapper;
      },
      transaction: async <U>(cb: (db: IDatabase) => Promise<U>) => {
        throw new Error("Nested transactions are not supported.");
      },
      getPlatform: () => this.getPlatform(),
    };

    const result = await callback(collectingDb);
    
    if (statements.length > 0) {
      await this.d1.batch(statements);
    }
    
    return result;
  }

  getPlatform(): string {
    return 'cloudflare-d1';
  }

  async health(): Promise<boolean> {
    try {
      await this.queryOne('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }
}
