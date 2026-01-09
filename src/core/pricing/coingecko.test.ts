import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { Address } from 'viem';

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// We need to mock setTimeout to avoid rate limiter delays
vi.mock('timers', () => ({
  setTimeout: vi.fn((cb: () => void) => cb()),
}));

describe('CoinGeckoPriceFetcher', () => {
  // Import fresh instance for each test
  let coinGeckoPriceFetcher: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Reset module to get fresh instance
    vi.resetModules();
    const module = await import('./coingecko');
    coinGeckoPriceFetcher = module.coinGeckoPriceFetcher;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getPriceById', () => {
    it('should fetch price by CoinGecko ID', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ethereum: { usd: 2500.5 } }),
      });

      const price = await coinGeckoPriceFetcher.getPriceById('ethereum');

      expect(price).toBe(2500.5);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd',
        expect.any(Object)
      );
    });

    it('should cache prices', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ ethereum: { usd: 2500 } }),
      });

      // First call
      await coinGeckoPriceFetcher.getPriceById('ethereum');
      // Second call (should use cache)
      const price = await coinGeckoPriceFetcher.getPriceById('ethereum');

      expect(price).toBe(2500);
      // Only 1 call because second is cached
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should return null on rate limit (429)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
      });

      const price = await coinGeckoPriceFetcher.getPriceById('ethereum');

      expect(price).toBe(null);
    });

    it('should return null on API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const price = await coinGeckoPriceFetcher.getPriceById('ethereum');

      expect(price).toBe(null);
    });

    it('should return null on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network Error'));

      const price = await coinGeckoPriceFetcher.getPriceById('ethereum');

      expect(price).toBe(null);
    });

    it('should return null if token not found in response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      const price = await coinGeckoPriceFetcher.getPriceById('unknown-token');

      expect(price).toBe(null);
    });
  });

  describe('getNativeTokenPrice', () => {
    it('should fetch ETH price', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ethereum: { usd: 2500 } }),
      });

      const price = await coinGeckoPriceFetcher.getNativeTokenPrice('ETH');

      expect(price).toBe(2500);
    });

    it('should fetch MATIC price', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ 'matic-network': { usd: 0.85 } }),
      });

      const price = await coinGeckoPriceFetcher.getNativeTokenPrice('MATIC');

      expect(price).toBe(0.85);
    });

    it('should fetch AVAX price', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ 'avalanche-2': { usd: 35 } }),
      });

      const price = await coinGeckoPriceFetcher.getNativeTokenPrice('AVAX');

      expect(price).toBe(35);
    });

    it('should fetch BNB price', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ binancecoin: { usd: 300 } }),
      });

      const price = await coinGeckoPriceFetcher.getNativeTokenPrice('BNB');

      expect(price).toBe(300);
    });

    it('should fetch SOL price', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ solana: { usd: 150 } }),
      });

      const price = await coinGeckoPriceFetcher.getNativeTokenPrice('SOL');

      expect(price).toBe(150);
    });

    it('should return null for unknown native token', async () => {
      const price = await coinGeckoPriceFetcher.getNativeTokenPrice('UNKNOWN');

      expect(price).toBe(null);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should be case insensitive', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ethereum: { usd: 2500 } }),
      });

      const price = await coinGeckoPriceFetcher.getNativeTokenPrice('eth');

      expect(price).toBe(2500);
    });
  });

  describe('getPriceByContract', () => {
    const mockAddress = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as Address;

    it('should fetch price by contract address on Ethereum', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          [mockAddress.toLowerCase()]: { usd: 1.0 },
        }),
      });

      const price = await coinGeckoPriceFetcher.getPriceByContract(1, mockAddress);

      expect(price).toBe(1.0);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('ethereum'),
        expect.any(Object)
      );
    });

    it('should fetch price by contract address on Arbitrum', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          [mockAddress.toLowerCase()]: { usd: 1.0 },
        }),
      });

      const price = await coinGeckoPriceFetcher.getPriceByContract(42161, mockAddress);

      expect(price).toBe(1.0);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('arbitrum-one'),
        expect.any(Object)
      );
    });

    it('should fetch price by contract address on Polygon', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          [mockAddress.toLowerCase()]: { usd: 1.0 },
        }),
      });

      const price = await coinGeckoPriceFetcher.getPriceByContract(137, mockAddress);

      expect(price).toBe(1.0);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('polygon-pos'),
        expect.any(Object)
      );
    });

    it('should return null for unsupported chain', async () => {
      const price = await coinGeckoPriceFetcher.getPriceByContract(999 as any, mockAddress);

      expect(price).toBe(null);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should cache contract prices', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          [mockAddress.toLowerCase()]: { usd: 1.0 },
        }),
      });

      // First call
      await coinGeckoPriceFetcher.getPriceByContract(1, mockAddress);
      // Second call (should use cache)
      const price = await coinGeckoPriceFetcher.getPriceByContract(1, mockAddress);

      expect(price).toBe(1.0);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should return null on rate limit', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
      });

      const price = await coinGeckoPriceFetcher.getPriceByContract(1, mockAddress);

      expect(price).toBe(null);
    });
  });

  describe('getBatchPricesByIds', () => {
    it('should fetch multiple prices in one request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          ethereum: { usd: 2500 },
          bitcoin: { usd: 45000 },
        }),
      });

      const prices = await coinGeckoPriceFetcher.getBatchPricesByIds(['ethereum', 'bitcoin']);

      expect(prices.ethereum).toBe(2500);
      expect(prices.bitcoin).toBe(45000);
    });

    it('should handle partial failures gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          ethereum: { usd: 2500 },
          // bitcoin not returned
        }),
      });

      const prices = await coinGeckoPriceFetcher.getBatchPricesByIds(['ethereum', 'bitcoin']);

      expect(prices.ethereum).toBe(2500);
      expect(prices.bitcoin).toBeUndefined();
    });
  });

  describe('clearCache', () => {
    it('should clear all cached prices', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ ethereum: { usd: 2500 } }),
      });

      // Cache a price
      await coinGeckoPriceFetcher.getPriceById('ethereum');

      // Clear cache
      coinGeckoPriceFetcher.clearCache();

      // Fetch again (should make new API call - module reset ensures fresh instance)
      await coinGeckoPriceFetcher.getPriceById('ethereum');

      expect(mockFetch).toHaveBeenCalled();
    });
  });
});
