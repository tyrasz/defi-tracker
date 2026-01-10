interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

class MemoryCache {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor(cleanupIntervalMs: number = 60000) {
    // Periodically clean up expired entries
    this.cleanupInterval = setInterval(() => this.cleanup(), cleanupIntervalMs);
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs: number): void {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  has(key: string): boolean {
    const value = this.get(key);
    return value !== null;
  }

  clear(): void {
    this.cache.clear();
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  stats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.cache.clear();
  }
}

// Cache TTLs
export const CACHE_TTL = {
  PRICE: 5 * 60 * 1000,      // 5 minutes for prices
  PORTFOLIO: 2 * 60 * 1000,  // 2 minutes for portfolio data
  ENS: 30 * 60 * 1000,       // 30 minutes for ENS resolution
  BALANCE: 1 * 60 * 1000,    // 1 minute for balances
};

// Singleton instance
export const cache = new MemoryCache();
