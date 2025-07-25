export class TTLCache<K, V> {
  private readonly ttlMs: number | undefined;
  private readonly store = new Map<K, { value: V; expires?: number }>();

  constructor(ttlMs?: number) {
    if (ttlMs !== undefined && ttlMs <= 0 && ttlMs !== Infinity) {
      throw new Error('TTL must be a positive number of milliseconds, Infinity, or undefined');
    }
    this.ttlMs = ttlMs === Infinity ? undefined : ttlMs;
  }

  get(key: K): V | undefined {
    const entry = this.store.get(key);
    if (!entry) {
      return undefined;
    }
    if (this.ttlMs !== undefined && entry.expires !== undefined && Date.now() > entry.expires) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: K, value: V): void {
    const expires = this.ttlMs !== undefined ? Date.now() + this.ttlMs : undefined;
    this.store.set(key, { value, expires });
  }

  has(key: K): boolean {
    return this.get(key) !== undefined;
  }

  clear(): void {
    this.store.clear();
  }
}
