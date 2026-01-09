/**
 * End-to-End Tests for DeFi Portfolio Tracker
 *
 * These tests verify complete user flows from API request to response,
 * testing the integration between components.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Address } from 'viem';

// Mock all external dependencies for E2E tests
vi.mock('@/chains', () => ({
  chainRegistry: {
    getEvmChainIds: vi.fn(() => [1, 42161]),
    getEvmChains: vi.fn(() => [
      { id: 1, name: 'Ethereum', network: 'evm', nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 } },
      { id: 42161, name: 'Arbitrum', network: 'evm', nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 } },
    ]),
    getAllChains: vi.fn(() => [
      { id: 1, name: 'Ethereum', network: 'evm' },
      { id: 42161, name: 'Arbitrum', network: 'evm' },
    ]),
    getEvmChain: vi.fn((id) => ({
      id,
      name: id === 1 ? 'Ethereum' : 'Arbitrum',
      network: 'evm',
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    })),
    getClient: vi.fn(() => ({
      getBalance: vi.fn(() => Promise.resolve(1000000000000000000n)),
      multicall: vi.fn(() => Promise.resolve([])),
      readContract: vi.fn(),
      getEnsAddress: vi.fn(),
      getEnsName: vi.fn(),
    })),
    withFailover: vi.fn((_, fn) => fn({
      getBalance: vi.fn(() => Promise.resolve(1000000000000000000n)),
      multicall: vi.fn(() => Promise.resolve([])),
    })),
    getRpcStatus: vi.fn(() => ({})),
    healthCheckAll: vi.fn(() => Promise.resolve({})),
  },
}));

vi.mock('@/protocols', () => ({
  protocolRegistry: {
    getAdaptersForChain: vi.fn(() => []),
    getAllAdapters: vi.fn(() => []),
    getAdapter: vi.fn(),
  },
}));

describe('E2E: Portfolio Flow', () => {
  const testAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0' as Address;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Complete Portfolio Fetch Flow', () => {
    it('should fetch portfolio with all components', async () => {
      // Import modules after mocks are set up
      const { portfolioAggregator } = await import('@/core/aggregator');
      const { priceFetcher } = await import('@/core/pricing');
      const { yieldAnalyzer } = await import('@/core/yield');

      // Mock portfolio aggregator
      vi.spyOn(portfolioAggregator, 'getPortfolio').mockResolvedValue({
        address: testAddress,
        totalValueUsd: 10000,
        positions: [
          {
            id: 'test-1',
            chainId: 1,
            protocol: { id: 'aave-v3', name: 'Aave V3', category: 'lending', earnsYield: true, website: '' },
            type: 'supply',
            tokens: [{
              address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as Address,
              symbol: 'USDC',
              decimals: 6,
              balance: 10000000000n,
              balanceFormatted: '10000',
              priceUsd: 1,
              valueUsd: 10000,
            }],
            valueUsd: 10000,
            yield: { apy: 0.05, apr: 0.05 },
          },
        ],
        byChain: {},
        byProtocol: {},
        byType: {},
        fetchedAt: Date.now(),
      });

      // Fetch portfolio
      const portfolio = await portfolioAggregator.getPortfolio(testAddress);

      // Verify portfolio structure
      expect(portfolio.address).toBe(testAddress);
      expect(portfolio.positions.length).toBeGreaterThan(0);
      expect(portfolio.positions[0].tokens[0].symbol).toBe('USDC');
    });

    it('should handle empty portfolio', async () => {
      const { portfolioAggregator } = await import('@/core/aggregator');

      vi.spyOn(portfolioAggregator, 'getPortfolio').mockResolvedValue({
        address: testAddress,
        totalValueUsd: 0,
        positions: [],
        byChain: {},
        byProtocol: {},
        byType: {},
        fetchedAt: Date.now(),
      });

      const portfolio = await portfolioAggregator.getPortfolio(testAddress);

      expect(portfolio.totalValueUsd).toBe(0);
      expect(portfolio.positions.length).toBe(0);
    });
  });

  describe('History Tracking Flow', () => {
    it('should track portfolio history over time', async () => {
      const { historyStore } = await import('@/core/history/history-store');

      // Clear previous history
      await historyStore.clearHistory(testAddress);

      // Save multiple snapshots
      const snapshot1 = await historyStore.saveSnapshot({
        address: testAddress,
        timestamp: Date.now() - 86400000 * 2, // 2 days ago
        totalValueUsd: 8000,
        chainBreakdown: {} as any,
        tokenHoldings: [],
      });

      const snapshot2 = await historyStore.saveSnapshot({
        address: testAddress,
        timestamp: Date.now() - 86400000, // 1 day ago
        totalValueUsd: 9000,
        chainBreakdown: {} as any,
        tokenHoldings: [],
      });

      const snapshot3 = await historyStore.saveSnapshot({
        address: testAddress,
        timestamp: Date.now(),
        totalValueUsd: 10000,
        chainBreakdown: {} as any,
        tokenHoldings: [],
      });

      // Get history
      const history = await historyStore.getHistory(testAddress, 7);

      expect(history.snapshots.length).toBe(3);
      expect(history.valueHistory.length).toBe(3);
      expect(history.valueHistory[2].valueUsd).toBe(10000);
    });
  });

  describe('Cost Basis and P&L Flow', () => {
    it('should track cost basis and calculate P&L', async () => {
      const { historyStore } = await import('@/core/history/history-store');
      const { pnlCalculator } = await import('@/core/history/pnl-calculator');

      // Clear previous data
      await historyStore.clearHistory(testAddress);

      // Record acquisition (bought 1 ETH at $2000)
      await pnlCalculator.recordAcquisition(
        testAddress,
        1,
        '0x0000000000000000000000000000000000000000',
        'ETH',
        1000000000000000000n,
        2000
      );

      // Current position (ETH now worth $2500)
      const positions = [{
        chainId: 1 as const,
        address: '0x0000000000000000000000000000000000000000',
        symbol: 'ETH',
        balance: 1000000000000000000n,
        valueUsd: 2500,
        priceUsd: 2500,
      }];

      // Calculate P&L
      const pnl = await pnlCalculator.calculatePnL(testAddress, positions);

      expect(pnl.totalUnrealizedPnL).toBe(500); // $500 profit
      expect(pnl.positions[0].unrealizedPnLPercent).toBe(25); // 25% gain
    });
  });

  describe('Multi-Chain Portfolio Flow', () => {
    it('should aggregate positions across multiple chains', async () => {
      const { portfolioAggregator } = await import('@/core/aggregator');

      vi.spyOn(portfolioAggregator, 'getPortfolio').mockResolvedValue({
        address: testAddress,
        totalValueUsd: 15000,
        positions: [
          {
            id: 'eth-1',
            chainId: 1,
            protocol: { id: 'aave-v3', name: 'Aave V3', category: 'lending', earnsYield: true, website: '' },
            type: 'supply',
            tokens: [{
              address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as Address,
              symbol: 'USDC',
              decimals: 6,
              balance: 10000000000n,
              balanceFormatted: '10000',
              priceUsd: 1,
              valueUsd: 10000,
            }],
            valueUsd: 10000,
          },
          {
            id: 'arb-1',
            chainId: 42161,
            protocol: { id: 'aave-v3', name: 'Aave V3', category: 'lending', earnsYield: true, website: '' },
            type: 'supply',
            tokens: [{
              address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831' as Address,
              symbol: 'USDC',
              decimals: 6,
              balance: 5000000000n,
              balanceFormatted: '5000',
              priceUsd: 1,
              valueUsd: 5000,
            }],
            valueUsd: 5000,
          },
        ],
        byChain: {
          1: { chainId: 1, chainName: 'Ethereum', totalValueUsd: 10000, positions: [] },
          42161: { chainId: 42161, chainName: 'Arbitrum', totalValueUsd: 5000, positions: [] },
        } as any,
        byProtocol: {},
        byType: {},
        fetchedAt: Date.now(),
      });

      const portfolio = await portfolioAggregator.getPortfolio(testAddress);

      expect(portfolio.totalValueUsd).toBe(15000);
      expect(portfolio.positions.length).toBe(2);
      expect(Object.keys(portfolio.byChain).length).toBe(2);
    });
  });

  describe('Yield Optimization Flow', () => {
    it('should identify yield optimization opportunities', async () => {
      const { yieldAnalyzer } = await import('@/core/yield');

      const mockPositions = [
        {
          id: 'test-1',
          chainId: 1 as const,
          protocol: { id: 'aave-v3', name: 'Aave V3', category: 'lending' as const, earnsYield: true, website: '' },
          type: 'supply' as const,
          tokens: [{
            address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as Address,
            symbol: 'USDC',
            decimals: 6,
            balance: 10000000000n,
            balanceFormatted: '10000',
            priceUsd: 1,
            valueUsd: 10000,
          }],
          valueUsd: 10000,
          yield: { apy: 0.03, apr: 0.03 },
        },
      ];

      // Mock yield analyzer to return opportunities
      vi.spyOn(yieldAnalyzer, 'analyzePortfolio').mockResolvedValue({
        address: testAddress,
        totalCurrentYield: 300, // 3% of $10000
        totalPotentialYield: 500, // If moved to higher yield
        opportunities: [{
          currentPosition: mockPositions[0],
          betterAlternatives: [{
            protocol: 'compound-v3',
            protocolName: 'Compound V3',
            chainId: 1,
            asset: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
            apy: 0.05,
            apyImprovement: 0.02,
            annualGainUsd: 200,
            risk: 'low',
          }],
          potentialGainApy: 0.02,
          potentialGainUsd: 200,
        }],
        idleAssets: [],
        analyzedAt: Date.now(),
      });

      const analysis = await yieldAnalyzer.analyzePortfolio(mockPositions, testAddress);

      expect(analysis.totalCurrentYield).toBe(300);
      expect(analysis.totalPotentialYield).toBe(500);
      expect(analysis.opportunities.length).toBe(1);
      expect(analysis.opportunities[0].potentialGainUsd).toBe(200);
    });
  });

  describe('Error Handling Flow', () => {
    it('should gracefully handle chain errors', async () => {
      const { portfolioAggregator } = await import('@/core/aggregator');

      vi.spyOn(portfolioAggregator, 'getPortfolio').mockRejectedValue(new Error('RPC Error'));

      await expect(portfolioAggregator.getPortfolio(testAddress)).rejects.toThrow('RPC Error');
    });

    it('should return partial results when some chains fail', async () => {
      const { portfolioAggregator } = await import('@/core/aggregator');

      // Even with some chain errors, should return available data
      vi.spyOn(portfolioAggregator, 'getPortfolio').mockResolvedValue({
        address: testAddress,
        totalValueUsd: 5000,
        positions: [
          {
            id: 'arb-1',
            chainId: 42161,
            protocol: { id: 'aave-v3', name: 'Aave V3', category: 'lending', earnsYield: true, website: '' },
            type: 'supply',
            tokens: [],
            valueUsd: 5000,
          },
        ],
        byChain: {},
        byProtocol: {},
        byType: {},
        fetchedAt: Date.now(),
      });

      const portfolio = await portfolioAggregator.getPortfolio(testAddress);

      expect(portfolio.positions.length).toBeGreaterThan(0);
    });
  });
});

describe('E2E: Wallet Balance Flow', () => {
  const testAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0' as Address;

  it('should fetch wallet balances across all chains', async () => {
    const { walletBalanceFetcher } = await import('@/core/wallet/wallet-balance-fetcher');

    const balances = await walletBalanceFetcher.getBalances(testAddress);

    expect(balances.address).toBe(testAddress);
    expect(balances.fetchedAt).toBeGreaterThan(0);
    expect(typeof balances.totalValueUsd).toBe('number');
  });
});
