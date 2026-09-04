import type { Redis } from 'ioredis';

import { RedisLockTimeoutError, withRedisLock } from '@modules/redisLock';

jest.mock('@modules/logger', () => ({
  Logger: { getLogger: () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() }) },
}));

// Minimal in-memory fake of the ioredis methods we use, enough to model
// SET NX PX (with TTL expiry) and the token-checked Lua release.
function createFakeRedis(): Redis {
  const store = new Map<string, { value: string; expiresAt: number }>();

  const get = (key: string): string | null => {
    const entry = store.get(key);
    if (!entry) {
      return null;
    }
    if (Date.now() >= entry.expiresAt) {
      store.delete(key);
      return null;
    }
    return entry.value;
  };

  return {
    set: jest.fn(async (key: string, value: string, _pxFlag: string, ttlMs: number, _nxFlag: string) => {
      if (get(key) !== null) {
        return null;
      }
      store.set(key, { value, expiresAt: Date.now() + ttlMs });
      return 'OK';
    }),
    eval: jest.fn(async (_script: string, _numKeys: number, key: string, token: string) => {
      const current = get(key);
      if (current === token) {
        store.delete(key);
        return 1;
      }
      return 0;
    }),
  } as unknown as Redis;
}

describe('withRedisLock', () => {
  it('acquires when the key is free and releases on success', async () => {
    const redis = createFakeRedis();
    const result = await withRedisLock(redis, 'k', { ttlMs: 1000 }, async () => 'ok');
    expect(result).toBe('ok');
    expect(redis.set).toHaveBeenCalledWith('k', expect.any(String), 'PX', 1000, 'NX');
    expect(redis.eval).toHaveBeenCalledTimes(1);
  });

  it('releases on inner throw and rethrows', async () => {
    const redis = createFakeRedis();
    await expect(
      withRedisLock(redis, 'k', { ttlMs: 1000 }, async () => {
        throw new Error('boom');
      })
    ).rejects.toThrow('boom');
    expect(redis.eval).toHaveBeenCalledTimes(1);
  });

  it('serialises concurrent holders for the same key', async () => {
    const redis = createFakeRedis();
    const events: string[] = [];

    const run = (label: string): Promise<void> =>
      withRedisLock(redis, 'k', { ttlMs: 5000, retryDelayMs: 5 }, async () => {
        events.push(`${label}:start`);
        await new Promise(resolve => setTimeout(resolve, 20));
        events.push(`${label}:end`);
      });

    await Promise.all([run('A'), run('B')]);

    // Either A then B, or B then A — but never interleaved.
    expect([
      ['A:start', 'A:end', 'B:start', 'B:end'],
      ['B:start', 'B:end', 'A:start', 'A:end'],
    ]).toContainEqual(events);
  });

  it('throws RedisLockTimeoutError if the lock is not acquired within waitTimeoutMs', async () => {
    const redis = createFakeRedis();

    // Acquire and hold the lock past the second caller's wait timeout.
    let release!: () => void;
    const holder = withRedisLock(redis, 'k', { ttlMs: 5000 }, async () => {
      await new Promise<void>(resolve => {
        release = resolve;
      });
    });

    await expect(
      withRedisLock(redis, 'k', { ttlMs: 5000, waitTimeoutMs: 30, retryDelayMs: 10 }, async () => 'never')
    ).rejects.toBeInstanceOf(RedisLockTimeoutError);

    release();
    await holder;
  });

  it('does not release a lock owned by a different token', async () => {
    const redis = createFakeRedis();

    // First holder acquires.
    let firstFinished = false;
    const first = withRedisLock(redis, 'k', { ttlMs: 30 }, async () => {
      await new Promise(resolve => setTimeout(resolve, 60));
      firstFinished = true;
    });

    // Wait for the first lock's TTL to lapse, then a second holder acquires.
    await new Promise(resolve => setTimeout(resolve, 40));

    await withRedisLock(redis, 'k', { ttlMs: 100 }, async () => {
      // Now the first holder's `finally` runs (when first resolves). Its
      // eval should NOT delete this second holder's lock because the token
      // does not match.
      await first;
      expect(firstFinished).toBe(true);
      // Token-mismatch returns 0 from the Lua script — verified by the second
      // holder's own release at the end of this block succeeding.
    });

    // Second holder's release should have happened successfully (token match).
    // Third holder acquires immediately.
    const result = await withRedisLock(redis, 'k', { ttlMs: 100 }, async () => 'ok');
    expect(result).toBe('ok');
  });
});
