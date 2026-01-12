import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Import after mocking
import { getStakingPositions } from '../src/services/solana-protocols/staking';
import { getLendingPositions } from '../src/services/solana-protocols/lending';
import { getSolanaProtocolPositions } from '../src/services/solana-protocols';
import { STAKING_TOKENS } from '../src/services/solana-protocols/types';

// Mock pricing service
vi.mock('../src/services/pricing', () => ({
  pricingService: {
    getPrice: vi.fn().mockResolvedValue(100), // Mock $100 price
  },
}));

describe('Solana Protocol Detection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('getStakingPositions', () => {
    it('detects mSOL holdings as Marinade position', async () => {
      // Mock RPC response with mSOL balance
      mockFetch.mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            result: {
              value: [
                {
                  account: {
                    data: {
                      parsed: {
                        info: {
                          mint: STAKING_TOKENS.mSOL,
                          tokenAmount: {
                            amount: '1000000000', // 1 mSOL
                            decimals: 9,
                            uiAmountString: '1.0',
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

      const positions = await getStakingPositions('TestAddress123');

      expect(positions).toHaveLength(1);
      expect(positions[0].protocol.id).toBe('marinade');
      expect(positions[0].type).toBe('stake');
      expect(positions[0].tokens[0].symbol).toBe('mSOL');
    });

    it('detects JitoSOL holdings as Jito position', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            result: {
              value: [
                {
                  account: {
                    data: {
                      parsed: {
                        info: {
                          mint: STAKING_TOKENS.JitoSOL,
                          tokenAmount: {
                            amount: '2000000000', // 2 JitoSOL
                            decimals: 9,
                            uiAmountString: '2.0',
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

      const positions = await getStakingPositions('TestAddress123');

      expect(positions).toHaveLength(1);
      expect(positions[0].protocol.id).toBe('jito');
      expect(positions[0].type).toBe('stake');
      expect(positions[0].tokens[0].symbol).toBe('JitoSOL');
    });

    it('returns empty array for wallet without LST', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            result: {
              value: [], // No token accounts
            },
          }),
      });

      const positions = await getStakingPositions('TestAddress123');

      expect(positions).toHaveLength(0);
    });

    it('handles RPC errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            error: { code: -32012, message: 'Rate limited' },
          }),
      });

      const positions = await getStakingPositions('TestAddress123');

      expect(positions).toHaveLength(0);
    });

    it('handles network failures gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const positions = await getStakingPositions('TestAddress123');

      expect(positions).toHaveLength(0);
    });
  });

  describe('getLendingPositions', () => {
    it('returns empty array when RPC hits rate limits', async () => {
      // Mock rate limit error for all lending protocols
      mockFetch.mockResolvedValue({
        json: () =>
          Promise.resolve({
            error: { code: -32012, message: 'scan aborted' },
          }),
      });

      const positions = await getLendingPositions('TestAddress123');

      expect(positions).toHaveLength(0);
    });

    it('handles empty results gracefully', async () => {
      mockFetch.mockResolvedValue({
        json: () =>
          Promise.resolve({
            result: [],
          }),
      });

      const positions = await getLendingPositions('TestAddress123');

      expect(positions).toHaveLength(0);
    });
  });

  describe('getSolanaProtocolPositions', () => {
    it('aggregates positions from all protocols', async () => {
      // Mock staking response (has mSOL)
      mockFetch.mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            result: {
              value: [
                {
                  account: {
                    data: {
                      parsed: {
                        info: {
                          mint: STAKING_TOKENS.mSOL,
                          tokenAmount: {
                            amount: '1000000000',
                            decimals: 9,
                            uiAmountString: '1.0',
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

      // Mock lending responses (empty)
      mockFetch.mockResolvedValue({
        json: () =>
          Promise.resolve({
            result: [],
          }),
      });

      const positions = await getSolanaProtocolPositions('TestAddress123');

      // Should have at least the mSOL staking position
      expect(positions.length).toBeGreaterThanOrEqual(1);
      expect(positions.some((p) => p.protocol.id === 'marinade')).toBe(true);
    });

    it('handles all protocols failing gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('All RPCs failed'));

      const positions = await getSolanaProtocolPositions('TestAddress123');

      expect(positions).toHaveLength(0);
    });
  });
});
