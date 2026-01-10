import { cache, CACHE_TTL } from '../cache/memory-cache';
import type { EvmChainId } from './chains';

const COINGECKO_API = 'https://api.coingecko.com/api/v3';

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

// Native token CoinGecko IDs
const NATIVE_TOKEN_IDS: Record<string, string> = {
  ETH: 'ethereum',
  MATIC: 'matic-network',
  AVAX: 'avalanche-2',
  BNB: 'binancecoin',
  SOL: 'solana',
};

// Rate limiter for CoinGecko
class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly maxTokens: number;
  private readonly refillRate: number;

  constructor(maxTokens = 10, refillRate = 0.5) {
    this.tokens = maxTokens;
    this.lastRefill = Date.now();
    this.maxTokens = maxTokens;
    this.refillRate = refillRate;
  }

  async acquire(): Promise<void> {
    this.refill();
    if (this.tokens < 1) {
      const waitTime = ((1 - this.tokens) / this.refillRate) * 1000;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
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

class PricingService {
  private rateLimiter = new RateLimiter();

  async getPriceById(coingeckoId: string): Promise<number | null> {
    const cacheKey = `price:${coingeckoId}`;
    const cached = cache.get<number>(cacheKey);
    if (cached !== null) return cached;

    try {
      await this.rateLimiter.acquire();
      const response = await fetch(
        `${COINGECKO_API}/simple/price?ids=${coingeckoId}&vs_currencies=usd`
      );

      if (!response.ok) {
        if (response.status === 429) {
          console.warn('CoinGecko rate limit hit');
          return null;
        }
        throw new Error(`CoinGecko API error: ${response.status}`);
      }

      const data = await response.json() as Record<string, { usd?: number }>;
      const price = data[coingeckoId]?.usd;

      if (price !== undefined) {
        cache.set(cacheKey, price, CACHE_TTL.PRICE);
        return price;
      }
      return null;
    } catch (error) {
      console.error(`Error fetching price for ${coingeckoId}:`, error);
      return null;
    }
  }

  async getNativeTokenPrice(symbol: string): Promise<number | null> {
    const coingeckoId = NATIVE_TOKEN_IDS[symbol.toUpperCase()];
    if (!coingeckoId) return null;
    return this.getPriceById(coingeckoId);
  }

  async getPriceByContract(
    chainId: EvmChainId,
    tokenAddress: string
  ): Promise<number | null> {
    const platform = CHAIN_TO_PLATFORM[chainId];
    if (!platform) return null;

    const cacheKey = `price:${platform}:${tokenAddress.toLowerCase()}`;
    const cached = cache.get<number>(cacheKey);
    if (cached !== null) return cached;

    try {
      await this.rateLimiter.acquire();
      const response = await fetch(
        `${COINGECKO_API}/simple/token_price/${platform}?contract_addresses=${tokenAddress}&vs_currencies=usd`
      );

      if (!response.ok) {
        if (response.status === 429) {
          console.warn('CoinGecko rate limit hit');
          return null;
        }
        throw new Error(`CoinGecko API error: ${response.status}`);
      }

      const data = await response.json() as Record<string, { usd?: number }>;
      const price = data[tokenAddress.toLowerCase()]?.usd;

      if (price !== undefined) {
        cache.set(cacheKey, price, CACHE_TTL.PRICE);
        return price;
      }
      return null;
    } catch (error) {
      console.error(`Error fetching price for ${tokenAddress}:`, error);
      return null;
    }
  }

  async getBatchPrices(coingeckoIds: string[]): Promise<Record<string, number>> {
    const results: Record<string, number> = {};
    const uncached: string[] = [];

    // Get cached prices
    for (const id of coingeckoIds) {
      const cached = cache.get<number>(`price:${id}`);
      if (cached !== null) {
        results[id] = cached;
      } else {
        uncached.push(id);
      }
    }

    if (uncached.length === 0) return results;

    try {
      await this.rateLimiter.acquire();
      const ids = uncached.join(',');
      const response = await fetch(
        `${COINGECKO_API}/simple/price?ids=${ids}&vs_currencies=usd`
      );

      if (!response.ok) {
        return results;
      }

      const data = await response.json() as Record<string, { usd?: number }>;
      for (const id of uncached) {
        const price = data[id]?.usd;
        if (price !== undefined) {
          cache.set(`price:${id}`, price, CACHE_TTL.PRICE);
          results[id] = price;
        }
      }
    } catch (error) {
      console.error('Error fetching batch prices:', error);
    }

    return results;
  }

  // Stablecoin handling
  isStablecoin(symbol: string): boolean {
    const stables = [
      'USDC', 'USDT', 'DAI', 'FRAX', 'LUSD', 'BUSD', 'USDS', 'USDE',
      'TUSD', 'USDP', 'USDC.E', 'USDBC', 'SUSD', 'SUSDE',
    ];
    return stables.includes(symbol.toUpperCase());
  }

  getStablecoinPrice(symbol: string): number {
    if (symbol.toUpperCase() === 'EURC') return 1.08;
    return 1;
  }
}

export const pricingService = new PricingService();
