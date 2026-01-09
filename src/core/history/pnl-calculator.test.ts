import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Address } from 'viem';
import { pnlCalculator, type TokenPosition } from './pnl-calculator';
import { historyStore } from './history-store';

describe('PnLCalculator', () => {
  const mockAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0' as Address;
  const mockTokenAddress = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as Address;

  beforeEach(async () => {
    await historyStore.clearHistory(mockAddress);
  });

  describe('calculatePnL', () => {
    it('should calculate unrealized P&L for positions with cost basis', async () => {
      // Set cost basis: bought 1 ETH for $2000
      await historyStore.setCostBasis({
        address: mockAddress,
        tokenAddress: mockTokenAddress,
        chainId: 1,
        symbol: 'ETH',
        totalCost: 2000,
        totalQuantity: '1000000000000000000',
        averageCostPerUnit: 2000,
        acquisitions: [],
      });

      const positions: TokenPosition[] = [
        {
          chainId: 1,
          address: mockTokenAddress,
          symbol: 'ETH',
          balance: 1000000000000000000n,
          valueUsd: 2500, // Current value
          priceUsd: 2500,
        },
      ];

      const pnl = await pnlCalculator.calculatePnL(mockAddress, positions);

      expect(pnl.address).toBe(mockAddress);
      expect(pnl.totalUnrealizedPnL).toBe(500); // $2500 - $2000
      expect(pnl.positions.length).toBe(1);
      expect(pnl.positions[0].unrealizedPnL).toBe(500);
      expect(pnl.positions[0].unrealizedPnLPercent).toBe(25); // 500/2000 * 100
    });

    it('should handle positions without cost basis', async () => {
      const positions: TokenPosition[] = [
        {
          chainId: 1,
          address: mockTokenAddress,
          symbol: 'ETH',
          balance: 1000000000000000000n,
          valueUsd: 2500,
          priceUsd: 2500,
        },
      ];

      const pnl = await pnlCalculator.calculatePnL(mockAddress, positions);

      expect(pnl.totalUnrealizedPnL).toBe(0);
      expect(pnl.positions[0].costBasis).toBe(0);
      expect(pnl.positions[0].unrealizedPnL).toBe(0);
    });

    it('should handle negative P&L (losses)', async () => {
      // Set cost basis: bought 1 ETH for $3000
      await historyStore.setCostBasis({
        address: mockAddress,
        tokenAddress: mockTokenAddress,
        chainId: 1,
        symbol: 'ETH',
        totalCost: 3000,
        totalQuantity: '1000000000000000000',
        averageCostPerUnit: 3000,
        acquisitions: [],
      });

      const positions: TokenPosition[] = [
        {
          chainId: 1,
          address: mockTokenAddress,
          symbol: 'ETH',
          balance: 1000000000000000000n,
          valueUsd: 2500, // Current value is lower
          priceUsd: 2500,
        },
      ];

      const pnl = await pnlCalculator.calculatePnL(mockAddress, positions);

      expect(pnl.totalUnrealizedPnL).toBe(-500); // $2500 - $3000
      expect(pnl.positions[0].unrealizedPnLPercent).toBeCloseTo(-16.67, 1);
    });

    it('should handle multiple positions', async () => {
      const tokenAddress2 = '0x6B175474E89094C44Da98b954EedeAC495271d0F' as Address;

      await historyStore.setCostBasis({
        address: mockAddress,
        tokenAddress: mockTokenAddress,
        chainId: 1,
        symbol: 'ETH',
        totalCost: 2000,
        totalQuantity: '1',
        averageCostPerUnit: 2000,
        acquisitions: [],
      });

      await historyStore.setCostBasis({
        address: mockAddress,
        tokenAddress: tokenAddress2,
        chainId: 1,
        symbol: 'DAI',
        totalCost: 1000,
        totalQuantity: '1000',
        averageCostPerUnit: 1,
        acquisitions: [],
      });

      const positions: TokenPosition[] = [
        {
          chainId: 1,
          address: mockTokenAddress,
          symbol: 'ETH',
          balance: 1n,
          valueUsd: 2500,
          priceUsd: 2500,
        },
        {
          chainId: 1,
          address: tokenAddress2,
          symbol: 'DAI',
          balance: 1000n,
          valueUsd: 1000,
          priceUsd: 1,
        },
      ];

      const pnl = await pnlCalculator.calculatePnL(mockAddress, positions);

      expect(pnl.totalUnrealizedPnL).toBe(500); // $500 ETH profit + $0 DAI
      expect(pnl.positions.length).toBe(2);
    });

    it('should sort positions by absolute P&L descending', async () => {
      const tokenAddress2 = '0x6B175474E89094C44Da98b954EedeAC495271d0F' as Address;

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

      await historyStore.setCostBasis({
        address: mockAddress,
        tokenAddress: tokenAddress2,
        chainId: 1,
        symbol: 'DAI',
        totalCost: 5000,
        totalQuantity: '5000',
        averageCostPerUnit: 1,
        acquisitions: [],
      });

      const positions: TokenPosition[] = [
        {
          chainId: 1,
          address: mockTokenAddress,
          symbol: 'ETH',
          balance: 1n,
          valueUsd: 1500, // +$500
          priceUsd: 1500,
        },
        {
          chainId: 1,
          address: tokenAddress2,
          symbol: 'DAI',
          balance: 5000n,
          valueUsd: 3000, // -$2000
          priceUsd: 0.6,
        },
      ];

      const pnl = await pnlCalculator.calculatePnL(mockAddress, positions);

      // DAI loss ($2000) should come first (higher absolute value)
      expect(pnl.positions[0].symbol).toBe('DAI');
      expect(pnl.positions[1].symbol).toBe('ETH');
    });
  });

  describe('recordAcquisition', () => {
    it('should record a token acquisition', async () => {
      const costBasis = await pnlCalculator.recordAcquisition(
        mockAddress,
        1,
        mockTokenAddress,
        'ETH',
        1000000000000000000n,
        2500,
        '0xtxhash'
      );

      expect(costBasis.symbol).toBe('ETH');
      expect(costBasis.totalCost).toBe(2500);
      expect(costBasis.acquisitions.length).toBe(1);
      expect(costBasis.acquisitions[0].txHash).toBe('0xtxhash');
    });

    it('should add to existing cost basis', async () => {
      // First acquisition
      await pnlCalculator.recordAcquisition(
        mockAddress,
        1,
        mockTokenAddress,
        'ETH',
        1000000000000000000n,
        2000
      );

      // Second acquisition
      const costBasis = await pnlCalculator.recordAcquisition(
        mockAddress,
        1,
        mockTokenAddress,
        'ETH',
        500000000000000000n,
        1500
      );

      expect(costBasis.acquisitions.length).toBe(2);
      expect(costBasis.totalCost).toBe(3500);
    });
  });

  describe('setCostBasis', () => {
    it('should manually set cost basis for a position', async () => {
      const costBasis = await pnlCalculator.setCostBasis(
        mockAddress,
        1,
        mockTokenAddress,
        'ETH',
        2000000000000000000n,
        5000
      );

      expect(costBasis.totalCost).toBe(5000);
      expect(costBasis.totalQuantity).toBe('2000000000000000000');
      // averageCostPerUnit is cost per smallest unit (wei), not per whole token
      expect(costBasis.averageCostPerUnit).toBe(5000 / 2000000000000000000); // 5000 / 2e18
    });

    it('should handle zero quantity', async () => {
      const costBasis = await pnlCalculator.setCostBasis(
        mockAddress,
        1,
        mockTokenAddress,
        'ETH',
        0n,
        0
      );

      expect(costBasis.averageCostPerUnit).toBe(0);
    });
  });

  describe('getCostBasis', () => {
    it('should retrieve existing cost basis', async () => {
      await pnlCalculator.setCostBasis(
        mockAddress,
        1,
        mockTokenAddress,
        'ETH',
        1000000000000000000n,
        2500
      );

      const costBasis = await pnlCalculator.getCostBasis(mockAddress, 1, mockTokenAddress);

      expect(costBasis).not.toBeNull();
      expect(costBasis!.totalCost).toBe(2500);
    });

    it('should return null for non-existent cost basis', async () => {
      const costBasis = await pnlCalculator.getCostBasis(mockAddress, 1, mockTokenAddress);

      expect(costBasis).toBeNull();
    });
  });

  describe('calculateROI', () => {
    it('should calculate positive ROI', () => {
      const roi = pnlCalculator.calculateROI(1000, 1500);

      expect(roi).toBe(50); // 50% return
    });

    it('should calculate negative ROI', () => {
      const roi = pnlCalculator.calculateROI(1000, 800);

      expect(roi).toBe(-20); // -20% return
    });

    it('should return 0 for zero cost basis', () => {
      const roi = pnlCalculator.calculateROI(0, 1000);

      expect(roi).toBe(0);
    });

    it('should handle break-even', () => {
      const roi = pnlCalculator.calculateROI(1000, 1000);

      expect(roi).toBe(0);
    });
  });
});
