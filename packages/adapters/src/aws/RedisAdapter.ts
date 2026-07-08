import { IKVStore, IHealthCheck } from '@bmi/ports';
import { Redis } from 'ioredis';

export class RedisAdapter implements IKVStore, IHealthCheck {
  constructor(private readonly redis: Redis) {}

  async get<T = any>(key: string): Promise<T | null> {
    const value = await this.redis.get(key);
    if (!value) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      // If it's not JSON, just return as-is or null based on design.
      // Since Cloudflare KV 'json' mode expects JSON, we follow that.
      return null;
    }
  }

  async put<T = any>(key: string, value: T, options?: { expirationTtl?: number }): Promise<void> {
    const serialized = JSON.stringify(value);
    if (options?.expirationTtl) {
      await this.redis.set(key, serialized, 'EX', options.expirationTtl);
    } else {
      await this.redis.set(key, serialized);
    }
  }

  async delete(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async list(prefix?: string): Promise<string[]> {
    let cursor = '0';
    const keys: string[] = [];
    const match = prefix ? `${prefix}*` : '*';
    
    do {
      const result = await this.redis.scan(cursor, 'MATCH', match, 'COUNT', 100);
      cursor = result[0];
      keys.push(...result[1]);
    } while (cursor !== '0');
    
    return keys;
  }

  async health(): Promise<boolean> {
    try {
      await this.redis.ping();
      return true;
    } catch {
      return false;
    }
  }
}
