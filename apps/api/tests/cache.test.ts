import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cacheAside, invalidateCacheKey, invalidateCacheKeys } from '../lib/cache';

describe('KV Cache-Aside Utility', () => {
  let mockKv: {
    get: ReturnType<typeof vi.fn>;
    put: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockKv = {
      get: vi.fn().mockResolvedValue(null),
      put: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
    };
  });

  it('executes fetcher and populates cache on cache miss', async () => {
    const fetcher = vi.fn().mockResolvedValue({ items: ['course1', 'course2'] });

    const result = await cacheAside(mockKv, 'test-key', fetcher, { ttlSeconds: 1800 });

    expect(mockKv.get).toHaveBeenCalledWith('test-key', 'json');
    expect(fetcher).toHaveBeenCalledOnce();
    expect(mockKv.put).toHaveBeenCalledWith(
      'test-key',
      JSON.stringify({ items: ['course1', 'course2'] }),
      { expirationTtl: 1800 }
    );
    expect(result).toEqual({
      data: { items: ['course1', 'course2'] },
      hit: false,
    });
  });

  it('returns cached data directly on cache hit without invoking fetcher', async () => {
    const cachedData = { items: ['cached-course'] };
    mockKv.get.mockResolvedValue(cachedData);
    const fetcher = vi.fn();

    const result = await cacheAside(mockKv, 'test-key', fetcher);

    expect(mockKv.get).toHaveBeenCalledWith('test-key', 'json');
    expect(fetcher).not.toHaveBeenCalled();
    expect(mockKv.put).not.toHaveBeenCalled();
    expect(result).toEqual({
      data: cachedData,
      hit: true,
    });
  });

  it('handles null KV gracefully by bypassing cache', async () => {
    const fetcher = vi.fn().mockResolvedValue('raw-data');

    const result = await cacheAside(null, 'test-key', fetcher);

    expect(fetcher).toHaveBeenCalledOnce();
    expect(result).toEqual({
      data: 'raw-data',
      hit: false,
    });
  });

  it('invalidates single cache key', async () => {
    await invalidateCacheKey(mockKv, 'key-to-delete');
    expect(mockKv.delete).toHaveBeenCalledWith('key-to-delete');
  });

  it('invalidates multiple cache keys', async () => {
    await invalidateCacheKeys(mockKv, ['key1', 'key2']);
    expect(mockKv.delete).toHaveBeenCalledWith('key1');
    expect(mockKv.delete).toHaveBeenCalledWith('key2');
  });
});
