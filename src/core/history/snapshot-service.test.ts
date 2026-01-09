import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Address } from 'viem';
import { snapshotService } from './snapshot-service';
import { historyStore } from './history-store';

// Mock wallet balance fetcher
vi.mock('@/core/wallet/wallet-balance-fetcher', () => ({
  walletBalanceFetcher: {
    getBalances: vi.fn(() => Promise.resolve({
      address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
      balances: [
        {
          chainId: 1,
          chainName: 'Ethereum',
          balances: [
            {
              address: '0x0000000000000000000000000000000000000000',
              symbol: 'ETH',
              decimals: 18,
              balance: 1000000000000000000n,
              balanceFormatted: '1.0',
              priceUsd: 2500,
              valueUsd: 2500,
            },
          ],
          totalValueUsd: 2500,
        },
      ],
      totalValueUsd: 2500,
      fetchedAt: Date.now(),
    })),
  },
}));

describe('SnapshotService', () => {
  const mockAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0' as Address;

  beforeEach(async () => {
    vi.clearAllMocks();
    await historyStore.clearHistory(mockAddress);
  });

  describe('takeSnapshot', () => {
    it('should take a snapshot of current portfolio', async () => {
      const snapshot = await snapshotService.takeSnapshot(mockAddress);

      expect(snapshot.id).toBeDefined();
      expect(snapshot.address).toBe(mockAddress);
      expect(snapshot.totalValueUsd).toBe(2500);
      expect(snapshot.tokenHoldings.length).toBe(1);
      expect(snapshot.tokenHoldings[0].symbol).toBe('ETH');
    });

    it('should save snapshot to history store', async () => {
      await snapshotService.takeSnapshot(mockAddress);

      const latest = await historyStore.getLatestSnapshot(mockAddress);

      expect(latest).not.toBeNull();
      expect(latest!.totalValueUsd).toBe(2500);
    });

    it('should record chain breakdown', async () => {
      const snapshot = await snapshotService.takeSnapshot(mockAddress);

      expect(snapshot.chainBreakdown[1]).toBe(2500);
    });
  });

  describe('getHistory', () => {
    it('should get portfolio history', async () => {
      // Take some snapshots
      await snapshotService.takeSnapshot(mockAddress);

      const history = await snapshotService.getHistory(mockAddress, 30);

      expect(history.address).toBe(mockAddress);
      expect(history.snapshots.length).toBeGreaterThan(0);
    });

    it('should return empty history for new address', async () => {
      const newAddress = '0x1234567890123456789012345678901234567890' as Address;
      const history = await snapshotService.getHistory(newAddress, 30);

      expect(history.snapshots.length).toBe(0);
      expect(history.valueHistory.length).toBe(0);
    });
  });

  describe('getValueChange', () => {
    it('should calculate value change over time period', async () => {
      // Save two snapshots manually
      await historyStore.saveSnapshot({
        address: mockAddress,
        timestamp: Date.now() - 86400000, // 1 day ago
        totalValueUsd: 2000,
        chainBreakdown: {},
        tokenHoldings: [],
      });

      await historyStore.saveSnapshot({
        address: mockAddress,
        timestamp: Date.now(),
        totalValueUsd: 2500,
        chainBreakdown: {},
        tokenHoldings: [],
      });

      const change = await snapshotService.getValueChange(mockAddress, 7);

      expect(change.startValue).toBe(2000);
      expect(change.endValue).toBe(2500);
      expect(change.absoluteChange).toBe(500);
      expect(change.percentChange).toBe(25);
    });

    it('should calculate high and low values', async () => {
      await historyStore.saveSnapshot({
        address: mockAddress,
        timestamp: Date.now() - 200000,
        totalValueUsd: 2000,
        chainBreakdown: {},
        tokenHoldings: [],
      });

      await historyStore.saveSnapshot({
        address: mockAddress,
        timestamp: Date.now() - 100000,
        totalValueUsd: 3000, // High
        chainBreakdown: {},
        tokenHoldings: [],
      });

      await historyStore.saveSnapshot({
        address: mockAddress,
        timestamp: Date.now(),
        totalValueUsd: 2500,
        chainBreakdown: {},
        tokenHoldings: [],
      });

      const change = await snapshotService.getValueChange(mockAddress, 7);

      expect(change.highValue).toBe(3000);
      expect(change.lowValue).toBe(2000);
    });

    it('should return zeros for empty history', async () => {
      const change = await snapshotService.getValueChange(mockAddress, 7);

      expect(change.startValue).toBe(0);
      expect(change.endValue).toBe(0);
      expect(change.absoluteChange).toBe(0);
      expect(change.percentChange).toBe(0);
    });
  });

  describe('getSnapshots', () => {
    it('should get snapshots for time range', async () => {
      const now = Date.now();

      await historyStore.saveSnapshot({
        address: mockAddress,
        timestamp: now - 100000,
        totalValueUsd: 1000,
        chainBreakdown: {},
        tokenHoldings: [],
      });

      await historyStore.saveSnapshot({
        address: mockAddress,
        timestamp: now,
        totalValueUsd: 2000,
        chainBreakdown: {},
        tokenHoldings: [],
      });

      const snapshots = await snapshotService.getSnapshots(mockAddress, now - 50000, now);

      expect(snapshots.length).toBe(1);
      expect(snapshots[0].totalValueUsd).toBe(2000);
    });
  });

  describe('getLatestSnapshot', () => {
    it('should get most recent snapshot', async () => {
      await historyStore.saveSnapshot({
        address: mockAddress,
        timestamp: Date.now() - 10000,
        totalValueUsd: 1000,
        chainBreakdown: {},
        tokenHoldings: [],
      });

      await historyStore.saveSnapshot({
        address: mockAddress,
        timestamp: Date.now(),
        totalValueUsd: 2000,
        chainBreakdown: {},
        tokenHoldings: [],
      });

      const latest = await snapshotService.getLatestSnapshot(mockAddress);

      expect(latest).not.toBeNull();
      expect(latest!.totalValueUsd).toBe(2000);
    });
  });

  describe('getDailyReturns', () => {
    it('should calculate daily returns', async () => {
      const now = Date.now();

      await historyStore.saveSnapshot({
        address: mockAddress,
        timestamp: now - 172800000, // 2 days ago
        totalValueUsd: 1000,
        chainBreakdown: {},
        tokenHoldings: [],
      });

      await historyStore.saveSnapshot({
        address: mockAddress,
        timestamp: now - 86400000, // 1 day ago
        totalValueUsd: 1100,
        chainBreakdown: {},
        tokenHoldings: [],
      });

      await historyStore.saveSnapshot({
        address: mockAddress,
        timestamp: now,
        totalValueUsd: 1050,
        chainBreakdown: {},
        tokenHoldings: [],
      });

      const returns = await snapshotService.getDailyReturns(mockAddress, 7);

      expect(returns.length).toBe(2);
      expect(returns[0].return).toBe(10); // 10% gain
      expect(returns[1].return).toBeCloseTo(-4.55, 1); // ~4.5% loss
    });

    it('should return empty array for single snapshot', async () => {
      await historyStore.saveSnapshot({
        address: mockAddress,
        timestamp: Date.now(),
        totalValueUsd: 1000,
        chainBreakdown: {},
        tokenHoldings: [],
      });

      const returns = await snapshotService.getDailyReturns(mockAddress, 7);

      expect(returns.length).toBe(0);
    });
  });

  describe('compareToSnapshot', () => {
    it('should compare current portfolio to historical snapshot', async () => {
      const snapshot = await historyStore.saveSnapshot({
        address: mockAddress,
        timestamp: Date.now() - 86400000,
        totalValueUsd: 2000,
        chainBreakdown: { 1: 2000 },
        tokenHoldings: [
          {
            chainId: 1,
            address: '0x0000000000000000000000000000000000000000',
            symbol: 'ETH',
            balance: '1000000000000000000',
            priceUsd: 2000,
            valueUsd: 2000,
          },
        ],
      });

      const comparison = await snapshotService.compareToSnapshot(mockAddress, snapshot.id);

      expect(comparison).not.toBeNull();
      expect(comparison!.snapshotValue).toBe(2000);
      expect(comparison!.currentValue).toBe(2500);
      expect(comparison!.absoluteChange).toBe(500);
      expect(comparison!.percentChange).toBe(25);
    });

    it('should return null for non-existent snapshot', async () => {
      const comparison = await snapshotService.compareToSnapshot(mockAddress, 'non-existent-id');

      expect(comparison).toBeNull();
    });

    it('should track token changes', async () => {
      const snapshot = await historyStore.saveSnapshot({
        address: mockAddress,
        timestamp: Date.now() - 86400000,
        totalValueUsd: 2000,
        chainBreakdown: { 1: 2000 },
        tokenHoldings: [
          {
            chainId: 1,
            address: '0x0000000000000000000000000000000000000000',
            symbol: 'ETH',
            balance: '1000000000000000000',
            priceUsd: 2000,
            valueUsd: 2000,
          },
        ],
      });

      const comparison = await snapshotService.compareToSnapshot(mockAddress, snapshot.id);

      expect(comparison!.tokenChanges.length).toBeGreaterThan(0);
      const ethChange = comparison!.tokenChanges.find((t) => t.symbol === 'ETH');
      expect(ethChange).toBeDefined();
      expect(ethChange!.previousValue).toBe(2000);
      expect(ethChange!.currentValue).toBe(2500);
    });
  });
});
