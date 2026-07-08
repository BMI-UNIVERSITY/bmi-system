import { IRateLimiter, IHealthCheck } from '@bmi/ports';
import { Pool } from 'pg';

export class PostgresRateLimiterAdapter implements IRateLimiter, IHealthCheck {
  constructor(private readonly pool: Pool) {}

  async checkAndIncrement(key: string, limit: number, windowSeconds: number): Promise<{ allowed: boolean; remaining: number }> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      
      // Cleanup old windows
      await client.query(`DELETE FROM rate_limits WHERE window_start < NOW() - INTERVAL '${windowSeconds} seconds'`);

      // We use upsert to insert or lock the existing row
      const result = await client.query(`
        INSERT INTO rate_limits (key, count, window_start) 
        VALUES ($1, 1, NOW())
        ON CONFLICT (key) DO UPDATE 
        SET count = rate_limits.count + 1 
        RETURNING count
      `, [key]);

      const count = result.rows[0].count;
      
      if (count > limit) {
        await client.query('ROLLBACK');
        return { allowed: false, remaining: 0 };
      }

      await client.query('COMMIT');
      return { allowed: true, remaining: limit - count };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async health(): Promise<boolean> {
    try {
      await this.pool.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }
}
