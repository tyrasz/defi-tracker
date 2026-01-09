import { describe, it, expect, beforeEach } from 'vitest';
import type { Address } from 'viem';
import type { PortfolioSnapshot, CostBasis } from '@/types/history';
import { historyStore } from './history-store';

describe('HistoryStore', () => {
  const mockAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0' as Address;
  const mockTokenAddress = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as Address;

  beforeEach(async () => {
    await historyStore.clearHistory(mockAddress);
  });

  describe('snapshots', () => {
    it('should save and retrieve a snapshot', async () => {
      const snapshot = await historyStore.saveSnapshot({
        address: mockAddress,
        timestamp: Date.now(),
        totalValueUsd: 10000,
        chainBreakdown: { 1: 8000, 42161: 2000 },
        tokenHoldings: [
          {
            chainId: 1,
            address: mockTokenAddress,
            symbol: 'ETH',
            balance: '1000000000000000000',
            priceUsd: 2500,
            valueUsd: 2500,
          },
        ],
      });

      expect(snapshot.id).toBeDefined();
      expect(snapshot.address).toBe(mockAddress);
      expect(snapshot.totalValueUsd).toBe(10000);
    });

    it('should retrieve snapshots within time range', async () => {
      const now = Date.now();

      // Save 3 snapshots at different times
      await historyStore.saveSnapshot({
        address: mockAddress,
        timestamp: now - 100000,
        totalValueUsd: 9000,
        chainBreakdown: {},
        tokenHoldings: [],
      });

      await historyStore.saveSnapshot({
        address: mockAddress,
        timestamp: now - 50000,
        totalValueUsd: 9500,
        chainBreakdown: {},
        tokenHoldings: [],
      });

      await historyStore.saveSnapshot({
        address: mockAddress,
        timestamp: now,
        totalValueUsd: 10000,
        chainBreakdown: {},
        tokenHoldings: [],
      });

      // Get only recent snapshots
      const snapshots = await historyStore.getSnapshots(mockAddress, now - 60000, now);

      expect(snapshots.length).toBe(2);
      expect(snapshots[0].totalValueUsd).toBe(9500);
      expect(snapshots[1].totalValueUsd).toBe(10000);
    });

    it('should get latest snapshot', async () => {
      await historyStore.saveSnapshot({
        address: mockAddress,
        timestamp: Date.now() - 10000,
        totalValueUsd: 9000,
        chainBreakdown: {},
        tokenHoldings: [],
      });

      await historyStore.saveSnapshot({
        address: mockAddress,
        timestamp: Date.now(),
        totalValueUsd: 10000,
        chainBreakdown: {},
        tokenHoldings: [],
      });

      const latest = await historyStore.getLatestSnapshot(mockAddress);

      expect(latest).not.toBeNull();
      expect(latest!.totalValueUsd).toBe(10000);
    });

    it('should return null for empty address history', async () => {
      const latest = await historyStore.getLatestSnapshot(mockAddress);

      expect(latest).toBeNull();
    });

    it('should limit to 365 snapshots', async () => {
      // Save 370 snapshots
      for (let i = 0; i < 370; i++) {
        await historyStore.saveSnapshot({
          address: mockAddress,
          timestamp: Date.now() + i * 1000,
          totalValueUsd: i * 100,
          chainBreakdown: {},
          tokenHoldings: [],
        });
      }

      const snapshots = await historyStore.getSnapshots(mockAddress);

      expect(snapshots.length).toBe(365);
    });
  });

  describe('history', () => {
    it('should get history with value timeline', async () => {
      const now = Date.now();

      await historyStore.saveSnapshot({
        address: mockAddress,
        timestamp: now - 86400000, // 1 day ago
        totalValueUsd: 9000,
        chainBreakdown: {},
        tokenHoldings: [],
      });

      await historyStore.saveSnapshot({
        address: mockAddress,
        timestamp: now,
        totalValueUsd: 10000,
        chainBreakdown: {},
        tokenHoldings: [],
      });

      const history = await historyStore.getHistory(mockAddress, 7);

      expect(history.address).toBe(mockAddress);
      expect(history.snapshots.length).toBe(2);
      expect(history.valueHistory.length).toBe(2);
      expect(history.valueHistory[0].valueUsd).toBe(9000);
      expect(history.valueHistory[1].valueUsd).toBe(10000);
    });
  });

  describe('cost basis', () => {
    it('should set and get cost basis', async () => {
      const costBasis: CostBasis = {
        address: mockAddress,
        tokenAddress: mockTokenAddress,
        chainId: 1,
        symbol: 'USDC',
        totalCost: 1000,
        totalQuantity: '1000000000',
        averageCostPerUnit: 0.001,
        acquisitions: [],
      };

      await historyStore.setCostBasis(costBasis);

      const retrieved = await historyStore.getCostBasis(mockAddress, 1, mockTokenAddress);

      expect(retrieved).not.toBeNull();
      expect(retrieved!.symbol).toBe('USDC');
      expect(retrieved!.totalCost).toBe(1000);
    });

    it('should return null for non-existent cost basis', async () => {
      const result = await historyStore.getCostBasis(mockAddress, 1, mockTokenAddress);

      expect(result).toBeNull();
    });

    it('should get all cost bases for an address', async () => {
      await historyStore.setCostBasis({
        address: mockAddress,
        tokenAddress: mockTokenAddress,
        chainId: 1,
        symbol: 'USDC',
        totalCost: 1000,
        totalQuantity: '1000000000',
        averageCostPerUnit: 0.001,
        acquisitions: [],
      });

      await historyStore.setCostBasis({
        address: mockAddress,
        tokenAddress: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
        chainId: 1,
        symbol: 'DAI',
        totalCost: 500,
        totalQuantity: '500000000000000000000',
        averageCostPerUnit: 0.001,
        acquisitions: [],
      });

      const bases = await historyStore.getAllCostBases(mockAddress);

      expect(bases.length).toBe(2);
    });

    it('should add acquisitions and recalculate totals', async () => {
      // First acquisition
      await historyStore.addAcquisition(
        mockAddress,
        1,
        mockTokenAddress,
        'ETH',
        {
          timestamp: Date.now(),
          quantity: '1000000000000000000',
          costUsd: 2500,
          pricePerUnit: 2500,
          source: 'manual',
        }
      );

      // Second acquisition
      const costBasis = await historyStore.addAcquisition(
        mockAddress,
        1,
        mockTokenAddress,
        'ETH',
        {
          timestamp: Date.now(),
          quantity: '500000000000000000',
          costUsd: 1250,
          pricePerUnit: 2500,
          source: 'manual',
        }
      );

      expect(costBasis.acquisitions.length).toBe(2);
      expect(costBasis.totalCost).toBe(3750);
      expect(costBasis.totalQuantity).toBe('1500000000000000000');
    });

    it('should update existing cost basis', async () => {
      await historyStore.setCostBasis({
        address: mockAddress,
        tokenAddress: mockTokenAddress,
        chainId: 1,
        symbol: 'USDC',
        totalCost: 1000,
        totalQuantity: '1000000000',
        averageCostPerUnit: 0.001,
        acquisitions: [],
      });

      await historyStore.setCostBasis({
        address: mockAddress,
        tokenAddress: mockTokenAddress,
        chainId: 1,
        symbol: 'USDC',
        totalCost: 2000,
        totalQuantity: '2000000000',
        averageCostPerUnit: 0.001,
        acquisitions: [],
      });

      const bases = await historyStore.getAllCostBases(mockAddress);

      expect(bases.length).toBe(1);
      expect(bases[0].totalCost).toBe(2000);
    });
  });

  describe('utility methods', () => {
    it('should clear history for an address', async () => {
      await historyStore.saveSnapshot({
        address: mockAddress,
        timestamp: Date.now(),
        totalValueUsd: 10000,
        chainBreakdown: {},
        tokenHoldings: [],
      });

      await historyStore.setCostBasis({
        address: mockAddress,
        tokenAddress: mockTokenAddress,
        chainId: 1,
        symbol: 'ETH',
        totalCost: 1000,
        totalQuantity: '1',
        averageCostPerUnit: 1000,
        acquisitions: [],
      });

      await historyStore.clearHistory(mockAddress);

      const snapshots = await historyStore.getSnapshots(mockAddress);
      const costBases = await historyStore.getAllCostBases(mockAddress);

      expect(snapshots.length).toBe(0);
      expect(costBases.length).toBe(0);
    });

    it('should export data for an address', async () => {
      await historyStore.saveSnapshot({
        address: mockAddress,
        timestamp: Date.now(),
        totalValueUsd: 10000,
        chainBreakdown: {},
        tokenHoldings: [],
      });

      await historyStore.setCostBasis({
        address: mockAddress,
        tokenAddress: mockTokenAddress,
        chainId: 1,
        symbol: 'ETH',
        totalCost: 1000,
        totalQuantity: '1',
        averageCostPerUnit: 1000,
        acquisitions: [],
      });

      const exported = await historyStore.exportData(mockAddress);

      expect(exported.snapshots.length).toBe(1);
      expect(exported.costBases.length).toBe(1);
    });

    it('should import data for an address', async () => {
      const snapshotData: PortfolioSnapshot = {
        id: 'test-id',
        address: mockAddress,
        timestamp: Date.now(),
        totalValueUsd: 5000,
        chainBreakdown: {},
        tokenHoldings: [],
      };

      await historyStore.importData(mockAddress, {
        snapshots: [snapshotData],
      });

      const snapshots = await historyStore.getSnapshots(mockAddress);

      expect(snapshots.length).toBe(1);
      expect(snapshots[0].id).toBe('test-id');
    });
  });

  describe('address normalization', () => {
    it('should handle case-insensitive addresses', async () => {
      const upperAddress = mockAddress.toUpperCase() as Address;
      const lowerAddress = mockAddress.toLowerCase() as Address;

      await historyStore.saveSnapshot({
        address: upperAddress,
        timestamp: Date.now(),
        totalValueUsd: 10000,
        chainBreakdown: {},
        tokenHoldings: [],
      });

      const snapshots = await historyStore.getSnapshots(lowerAddress);

      expect(snapshots.length).toBe(1);
    });
  });
});
