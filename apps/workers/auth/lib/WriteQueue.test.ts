/**
 * Unit tests for WriteQueue sharding logic
 *
 * These verify the audit finding #4 fix:
 *   "Implement a sharding strategy based on student_id % N for DO instances."
 */
import { describe, it, expect } from 'vitest';

// Extract the shardIndex function for isolated testing
// (same implementation as WriteQueue.ts — kept in sync manually)
function shardIndex(key: string, shards = 8): number {
  let hash = 5381;
  for (let i = 0; i < key.length; i++) {
    hash = ((hash << 5) + hash) ^ key.charCodeAt(i);
    hash = hash >>> 0;
  }
  return hash % shards;
}

describe('WriteQueue sharding', () => {
  it('always returns a shard within [0, N-1]', () => {
    const keys = ['user-1', 'user-2', 'student-abc', 'global', '', 'a'.repeat(200)];
    for (const key of keys) {
      const shard = shardIndex(key);
      expect(shard).toBeGreaterThanOrEqual(0);
      expect(shard).toBeLessThan(8);
    }
  });

  it('is deterministic — same key always maps to same shard', () => {
    const key = 'student-uuid-abc123';
    const first = shardIndex(key);
    for (let i = 0; i < 100; i++) {
      expect(shardIndex(key)).toBe(first);
    }
  });

  it('distributes keys across shards reasonably (no single shard gets >50%)', () => {
    const counts = new Array(8).fill(0);
    // Generate 800 test UUIDs (simulating student IDs)
    for (let i = 0; i < 800; i++) {
      const key = `student-${i.toString().padStart(6, '0')}`;
      counts[shardIndex(key)]++;
    }
    // Each shard should receive between 50 and 200 keys (6.25% ± 3x)
    for (const count of counts) {
      expect(count).toBeGreaterThan(50);
      expect(count).toBeLessThan(200);
    }
  });

  it('different keys generally map to different shards', () => {
    const shards = new Set<number>();
    for (let i = 0; i < 100; i++) {
      shards.add(shardIndex(`key-${i}`));
    }
    // With 100 different keys and 8 shards, we expect all 8 shards to be used
    expect(shards.size).toBe(8);
  });

  it('global key always maps to a consistent shard', () => {
    // 'global' is the default key — its shard must not change
    const shard = shardIndex('global');
    expect(shard).toBeGreaterThanOrEqual(0);
    expect(shard).toBeLessThan(8);
    // Run many times to confirm stability
    for (let i = 0; i < 50; i++) {
      expect(shardIndex('global')).toBe(shard);
    }
  });

  it('respects custom shard count', () => {
    const key = 'test-key';
    const shard16 = shardIndex(key, 16);
    expect(shard16).toBeGreaterThanOrEqual(0);
    expect(shard16).toBeLessThan(16);
  });
});
