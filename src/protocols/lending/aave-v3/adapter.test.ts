import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PublicClient } from 'viem';
import { AaveV3Adapter } from './adapter';

describe('AaveV3Adapter', () => {
  let adapter: AaveV3Adapter;
  let mockClient: PublicClient;

  beforeEach(() => {
    adapter = new AaveV3Adapter();
    mockClient = {
      readContract: vi.fn(),
      multicall: vi.fn(),
    } as any;
  });

  describe('protocol configuration', () => {
    it('should have correct protocol metadata', () => {
      expect(adapter.protocol.id).toBe('aave-v3');
      expect(adapter.protocol.name).toBe('Aave V3');
      expect(adapter.protocol.category).toBe('lending');
      expect(adapter.protocol.website).toBe('https://aave.com');
    });

    it('should support multiple chains', () => {
      expect(adapter.supportedChains).toContain(1); // Ethereum
      expect(adapter.supportedChains).toContain(42161); // Arbitrum
      expect(adapter.supportedChains).toContain(10); // Optimism
      expect(adapter.supportedChains).toContain(8453); // Base
      expect(adapter.supportedChains.length).toBe(4);
    });
  });

  describe('hasPositions', () => {
    it('should return true when user has collateral', async () => {
      // Mock getUserAccountData to return collateral > 0
      vi.mocked(mockClient.readContract).mockResolvedValue([
        1000000000000000000n, // totalCollateralBase > 0
        0n, // totalDebtBase
        0n, // availableBorrowsBase
        0n, // currentLiquidationThreshold
        0n, // ltv
        0n, // healthFactor
      ]);

      const result = await adapter.hasPositions(
        mockClient,
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        1
      );

      expect(result).toBe(true);
    });

    it('should return true when user has debt', async () => {
      vi.mocked(mockClient.readContract).mockResolvedValue([
        0n, // totalCollateralBase
        1000000000000000000n, // totalDebtBase > 0
        0n,
        0n,
        0n,
        0n,
      ]);

      const result = await adapter.hasPositions(
        mockClient,
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        1
      );

      expect(result).toBe(true);
    });

    it('should return false when user has no positions', async () => {
      vi.mocked(mockClient.readContract).mockResolvedValue([
        0n, // totalCollateralBase
        0n, // totalDebtBase
        0n,
        0n,
        0n,
        0n,
      ]);

      const result = await adapter.hasPositions(
        mockClient,
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        1
      );

      expect(result).toBe(false);
    });

    it('should return false for unsupported chains', async () => {
      const result = await adapter.hasPositions(
        mockClient,
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        999 as any
      );

      expect(result).toBe(false);
    });

    it('should handle contract errors gracefully', async () => {
      vi.mocked(mockClient.readContract).mockRejectedValue(new Error('RPC Error'));

      const result = await adapter.hasPositions(
        mockClient,
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        1
      );

      expect(result).toBe(false);
    });
  });

  describe('getPositions', () => {
    it('should return empty array for unsupported chains', async () => {
      const result = await adapter.getPositions(
        mockClient,
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        999 as any
      );

      expect(result).toEqual([]);
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(mockClient.readContract).mockRejectedValue(new Error('Contract error'));

      const result = await adapter.getPositions(
        mockClient,
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        1
      );

      expect(result).toEqual([]);
    });

    it('should parse supply positions correctly', async () => {
      // Mock getAllReservesTokens
      vi.mocked(mockClient.readContract)
        .mockResolvedValueOnce([
          {
            symbol: 'USDC',
            tokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
          },
        ])
        .mockResolvedValueOnce([
          1000000000000000000n, // totalCollateral
          0n, // totalDebt
          0n,
          0n,
          0n,
          1000000000000000000n, // healthFactor
        ])
        .mockResolvedValue(6); // decimals

      // Mock multicall for getUserReserveData
      vi.mocked(mockClient.multicall).mockResolvedValue([
        {
          status: 'success',
          result: [
            1000000n, // currentATokenBalance
            0n, // currentStableDebt
            0n, // currentVariableDebt
            0n,
            0n,
            0n,
            50000000000000000000000000n, // liquidityRate (5% APY in ray)
            0n,
            true, // usageAsCollateralEnabled
          ],
        },
      ]);

      const result = await adapter.getPositions(
        mockClient,
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        1
      );

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].type).toBe('collateral');
      expect(result[0].protocol.id).toBe('aave-v3');
      expect(result[0].tokens[0].symbol).toBe('USDC');
    });

    it('should skip reserves with failed multicall', async () => {
      vi.mocked(mockClient.readContract)
        .mockResolvedValueOnce([
          {
            symbol: 'USDC',
            tokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
          },
        ])
        .mockResolvedValueOnce([0n, 0n, 0n, 0n, 0n, 0n]);

      vi.mocked(mockClient.multicall).mockResolvedValue([
        {
          status: 'failure',
          error: new Error('Contract error'),
        },
      ]);

      const result = await adapter.getPositions(
        mockClient,
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        1
      );

      expect(result).toEqual([]);
    });
  });

  describe('getYieldRates', () => {
    it('should return empty array for unsupported chains', async () => {
      const result = await adapter.getYieldRates(mockClient, 999 as any);
      expect(result).toEqual([]);
    });

    it('should fetch yield rates for all reserves', async () => {
      // Mock getAllReservesTokens
      vi.mocked(mockClient.readContract).mockResolvedValue([
        {
          symbol: 'USDC',
          tokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        },
        {
          symbol: 'DAI',
          tokenAddress: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
        },
      ]);

      // Mock multicall for getReserveData
      vi.mocked(mockClient.multicall).mockResolvedValue([
        {
          status: 'success',
          result: [
            0n, // configuration
            0n, // liquidityIndex
            0n, // currentLiquidityRate
            0n, // variableBorrowIndex
            0n, // currentVariableBorrowRate
            50000000000000000000000000n, // liquidityRate (5% in ray)
            0n,
            0n,
            0n,
            0n,
          ],
        },
        {
          status: 'success',
          result: [
            0n,
            0n,
            0n,
            0n,
            0n,
            40000000000000000000000000n, // 4% in ray
            0n,
            0n,
            0n,
            0n,
          ],
        },
      ]);

      const result = await adapter.getYieldRates(mockClient, 1);

      expect(result.length).toBe(2);
      expect(result[0].protocol).toBe('aave-v3');
      expect(result[0].assetSymbol).toBe('USDC');
      expect(result[0].type).toBe('supply');
      expect(result[0].chainId).toBe(1);
    });

    it('should skip reserves with failed multicall', async () => {
      vi.mocked(mockClient.readContract).mockResolvedValue([
        {
          symbol: 'USDC',
          tokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        },
      ]);

      vi.mocked(mockClient.multicall).mockResolvedValue([
        {
          status: 'failure',
          error: new Error('Contract error'),
        },
      ]);

      const result = await adapter.getYieldRates(mockClient, 1);
      expect(result).toEqual([]);
    });

    it('should handle contract errors gracefully', async () => {
      vi.mocked(mockClient.readContract).mockRejectedValue(new Error('RPC Error'));

      const result = await adapter.getYieldRates(mockClient, 1);
      expect(result).toEqual([]);
    });
  });

  describe('getAddresses', () => {
    it('should return addresses for supported chains', () => {
      const addresses = (adapter as any).getAddresses(1);
      expect(addresses).not.toBeNull();
      expect(addresses?.pool).toBeDefined();
      expect(addresses?.dataProvider).toBeDefined();
    });

    it('should return null for unsupported chains', () => {
      const addresses = (adapter as any).getAddresses(999);
      expect(addresses).toBeNull();
    });
  });
});
