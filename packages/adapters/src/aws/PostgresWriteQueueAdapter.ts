import { IWriteQueue, IHealthCheck } from '@bmi/ports';
import { Pool } from 'pg';

export class PostgresWriteQueueAdapter implements IWriteQueue, IHealthCheck {
  constructor(private readonly pool: Pool) {}

  async enqueue<T = any>(operation: T, shardKey: string): Promise<void> {
    await this.pool.query(`
      INSERT INTO write_queue (shard_key, payload, status)
      VALUES ($1, $2, 'pending')
    `, [shardKey, JSON.stringify(operation)]);
    
    // In a real implementation, a separate worker would SELECT ... FOR UPDATE SKIP LOCKED
    // to consume these events serially per shardKey.
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
