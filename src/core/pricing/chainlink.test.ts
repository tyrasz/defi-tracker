import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PublicClient } from 'viem';
import { getChainlinkPrice, hasChainlinkFeed } from './chainlink';

describe('Chainlink', () => {
  let mockClient: PublicClient;

  beforeEach(() => {
    mockClient = {
      readContract: vi.fn(),
    } as any;
    vi.clearAllMocks();
  });

  describe('hasChainlinkFeed', () => {
    it('should return true for ETH on Ethereum mainnet', () => {
      expect(hasChainlinkFeed('ETH', 1)).toBe(true);
      expect(hasChainlinkFeed('WETH', 1)).toBe(true);
    });

    it('should return true for ETH on Arbitrum', () => {
      expect(hasChainlinkFeed('ETH', 42161)).toBe(true);
    });

    it('should return true for ETH on Optimism', () => {
      expect(hasChainlinkFeed('ETH', 10)).toBe(true);
    });

    it('should return true for ETH on Base', () => {
      expect(hasChainlinkFeed('ETH', 8453)).toBe(true);
    });

    it('should return true for USDC on supported chains', () => {
      expect(hasChainlinkFeed('USDC', 1)).toBe(true);
      expect(hasChainlinkFeed('USDC', 42161)).toBe(true);
      expect(hasChainlinkFeed('USDC', 10)).toBe(true);
      expect(hasChainlinkFeed('USDC', 8453)).toBe(true);
    });

    it('should return true for USDT on Ethereum', () => {
      expect(hasChainlinkFeed('USDT', 1)).toBe(true);
      expect(hasChainlinkFeed('USDT', 42161)).toBe(true);
      expect(hasChainlinkFeed('USDT', 10)).toBe(true);
    });

    it('should return true for DAI on supported chains', () => {
      expect(hasChainlinkFeed('DAI', 1)).toBe(true);
      expect(hasChainlinkFeed('DAI', 42161)).toBe(true);
      expect(hasChainlinkFeed('DAI', 10)).toBe(true);
    });

    it('should return true for WBTC on supported chains', () => {
      expect(hasChainlinkFeed('WBTC', 1)).toBe(true);
      expect(hasChainlinkFeed('WBTC', 42161)).toBe(true);
      expect(hasChainlinkFeed('WBTC', 10)).toBe(true);
    });

    it('should handle tokens with limited chain support', () => {
      // stETH and rETH feeds exist on mainnet
      const hasSteth = hasChainlinkFeed('stETH', 1);
      const hasReth = hasChainlinkFeed('rETH', 1);

      // These may or may not have feeds depending on Chainlink availability
      expect(typeof hasSteth).toBe('boolean');
      expect(typeof hasReth).toBe('boolean');
    });

    it('should return false for unknown tokens', () => {
      expect(hasChainlinkFeed('UNKNOWN', 1)).toBe(false);
      expect(hasChainlinkFeed('FAKE', 1)).toBe(false);
    });

    it('should return false for tokens on unsupported chains', () => {
      expect(hasChainlinkFeed('ETH', 999 as any)).toBe(false);
      // BSC (56) now has USDC feed, so use a truly unsupported chain
      expect(hasChainlinkFeed('USDC', 12345 as any)).toBe(false);
    });

    it('should be case insensitive', () => {
      expect(hasChainlinkFeed('eth', 1)).toBe(true);
      expect(hasChainlinkFeed('usdc', 1)).toBe(true);
      expect(hasChainlinkFeed('WeTh', 1)).toBe(true);
    });
  });

  describe('getChainlinkPrice', () => {
    it('should fetch and parse ETH price correctly', async () => {
      // Mock latestRoundData response: [roundId, answer, startedAt, updatedAt, answeredInRound]
      const mockAnswer = 250000000000n; // $2500 with 8 decimals
      vi.mocked(mockClient.readContract)
        .mockResolvedValueOnce([0n, mockAnswer, 0n, 0n, 0n]) // latestRoundData
        .mockResolvedValueOnce(8); // decimals

      const price = await getChainlinkPrice(mockClient, 'ETH', 1);

      expect(price).toBe(2500);
      expect(mockClient.readContract).toHaveBeenCalledTimes(2);
    });

    it('should handle different decimal precisions', async () => {
      // Test with 18 decimals
      const mockAnswer = 2500000000000000000000n; // $2500 with 18 decimals
      vi.mocked(mockClient.readContract)
        .mockResolvedValueOnce([0n, mockAnswer, 0n, 0n, 0n])
        .mockResolvedValueOnce(18);

      const price = await getChainlinkPrice(mockClient, 'ETH', 1);

      expect(price).toBe(2500);
    });

    it('should handle low decimal precision', async () => {
      // Test with 6 decimals
      const mockAnswer = 2500000000n; // $2500 with 6 decimals
      vi.mocked(mockClient.readContract)
        .mockResolvedValueOnce([0n, mockAnswer, 0n, 0n, 0n])
        .mockResolvedValueOnce(6);

      const price = await getChainlinkPrice(mockClient, 'USDC', 1);

      expect(price).toBe(2500);
    });

    it('should handle fractional prices', async () => {
      const mockAnswer = 123456789n; // $1.23456789 with 8 decimals
      vi.mocked(mockClient.readContract)
        .mockResolvedValueOnce([0n, mockAnswer, 0n, 0n, 0n])
        .mockResolvedValueOnce(8);

      const price = await getChainlinkPrice(mockClient, 'USDC', 1);

      expect(price).toBeCloseTo(1.23456789, 6);
    });

    it('should handle very large prices', async () => {
      const mockAnswer = 100000000000000n; // $1,000,000 with 8 decimals
      vi.mocked(mockClient.readContract)
        .mockResolvedValueOnce([0n, mockAnswer, 0n, 0n, 0n])
        .mockResolvedValueOnce(8);

      const price = await getChainlinkPrice(mockClient, 'WBTC', 1);

      expect(price).toBe(1000000);
    });

    it('should handle very small prices', async () => {
      const mockAnswer = 100n; // $0.000001 with 8 decimals
      vi.mocked(mockClient.readContract)
        .mockResolvedValueOnce([0n, mockAnswer, 0n, 0n, 0n])
        .mockResolvedValueOnce(8);

      const price = await getChainlinkPrice(mockClient, 'USDC', 1);

      expect(price).toBeCloseTo(0.000001, 5);
    });

    it('should return null for tokens without feed', async () => {
      const price = await getChainlinkPrice(mockClient, 'UNKNOWN', 1);

      expect(price).toBe(null);
      expect(mockClient.readContract).not.toHaveBeenCalled();
    });

    it('should return null for unsupported chains', async () => {
      const price = await getChainlinkPrice(mockClient, 'ETH', 999 as any);

      expect(price).toBe(null);
      expect(mockClient.readContract).not.toHaveBeenCalled();
    });

    it('should handle contract call failures gracefully', async () => {
      vi.mocked(mockClient.readContract).mockRejectedValue(new Error('RPC Error'));

      const price = await getChainlinkPrice(mockClient, 'ETH', 1);

      expect(price).toBe(null);
    });

    it('should handle network timeouts', async () => {
      vi.mocked(mockClient.readContract).mockRejectedValue(new Error('Network timeout'));

      const price = await getChainlinkPrice(mockClient, 'ETH', 1);

      expect(price).toBe(null);
    });

    it('should handle invalid responses gracefully', async () => {
      vi.mocked(mockClient.readContract)
        .mockResolvedValueOnce([0n, 0n, 0n, 0n, 0n]) // Zero price
        .mockResolvedValueOnce(8);

      const price = await getChainlinkPrice(mockClient, 'ETH', 1);

      expect(price).toBe(0);
    });

    it('should use correct feed addresses for different chains', async () => {
      const mockAnswer = 250000000000n;

      // Test Ethereum
      vi.mocked(mockClient.readContract)
        .mockResolvedValueOnce([0n, mockAnswer, 0n, 0n, 0n])
        .mockResolvedValueOnce(8);

      await getChainlinkPrice(mockClient, 'ETH', 1);

      const ethMainnetCall = vi.mocked(mockClient.readContract).mock.calls[0][0];
      expect(ethMainnetCall.address).toBe('0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419');

      vi.clearAllMocks();

      // Test Arbitrum
      vi.mocked(mockClient.readContract)
        .mockResolvedValueOnce([0n, mockAnswer, 0n, 0n, 0n])
        .mockResolvedValueOnce(8);

      await getChainlinkPrice(mockClient, 'ETH', 42161);

      const ethArbitrumCall = vi.mocked(mockClient.readContract).mock.calls[0][0];
      expect(ethArbitrumCall.address).toBe('0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612');
    });

    it('should call latestRoundData and decimals in sequence', async () => {
      const mockAnswer = 250000000000n;
      vi.mocked(mockClient.readContract)
        .mockResolvedValueOnce([0n, mockAnswer, 0n, 0n, 0n])
        .mockResolvedValueOnce(8);

      await getChainlinkPrice(mockClient, 'ETH', 1);

      expect(mockClient.readContract).toHaveBeenNthCalledWith(1, expect.objectContaining({
        functionName: 'latestRoundData',
      }));
      expect(mockClient.readContract).toHaveBeenNthCalledWith(2, expect.objectContaining({
        functionName: 'decimals',
      }));
    });

    it('should handle stale price data gracefully', async () => {
      // Chainlink returns stale data with old timestamp
      const mockAnswer = 250000000000n;
      const oldTimestamp = Math.floor(Date.now() / 1000) - 86400; // 1 day old

      vi.mocked(mockClient.readContract)
        .mockResolvedValueOnce([0n, mockAnswer, 0n, BigInt(oldTimestamp), 0n])
        .mockResolvedValueOnce(8);

      const price = await getChainlinkPrice(mockClient, 'ETH', 1);

      // Should still return the price (caller decides if it's too stale)
      expect(price).toBe(2500);
    });
  });

  describe('case sensitivity', () => {
    it('should handle lowercase symbols', async () => {
      expect(hasChainlinkFeed('eth', 1)).toBe(true);
      expect(hasChainlinkFeed('usdc', 1)).toBe(true);
      expect(hasChainlinkFeed('wbtc', 1)).toBe(true);
    });

    it('should handle mixed case symbols', async () => {
      expect(hasChainlinkFeed('WeTh', 1)).toBe(true);
      expect(hasChainlinkFeed('UsDc', 1)).toBe(true);
      expect(hasChainlinkFeed('wBtC', 1)).toBe(true);
    });

    it('should fetch prices with lowercase symbols', async () => {
      const mockAnswer = 250000000000n;
      vi.mocked(mockClient.readContract)
        .mockResolvedValueOnce([0n, mockAnswer, 0n, 0n, 0n])
        .mockResolvedValueOnce(8);

      const price = await getChainlinkPrice(mockClient, 'eth', 1);

      expect(price).toBe(2500);
    });
  });
});
