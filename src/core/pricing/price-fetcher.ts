import type { Address, PublicClient } from 'viem';
import type { ChainId } from '@/types/chain';
import type { Position } from '@/types/portfolio';
import type { TokenPrice } from '@/types/token';
import { chainRegistry } from '@/chains';
import { getChainlinkPrice, hasChainlinkFeed } from './chainlink';

// Price cache with TTL
interface CachedPrice {
  price: number;
  timestamp: number;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

class PriceFetcher {
  private cache: Map<string, CachedPrice> = new Map();

  private getCacheKey(address: Address, chainId: ChainId): string {
    return `${chainId}-${address.toLowerCase()}`;
  }

  private getCachedPrice(address: Address, chainId: ChainId): number | null {
    const key = this.getCacheKey(address, chainId);
    const cached = this.cache.get(key);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.price;
    }

    return null;
  }

  private setCachedPrice(
    address: Address,
    chainId: ChainId,
    price: number
  ): void {
    const key = this.getCacheKey(address, chainId);
    this.cache.set(key, { price, timestamp: Date.now() });
  }

  async getPrice(
    client: PublicClient,
    address: Address,
    symbol: string,
    chainId: ChainId
  ): Promise<TokenPrice> {
    // Check cache first
    const cachedPrice = this.getCachedPrice(address, chainId);
    if (cachedPrice !== null) {
      return {
        address,
        priceUsd: cachedPrice,
        source: 'cache',
        updatedAt: Date.now(),
      };
    }

    // Try Chainlink first
    if (hasChainlinkFeed(symbol, chainId)) {
      const price = await getChainlinkPrice(client, symbol, chainId);
      if (price !== null) {
        this.setCachedPrice(address, chainId, price);
        return {
          address,
          priceUsd: price,
          source: 'chainlink',
          updatedAt: Date.now(),
        };
      }
    }

    // Handle stablecoins with assumed $1 price
    const stablecoins = ['USDC', 'USDT', 'DAI', 'FRAX', 'LUSD', 'BUSD', 'USDS', 'USDE'];
    if (stablecoins.includes(symbol.toUpperCase())) {
      this.setCachedPrice(address, chainId, 1);
      return {
        address,
        priceUsd: 1,
        source: 'dex',
        updatedAt: Date.now(),
      };
    }

    // Handle ETH derivatives
    const ethSymbol = symbol.toUpperCase();
    if (['STETH', 'WSTETH', 'RETH', 'CBETH'].includes(ethSymbol)) {
      // Get ETH price and apply slight premium
      const ethPrice = await getChainlinkPrice(client, 'ETH', chainId);
      if (ethPrice !== null) {
        // LSTs typically trade at slight premium to ETH
        const premium = ethSymbol === 'WSTETH' ? 1.15 : 1.0;
        const price = ethPrice * premium;
        this.setCachedPrice(address, chainId, price);
        return {
          address,
          priceUsd: price,
          source: 'dex',
          updatedAt: Date.now(),
        };
      }
    }

    // Fallback: return 0 (price unknown)
    return {
      address,
      priceUsd: 0,
      source: 'dex',
      updatedAt: Date.now(),
    };
  }

  async enrichPositionsWithPrices(positions: Position[]): Promise<void> {
    // Group positions by chain for efficient RPC usage
    const positionsByChain = new Map<ChainId, Position[]>();

    for (const position of positions) {
      const existing = positionsByChain.get(position.chainId) || [];
      existing.push(position);
      positionsByChain.set(position.chainId, existing);
    }

    // Process each chain
    for (const [chainId, chainPositions] of positionsByChain) {
      const client = chainRegistry.getClient(chainId);

      for (const position of chainPositions) {
        let totalValueUsd = 0;

        for (const token of position.tokens) {
          const tokenPrice = await this.getPrice(
            client,
            token.address,
            token.symbol,
            chainId
          );

          token.priceUsd = tokenPrice.priceUsd;
          token.valueUsd =
            parseFloat(token.balanceFormatted) * tokenPrice.priceUsd;
          totalValueUsd += token.valueUsd;
        }

        position.valueUsd = totalValueUsd;
      }
    }
  }

  clearCache(): void {
    this.cache.clear();
  }
}

export const priceFetcher = new PriceFetcher();
