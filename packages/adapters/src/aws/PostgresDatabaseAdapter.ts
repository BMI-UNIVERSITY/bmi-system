import { IDatabase, IPreparedStatement, IHealthCheck } from '@bmi/ports';
import { Pool, PoolClient, QueryResult } from 'pg';

export class PostgresDatabaseAdapter implements IDatabase, IHealthCheck {
  constructor(private readonly pool: Pool) {}

  async query<T = any>(sql: string, params?: any[]): Promise<T[]> {
    const { text, values } = this.convertSql(sql, params);
    const result = await this.pool.query(text, values);
    return result.rows as T[];
  }

  async queryOne<T = any>(sql: string, params?: any[]): Promise<T | null> {
    const rows = await this.query<T>(sql, params);
    return rows.length > 0 ? rows[0] : null;
  }

  prepare(sql: string): IPreparedStatement {
    let boundParams: any[] = [];
    const wrapper: IPreparedStatement = {
      bind: (...params: any[]) => {
        boundParams = params;
        return wrapper;
      },
      run: async () => {
        const { text, values } = this.convertSql(sql, boundParams);
        const result = await this.pool.query(text, values);
        return { success: true, meta: { rowCount: result.rowCount } };
      },
      all: async <T = any>() => {
        const { text, values } = this.convertSql(sql, boundParams);
        const result = await this.pool.query(text, values);
        return { results: result.rows as T[], meta: { rowCount: result.rowCount } };
      },
      first: async <T = any>() => {
        const { text, values } = this.convertSql(sql, boundParams);
        const result = await this.pool.query(text, values);
        return result.rows.length > 0 ? result.rows[0] as T : null;
      }
    };
    return wrapper;
  }

  async transaction<T>(callback: (db: IDatabase) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    
    // Create a specialized IDatabase that uses the connected client
    const txDb: IDatabase = {
      query: async <U = any>(sql: string, params?: any[]) => {
        const { text, values } = this.convertSql(sql, params);
        const result = await client.query(text, values);
        return result.rows as U[];
      },
      queryOne: async <U = any>(sql: string, params?: any[]) => {
        const rows = await txDb.query<U>(sql, params);
        return rows.length > 0 ? rows[0] : null;
      },
      prepare: (sql: string): IPreparedStatement => {
        let boundParams: any[] = [];
        return {
          bind: (...params: any[]) => { boundParams = params; return txDb.prepare(sql).bind(...params); },
          run: async () => {
            const { text, values } = this.convertSql(sql, boundParams);
            const res = await client.query(text, values);
            return { success: true, meta: { rowCount: res.rowCount } };
          },
          all: async <U = any>() => {
            const rows = await txDb.query<U>(sql, boundParams);
            return { results: rows };
          },
          first: async <U = any>() => await txDb.queryOne<U>(sql, boundParams),
        };
      },
      transaction: async () => { throw new Error('Nested transactions not supported'); },
      getPlatform: () => this.getPlatform(),
    };

    try {
      await client.query('BEGIN');
      const result = await callback(txDb);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  getPlatform(): string {
    return 'aws-postgres';
  }

  async health(): Promise<boolean> {
    try {
      await this.pool.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Converts SQLite-style `?` parameters to Postgres-style `$1, $2`
   */
  private convertSql(sql: string, params?: any[]): { text: string; values: any[] } {
    if (!params || params.length === 0) return { text: sql, values: [] };
    
    let index = 1;
    const text = sql.replace(/\?/g, () => `$${index++}`);
    return { text, values: params };
  }
}
