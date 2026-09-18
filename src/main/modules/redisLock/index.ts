import { randomUUID } from 'crypto';

import type { Redis } from 'ioredis';

import { Logger } from '@modules/logger';

const logger = Logger.getLogger('redisLock');

export interface RedisLockOptions {
  /** TTL of the lock key in milliseconds. The lock is auto-released after this if the holder crashes. */
  ttlMs: number;
  /** Maximum time to wait for the lock before giving up. Defaults to 5000ms. */
  waitTimeoutMs?: number;
  /** Polling interval while waiting to acquire. Defaults to 50ms. */
  retryDelayMs?: number;
}

export class RedisLockTimeoutError extends Error {
  constructor(key: string, waitTimeoutMs: number) {
    super(`Failed to acquire Redis lock '${key}' within ${waitTimeoutMs}ms`);
    this.name = 'RedisLockTimeoutError';
  }
}

// Only delete the key if its value matches our token — prevents one holder
// from releasing another's lock if the first holder's TTL expired mid-work.
const RELEASE_SCRIPT =
  'if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) else return 0 end';

/**
 * Run `fn` while holding a Redis-backed mutex on `key`. Acquires with `SET NX PX`,
 * polls until acquired or `waitTimeoutMs` elapses, releases via a token-checked
 * Lua script. Use for cross-pod serialization (multiple Node processes sharing Redis).
 */
export async function withRedisLock<T>(
  redis: Redis,
  key: string,
  options: RedisLockOptions,
  fn: () => Promise<T>
): Promise<T> {
  const token = randomUUID();
  const waitTimeoutMs = options.waitTimeoutMs ?? 5000;
  const retryDelayMs = options.retryDelayMs ?? 50;
  const deadline = Date.now() + waitTimeoutMs;

  while (true) {
    const acquired = await redis.set(key, token, 'PX', options.ttlMs, 'NX');
    if (acquired === 'OK') {
      try {
        return await fn();
      } finally {
        try {
          await redis.eval(RELEASE_SCRIPT, 1, key, token);
        } catch (err) {
          logger.warn('Failed to release Redis lock; relying on TTL', {
            key,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
    }
    if (Date.now() >= deadline) {
      throw new RedisLockTimeoutError(key, waitTimeoutMs);
    }
    await new Promise(resolve => setTimeout(resolve, retryDelayMs));
  }
}
