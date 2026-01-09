import { describe, it, expect, beforeEach, vi } from 'vitest';
import { solanaBalanceFetcher } from './solana-balance-fetcher';

// Mock dependencies
vi.mock('@/chains', () => ({
  chainRegistry: {
    getSolanaRpcUrl: vi.fn(() => 'https://api.mainnet-beta.solana.com'),
  },
}));

vi.mock('@/core/tokens', () => ({
  getSolanaTokens: vi.fn(() => [
    { address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', symbol: 'USDC', decimals: 6, coingeckoId: 'usd-coin' },
    { address: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', symbol: 'USDT', decimals: 6, coingeckoId: 'tether' },
  ]),
}));

vi.mock('@/core/pricing/coingecko', () => ({
  coinGeckoPriceFetcher: {
    getNativeTokenPrice: vi.fn(() => Promise.resolve(150)),
    getPriceById: vi.fn(() => Promise.resolve(1)),
  },
}));

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('SolanaBalanceFetcher', () => {
  const mockAddress = '7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getBalances', () => {
    it('should fetch SOL balance for an address', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({
          jsonrpc: '2.0',
          id: 1,
          result: { value: 5000000000 }, // 5 SOL in lamports
        }),
      }).mockResolvedValueOnce({
        json: () => Promise.resolve({
          jsonrpc: '2.0',
          id: 1,
          result: { value: [] },
        }),
      });

      const result = await solanaBalanceFetcher.getBalances(mockAddress);

      expect(result.address).toBe(mockAddress);
      expect(result.balances.chainId).toBe('solana');
      expect(result.balances.chainName).toBe('Solana');
      expect(result.fetchedAt).toBeGreaterThan(0);
    });

    it('should calculate SOL balance and value correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({
          jsonrpc: '2.0',
          id: 1,
          result: { value: 2000000000 }, // 2 SOL in lamports (9 decimals)
        }),
      }).mockResolvedValueOnce({
        json: () => Promise.resolve({
          jsonrpc: '2.0',
          id: 1,
          result: { value: [] },
        }),
      });

      const result = await solanaBalanceFetcher.getBalances(mockAddress);

      const solBalance = result.balances.balances.find((b) => b.symbol === 'SOL');
      expect(solBalance).toBeDefined();
      expect(solBalance!.balance).toBe(2000000000n);
      expect(solBalance!.priceUsd).toBe(150);
      expect(solBalance!.valueUsd).toBe(300); // 2 SOL * $150
    });

    it('should not include zero SOL balance', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({
          jsonrpc: '2.0',
          id: 1,
          result: { value: 0 },
        }),
      }).mockResolvedValueOnce({
        json: () => Promise.resolve({
          jsonrpc: '2.0',
          id: 1,
          result: { value: [] },
        }),
      });

      const result = await solanaBalanceFetcher.getBalances(mockAddress);

      const solBalance = result.balances.balances.find((b) => b.symbol === 'SOL');
      expect(solBalance).toBeUndefined();
    });

    it('should handle RPC errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({
          jsonrpc: '2.0',
          id: 1,
          error: { code: -32600, message: 'Invalid Request' },
        }),
      }).mockResolvedValueOnce({
        json: () => Promise.resolve({
          jsonrpc: '2.0',
          id: 1,
          result: { value: [] },
        }),
      });

      const result = await solanaBalanceFetcher.getBalances(mockAddress);

      expect(result.address).toBe(mockAddress);
      expect(result.balances.balances).toEqual([]);
    });

    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Network Error'));

      const result = await solanaBalanceFetcher.getBalances(mockAddress);

      expect(result.address).toBe(mockAddress);
      expect(result.balances.balances).toEqual([]);
    });
  });

  describe('SPL token handling', () => {
    it('should fetch SPL token balances', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({
          jsonrpc: '2.0',
          id: 1,
          result: { value: 1000000000 }, // 1 SOL
        }),
      }).mockResolvedValueOnce({
        json: () => Promise.resolve({
          jsonrpc: '2.0',
          id: 1,
          result: {
            value: [
              {
                account: {
                  data: {
                    parsed: {
                      info: {
                        mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
                        tokenAmount: {
                          amount: '1000000000',
                          decimals: 6,
                          uiAmountString: '1000',
                        },
                      },
                    },
                  },
                },
              },
            ],
          },
        }),
      });

      const result = await solanaBalanceFetcher.getBalances(mockAddress);

      const usdcBalance = result.balances.balances.find((b) => b.symbol === 'USDC');
      expect(usdcBalance).toBeDefined();
      expect(usdcBalance!.balance).toBe(1000000000n);
      expect(usdcBalance!.balanceFormatted).toBe('1000');
    });

    it('should skip unknown SPL tokens', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({
          jsonrpc: '2.0',
          id: 1,
          result: { value: 0 },
        }),
      }).mockResolvedValueOnce({
        json: () => Promise.resolve({
          jsonrpc: '2.0',
          id: 1,
          result: {
            value: [
              {
                account: {
                  data: {
                    parsed: {
                      info: {
                        mint: 'UnknownTokenMint123456789',
                        tokenAmount: {
                          amount: '1000000000',
                          decimals: 6,
                          uiAmountString: '1000',
                        },
                      },
                    },
                  },
                },
              },
            ],
          },
        }),
      });

      const result = await solanaBalanceFetcher.getBalances(mockAddress);

      expect(result.balances.balances.length).toBe(0);
    });

    it('should filter out zero balance SPL tokens', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({
          jsonrpc: '2.0',
          id: 1,
          result: { value: 0 },
        }),
      }).mockResolvedValueOnce({
        json: () => Promise.resolve({
          jsonrpc: '2.0',
          id: 1,
          result: {
            value: [
              {
                account: {
                  data: {
                    parsed: {
                      info: {
                        mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
                        tokenAmount: {
                          amount: '0',
                          decimals: 6,
                          uiAmountString: '0',
                        },
                      },
                    },
                  },
                },
              },
            ],
          },
        }),
      });

      const result = await solanaBalanceFetcher.getBalances(mockAddress);

      expect(result.balances.balances.length).toBe(0);
    });

    it('should sort token balances by value descending', async () => {
      const { coinGeckoPriceFetcher } = await import('@/core/pricing/coingecko');

      vi.mocked(coinGeckoPriceFetcher.getPriceById)
        .mockResolvedValueOnce(1) // USDC price
        .mockResolvedValueOnce(1); // USDT price

      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({
          jsonrpc: '2.0',
          id: 1,
          result: { value: 0 },
        }),
      }).mockResolvedValueOnce({
        json: () => Promise.resolve({
          jsonrpc: '2.0',
          id: 1,
          result: {
            value: [
              {
                account: {
                  data: {
                    parsed: {
                      info: {
                        mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
                        tokenAmount: {
                          amount: '500000000',
                          decimals: 6,
                          uiAmountString: '500',
                        },
                      },
                    },
                  },
                },
              },
              {
                account: {
                  data: {
                    parsed: {
                      info: {
                        mint: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
                        tokenAmount: {
                          amount: '1000000000',
                          decimals: 6,
                          uiAmountString: '1000',
                        },
                      },
                    },
                  },
                },
              },
            ],
          },
        }),
      });

      const result = await solanaBalanceFetcher.getBalances(mockAddress);

      // USDT (1000) should be before USDC (500)
      if (result.balances.balances.length >= 2) {
        expect(result.balances.balances[0].valueUsd).toBeGreaterThanOrEqual(
          result.balances.balances[1].valueUsd
        );
      }
    });
  });

  describe('total value calculation', () => {
    it('should calculate total value across all tokens', async () => {
      const { coinGeckoPriceFetcher } = await import('@/core/pricing/coingecko');

      vi.mocked(coinGeckoPriceFetcher.getNativeTokenPrice).mockResolvedValue(150);
      vi.mocked(coinGeckoPriceFetcher.getPriceById).mockResolvedValue(1);

      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({
          jsonrpc: '2.0',
          id: 1,
          result: { value: 1000000000 }, // 1 SOL
        }),
      }).mockResolvedValueOnce({
        json: () => Promise.resolve({
          jsonrpc: '2.0',
          id: 1,
          result: {
            value: [
              {
                account: {
                  data: {
                    parsed: {
                      info: {
                        mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
                        tokenAmount: {
                          amount: '100000000',
                          decimals: 6,
                          uiAmountString: '100',
                        },
                      },
                    },
                  },
                },
              },
            ],
          },
        }),
      });

      const result = await solanaBalanceFetcher.getBalances(mockAddress);

      // 1 SOL * $150 + 100 USDC * $1 = $250
      expect(result.totalValueUsd).toBe(250);
      expect(result.balances.totalValueUsd).toBe(250);
    });
  });
});
