import type { Address } from 'viem';
import type { EvmChainId, ChainId } from '@/types/chain';

// CoinGecko API (free tier)
const COINGECKO_API_BASE = 'https://api.coingecko.com/api/v3';

// Rate limiting: CoinGecko free tier allows ~10-30 requests per minute
// We use a simple token bucket approach
class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly maxTokens: number;
  private readonly refillRate: number; // tokens per second

  constructor(maxTokens: number = 10, refillRate: number = 0.5) {
    this.tokens = maxTokens;
    this.lastRefill = Date.now();
    this.maxTokens = maxTokens;
    this.refillRate = refillRate;
  }

  async acquire(): Promise<void> {
    this.refill();
    if (this.tokens < 1) {
      // Wait for token
      const waitTime = (1 - this.tokens) / this.refillRate * 1000;
      await new Promise(resolve => setTimeout(resolve, waitTime));
      this.refill();
    }
    this.tokens -= 1;
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.maxTokens, this.tokens + elapsed * this.refillRate);
    this.lastRefill = now;
  }
}

// Cache for CoinGecko prices
interface CachedPrice {
  price: number;
  timestamp: number;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Map chain IDs to CoinGecko platform IDs
const CHAIN_TO_PLATFORM: Record<EvmChainId, string> = {
  1: 'ethereum',
  42161: 'arbitrum-one',
  10: 'optimistic-ethereum',
  8453: 'base',
  137: 'polygon-pos',
  43114: 'avalanche',
  56: 'binance-smart-chain',
};

// Common token IDs for native tokens
const NATIVE_TOKEN_IDS: Record<string, string> = {
  ETH: 'ethereum',
  MATIC: 'matic-network',
  AVAX: 'avalanche-2',
  BNB: 'binancecoin',
  SOL: 'solana',
};

class CoinGeckoPriceFetcher {
  private cache: Map<string, CachedPrice> = new Map();
  private rateLimiter = new RateLimiter();

  private getCacheKey(id: string): string {
    return `coingecko-${id.toLowerCase()}`;
  }

  private getCachedPrice(id: string): number | null {
    const key = this.getCacheKey(id);
    const cached = this.cache.get(key);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.price;
    }
    return null;
  }

  private setCachedPrice(id: string, price: number): void {
    const key = this.getCacheKey(id);
    this.cache.set(key, { price, timestamp: Date.now() });
  }

  /**
   * Get price for a token by its CoinGecko ID
   */
  async getPriceById(coingeckoId: string): Promise<number | null> {
    // Check cache first
    const cached = this.getCachedPrice(coingeckoId);
    if (cached !== null) {
      return cached;
    }

    try {
      await this.rateLimiter.acquire();

      const response = await fetch(
        `${COINGECKO_API_BASE}/simple/price?ids=${coingeckoId}&vs_currencies=usd`,
        {
          headers: {
            'Accept': 'application/json',
          },
        }
      );

      if (!response.ok) {
        if (response.status === 429) {
          console.warn('CoinGecko rate limit hit');
          return null;
        }
        throw new Error(`CoinGecko API error: ${response.status}`);
      }

      const data = await response.json();
      const price = data[coingeckoId]?.usd;

      if (price !== undefined) {
        this.setCachedPrice(coingeckoId, price);
        return price;
      }

      return null;
    } catch (error) {
      console.error(`Error fetching CoinGecko price for ${coingeckoId}:`, error);
      return null;
    }
  }

  /**
   * Get price for a native token by symbol
   */
  async getNativeTokenPrice(symbol: string): Promise<number | null> {
    const coingeckoId = NATIVE_TOKEN_IDS[symbol.toUpperCase()];
    if (!coingeckoId) {
      return null;
    }
    return this.getPriceById(coingeckoId);
  }

  /**
   * Get price for a token by its contract address on a specific chain
   */
  async getPriceByContract(
    chainId: EvmChainId,
    tokenAddress: Address
  ): Promise<number | null> {
    const platform = CHAIN_TO_PLATFORM[chainId];
    if (!platform) {
      return null;
    }

    const cacheKey = `${platform}-${tokenAddress.toLowerCase()}`;
    const cached = this.getCachedPrice(cacheKey);
    if (cached !== null) {
      return cached;
    }

    try {
      await this.rateLimiter.acquire();

      const response = await fetch(
        `${COINGECKO_API_BASE}/simple/token_price/${platform}?contract_addresses=${tokenAddress}&vs_currencies=usd`,
        {
          headers: {
            'Accept': 'application/json',
          },
        }
      );

      if (!response.ok) {
        if (response.status === 429) {
          console.warn('CoinGecko rate limit hit');
          return null;
        }
        throw new Error(`CoinGecko API error: ${response.status}`);
      }

      const data = await response.json();
      const price = data[tokenAddress.toLowerCase()]?.usd;

      if (price !== undefined) {
        this.setCachedPrice(cacheKey, price);
        return price;
      }

      return null;
    } catch (error) {
      console.error(`Error fetching CoinGecko price for ${tokenAddress}:`, error);
      return null;
    }
  }

  /**
   * Batch fetch prices for multiple tokens (more efficient for rate limits)
   */
  async getBatchPricesByIds(coingeckoIds: string[]): Promise<Record<string, number>> {
    // Filter out already cached prices
    const uncached = coingeckoIds.filter(id => this.getCachedPrice(id) === null);
    const results: Record<string, number> = {};

    // Return cached prices
    for (const id of coingeckoIds) {
      const cached = this.getCachedPrice(id);
      if (cached !== null) {
        results[id] = cached;
      }
    }

    if (uncached.length === 0) {
      return results;
    }

    try {
      await this.rateLimiter.acquire();

      const ids = uncached.join(',');
      const response = await fetch(
        `${COINGECKO_API_BASE}/simple/price?ids=${ids}&vs_currencies=usd`,
        {
          headers: {
            'Accept': 'application/json',
          },
        }
      );

      if (!response.ok) {
        if (response.status === 429) {
          console.warn('CoinGecko rate limit hit');
          return results;
        }
        throw new Error(`CoinGecko API error: ${response.status}`);
      }

      const data = await response.json();

      for (const id of uncached) {
        const price = data[id]?.usd;
        if (price !== undefined) {
          this.setCachedPrice(id, price);
          results[id] = price;
        }
      }

      return results;
    } catch (error) {
      console.error('Error fetching batch CoinGecko prices:', error);
      return results;
    }
  }

  /**
   * Clear the price cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

export const coinGeckoPriceFetcher = new CoinGeckoPriceFetcher();
