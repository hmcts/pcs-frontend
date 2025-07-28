import { TTLCache } from '../../../main/utils/ttlCache';

describe('TTLCache', () => {
  describe('constructor validation', () => {
    it('should throw when ttlMs is non-positive and not Infinity', () => {
      expect(() => new TTLCache(0)).toThrow();
      expect(() => new TTLCache(-5)).toThrow();
    });

    it('should not throw for positive numbers, Infinity, or undefined', () => {
      expect(() => new TTLCache(100)).not.toThrow();
      expect(() => new TTLCache(Infinity)).not.toThrow();
      expect(() => new TTLCache()).not.toThrow();
    });
  });

  describe('basic set/get behaviour', () => {
    it('should return undefined for unknown keys', () => {
      const cache = new TTLCache<string, number>();
      expect(cache.get('missing')).toBeUndefined();
    });

    it('should store and retrieve values', () => {
      const cache = new TTLCache<string, number>();
      cache.set('answer', 42);
      expect(cache.get('answer')).toBe(42);
    });
  });

  describe('TTL expiry', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should expire entries after the specified TTL', () => {
      const cache = new TTLCache<string, string>(1000);
      cache.set('key', 'value');

      // Just before expiry
      jest.advanceTimersByTime(999);
      expect(cache.get('key')).toBe('value');

      // Move past expiry
      jest.advanceTimersByTime(2);
      expect(cache.get('key')).toBeUndefined();
    });

    it('should not expire entries when TTL is Infinity', () => {
      const cache = new TTLCache<string, string>(Infinity);
      cache.set('forever', 'value');

      jest.advanceTimersByTime(1_000_000);
      expect(cache.get('forever')).toBe('value');
    });
  });

  describe('has', () => {
    it('should reflect key existence respecting TTL', () => {
      jest.useFakeTimers();
      const cache = new TTLCache<string, string>(10);
      cache.set('k', 'v');
      expect(cache.has('k')).toBe(true);

      jest.advanceTimersByTime(11);
      expect(cache.has('k')).toBe(false);
      jest.useRealTimers();
    });
  });

  describe('clear', () => {
    it('should remove all entries from the cache', () => {
      const cache = new TTLCache<string, string>();
      cache.set('one', '1');
      cache.set('two', '2');
      cache.clear();

      expect(cache.get('one')).toBeUndefined();
      expect(cache.get('two')).toBeUndefined();
    });
  });
});
