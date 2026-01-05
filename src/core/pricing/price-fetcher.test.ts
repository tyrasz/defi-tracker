import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { PublicClient } from 'viem';
import { priceFetcher } from './price-fetcher';
import * as chainlink from './chainlink';

// Mock the chainlink module
vi.mock('./chainlink', () => ({
  getChainlinkPrice: vi.fn(),
  hasChainlinkFeed: vi.fn(),
}));

// Mock the chain registry
vi.mock('@/chains', () => ({
  chainRegistry: {
    getClient: vi.fn(),
    getSupportedChainIds: vi.fn(() => [1]),
    getChain: vi.fn(() => ({ name: 'Ethereum' })),
  },
}));

describe('PriceFetcher', () => {
  const mockClient = {} as PublicClient;
  const mockAddress = '0x6B175474E89094C44Da98b954EedeAC495271d0F' as const;

  beforeEach(() => {
    priceFetcher.clearCache();
    vi.clearAllMocks();
  });

  describe('getPrice', () => {
    it('should fetch price from Chainlink when feed exists', async () => {
      vi.mocked(chainlink.hasChainlinkFeed).mockReturnValue(true);
      vi.mocked(chainlink.getChainlinkPrice).mockResolvedValue(2500.5);

      const result = await priceFetcher.getPrice(mockClient, mockAddress, 'ETH', 1);

      expect(result.priceUsd).toBe(2500.5);
      expect(result.source).toBe('chainlink');
      expect(result.address).toBe(mockAddress);
      expect(chainlink.getChainlinkPrice).toHaveBeenCalledWith(mockClient, 'ETH', 1);
    });

    it('should return $1 for stablecoins', async () => {
      vi.mocked(chainlink.hasChainlinkFeed).mockReturnValue(false);

      const stablecoins = ['USDC', 'USDT', 'DAI', 'FRAX', 'LUSD', 'BUSD'];

      for (let i = 0; i < stablecoins.length; i++) {
        const symbol = stablecoins[i];
        // Use different addresses to avoid cache hits
        const addr = `0x${i}B175474E89094C44Da98b954EedeAC495271d0F` as const;
        const result = await priceFetcher.getPrice(mockClient, addr, symbol, 1);
        expect(result.priceUsd).toBe(1);
        expect(result.source).toBe('dex');
      }
    });

    it('should handle ETH derivatives with premiums', async () => {
      vi.mocked(chainlink.hasChainlinkFeed).mockReturnValue(false);
      vi.mocked(chainlink.getChainlinkPrice).mockResolvedValue(2500);

      // wstETH should have 1.15x premium
      const addr1 = '0x1B175474E89094C44Da98b954EedeAC495271d0F' as const;
      const wstethResult = await priceFetcher.getPrice(mockClient, addr1, 'WSTETH', 1);
      expect(wstethResult.priceUsd).toBe(2500 * 1.15);

      // stETH should have 1.0x premium (no premium)
      const addr2 = '0x2B175474E89094C44Da98b954EedeAC495271d0F' as const;
      const stethResult = await priceFetcher.getPrice(mockClient, addr2, 'STETH', 1);
      expect(stethResult.priceUsd).toBe(2500);

      // rETH should have 1.0x premium
      const addr3 = '0x3B175474E89094C44Da98b954EedeAC495271d0F' as const;
      const rethResult = await priceFetcher.getPrice(mockClient, addr3, 'RETH', 1);
      expect(rethResult.priceUsd).toBe(2500);
    });

    it('should return 0 for unknown tokens', async () => {
      vi.mocked(chainlink.hasChainlinkFeed).mockReturnValue(false);

      const result = await priceFetcher.getPrice(mockClient, mockAddress, 'UNKNOWN', 1);

      expect(result.priceUsd).toBe(0);
      expect(result.source).toBe('dex');
    });

    it('should handle Chainlink fetch errors gracefully', async () => {
      vi.mocked(chainlink.hasChainlinkFeed).mockReturnValue(true);
      vi.mocked(chainlink.getChainlinkPrice).mockResolvedValue(null);

      const result = await priceFetcher.getPrice(mockClient, mockAddress, 'ETH', 1);

      expect(result.priceUsd).toBe(0);
    });
  });

  describe('cache behavior', () => {
    it('should cache prices on first fetch', async () => {
      vi.mocked(chainlink.hasChainlinkFeed).mockReturnValue(true);
      vi.mocked(chainlink.getChainlinkPrice).mockResolvedValue(2500);

      const result1 = await priceFetcher.getPrice(mockClient, mockAddress, 'ETH', 1);
      expect(result1.priceUsd).toBe(2500);
      expect(result1.source).toBe('chainlink');

      // Second call should hit cache
      const result2 = await priceFetcher.getPrice(mockClient, mockAddress, 'ETH', 1);
      expect(result2.priceUsd).toBe(2500);
      expect(result2.source).toBe('cache');

      // Chainlink should only be called once
      expect(chainlink.getChainlinkPrice).toHaveBeenCalledTimes(1);
    });

    it('should use different cache keys for different chains', async () => {
      vi.mocked(chainlink.hasChainlinkFeed).mockReturnValue(true);
      vi.mocked(chainlink.getChainlinkPrice)
        .mockResolvedValueOnce(2500) // Mainnet price
        .mockResolvedValueOnce(2501); // Arbitrum price

      const mainnetResult = await priceFetcher.getPrice(mockClient, mockAddress, 'ETH', 1);
      const arbitrumResult = await priceFetcher.getPrice(mockClient, mockAddress, 'ETH', 42161);

      expect(mainnetResult.priceUsd).toBe(2500);
      expect(arbitrumResult.priceUsd).toBe(2501);
      expect(chainlink.getChainlinkPrice).toHaveBeenCalledTimes(2);
    });

    it('should use different cache keys for different addresses', async () => {
      const address1 = '0x6B175474E89094C44Da98b954EedeAC495271d0F' as const;
      const address2 = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as const;

      vi.mocked(chainlink.hasChainlinkFeed).mockReturnValue(true);
      vi.mocked(chainlink.getChainlinkPrice)
        .mockResolvedValueOnce(1) // DAI price
        .mockResolvedValueOnce(1); // USDC price

      await priceFetcher.getPrice(mockClient, address1, 'DAI', 1);
      await priceFetcher.getPrice(mockClient, address2, 'USDC', 1);

      expect(chainlink.getChainlinkPrice).toHaveBeenCalledTimes(2);
    });

    it('should cache stablecoin prices', async () => {
      vi.mocked(chainlink.hasChainlinkFeed).mockReturnValue(false);

      const result1 = await priceFetcher.getPrice(mockClient, mockAddress, 'USDC', 1);
      const result2 = await priceFetcher.getPrice(mockClient, mockAddress, 'USDC', 1);

      expect(result1.priceUsd).toBe(1);
      expect(result2.source).toBe('cache');
    });

    it('should clear all cache entries', async () => {
      vi.mocked(chainlink.hasChainlinkFeed).mockReturnValue(true);
      vi.mocked(chainlink.getChainlinkPrice).mockResolvedValue(2500);

      await priceFetcher.getPrice(mockClient, mockAddress, 'ETH', 1);

      priceFetcher.clearCache();

      await priceFetcher.getPrice(mockClient, mockAddress, 'ETH', 1);

      // Should be called twice (before and after clear)
      expect(chainlink.getChainlinkPrice).toHaveBeenCalledTimes(2);
    });
  });

  describe('enrichPositionsWithPrices', () => {
    beforeEach(() => {
      vi.mocked(chainlink.hasChainlinkFeed).mockReturnValue(true);
      vi.mocked(chainlink.getChainlinkPrice).mockResolvedValue(2000);
    });

    it('should enrich single position with price data', async () => {
      const positions = [
        {
          id: 'test-1',
          protocol: { id: 'aave-v3', name: 'Aave V3', category: 'lending', website: '' },
          chainId: 1,
          type: 'supply' as const,
          tokens: [
            {
              address: mockAddress,
              symbol: 'ETH',
              decimals: 18,
              balance: 1000000000000000000n,
              balanceFormatted: '1.0',
              priceUsd: 0,
              valueUsd: 0,
            },
          ],
          valueUsd: 0,
        },
      ];

      await priceFetcher.enrichPositionsWithPrices(positions);

      expect(positions[0].tokens[0].priceUsd).toBe(2000);
      expect(positions[0].tokens[0].valueUsd).toBe(2000); // 1.0 ETH * $2000
      expect(positions[0].valueUsd).toBe(2000);
    });

    it('should enrich positions with multiple tokens', async () => {
      vi.mocked(chainlink.getChainlinkPrice)
        .mockResolvedValueOnce(2000) // ETH
        .mockResolvedValueOnce(1); // DAI

      const positions = [
        {
          id: 'test-1',
          protocol: { id: 'uniswap-v3', name: 'Uniswap V3', category: 'dex', website: '' },
          chainId: 1,
          type: 'liquidity' as const,
          tokens: [
            {
              address: '0x0000000000000000000000000000000000000001' as const,
              symbol: 'ETH',
              decimals: 18,
              balance: 1000000000000000000n,
              balanceFormatted: '1.0',
              priceUsd: 0,
              valueUsd: 0,
            },
            {
              address: '0x6B175474E89094C44Da98b954EedeAC495271d0F' as const,
              symbol: 'DAI',
              decimals: 18,
              balance: 3000000000000000000000n,
              balanceFormatted: '3000.0',
              priceUsd: 0,
              valueUsd: 0,
            },
          ],
          valueUsd: 0,
        },
      ];

      await priceFetcher.enrichPositionsWithPrices(positions);

      expect(positions[0].tokens[0].priceUsd).toBe(2000);
      expect(positions[0].tokens[0].valueUsd).toBe(2000);
      expect(positions[0].tokens[1].priceUsd).toBe(1);
      expect(positions[0].tokens[1].valueUsd).toBe(3000);
      expect(positions[0].valueUsd).toBe(5000); // 2000 + 3000
    });

    it('should enrich multiple positions across different chains', async () => {
      vi.mocked(chainlink.getChainlinkPrice).mockResolvedValue(2000);

      const positions = [
        {
          id: 'test-1',
          protocol: { id: 'aave-v3', name: 'Aave V3', category: 'lending', website: '' },
          chainId: 1,
          type: 'supply' as const,
          tokens: [
            {
              address: mockAddress,
              symbol: 'ETH',
              decimals: 18,
              balance: 1000000000000000000n,
              balanceFormatted: '1.0',
              priceUsd: 0,
              valueUsd: 0,
            },
          ],
          valueUsd: 0,
        },
        {
          id: 'test-2',
          protocol: { id: 'aave-v3', name: 'Aave V3', category: 'lending', website: '' },
          chainId: 42161,
          type: 'supply' as const,
          tokens: [
            {
              address: mockAddress,
              symbol: 'ETH',
              decimals: 18,
              balance: 2000000000000000000n,
              balanceFormatted: '2.0',
              priceUsd: 0,
              valueUsd: 0,
            },
          ],
          valueUsd: 0,
        },
      ];

      await priceFetcher.enrichPositionsWithPrices(positions);

      expect(positions[0].valueUsd).toBe(2000);
      expect(positions[1].valueUsd).toBe(4000);
    });

    it('should handle empty positions array', async () => {
      const positions: any[] = [];
      await priceFetcher.enrichPositionsWithPrices(positions);
      expect(positions).toEqual([]);
    });
  });
});
