import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PublicClient } from 'viem';
import { SparkAdapter } from './adapter';

describe('SparkAdapter', () => {
  let adapter: SparkAdapter;
  let mockClient: PublicClient;

  beforeEach(() => {
    adapter = new SparkAdapter();
    mockClient = {
      readContract: vi.fn(),
      multicall: vi.fn(),
    } as any;
  });

  describe('protocol configuration', () => {
    it('should have correct protocol metadata', () => {
      expect(adapter.protocol.id).toBe('spark');
      expect(adapter.protocol.name).toBe('Spark');
      expect(adapter.protocol.category).toBe('lending');
      expect(adapter.protocol.website).toBe('https://spark.fi');
    });

    it('should only support Ethereum mainnet', () => {
      expect(adapter.supportedChains).toEqual([1]);
      expect(adapter.supportedChains).toHaveLength(1);
    });
  });

  describe('hasPositions', () => {
    it('should return true when user has collateral', async () => {
      vi.mocked(mockClient.readContract).mockResolvedValue([
        1000000000000000000n, // totalCollateral > 0
        0n, // totalDebt
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

    it('should return true when user has debt', async () => {
      vi.mocked(mockClient.readContract).mockResolvedValue([
        0n,
        1000000000000000000n, // totalDebt > 0
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
        0n,
        0n,
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
        42161 as any // Arbitrum - not supported
      );

      expect(result).toBe(false);
      expect(mockClient.readContract).not.toHaveBeenCalled();
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
        42161 as any
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
            symbol: 'DAI',
            tokenAddress: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
          },
        ])
        .mockResolvedValueOnce([
          1000000000000000000n, // totalCollateral
          0n,
          0n,
          0n,
          0n,
          1000000000000000000n, // healthFactor
        ])
        .mockResolvedValue(18); // decimals

      // Mock multicall for getUserReserveData
      vi.mocked(mockClient.multicall).mockResolvedValue([
        {
          status: 'success',
          result: [
            1000000000000000000n, // currentATokenBalance (1 DAI)
            0n,
            0n,
            0n,
            0n,
            0n,
            40000000000000000000000000n, // liquidityRate (4% APY)
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
      expect(result[0].protocol.id).toBe('spark');
      expect(result[0].tokens[0].symbol).toBe('DAI');
    });

    it('should parse borrow positions correctly', async () => {
      vi.mocked(mockClient.readContract)
        .mockResolvedValueOnce([
          {
            symbol: 'USDC',
            tokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
          },
        ])
        .mockResolvedValueOnce([
          1000000000n,
          500000000n, // has debt
          0n,
          0n,
          0n,
          2000000000000000000n, // healthFactor
        ])
        .mockResolvedValue(6); // decimals

      vi.mocked(mockClient.multicall).mockResolvedValue([
        {
          status: 'success',
          result: [
            1000000000n, // currentATokenBalance
            0n, // currentStableDebt
            500000000n, // currentVariableDebt (500 USDC)
            0n,
            0n,
            0n,
            50000000000000000000000000n, // liquidityRate
            0n,
            true,
          ],
        },
      ]);

      const result = await adapter.getPositions(
        mockClient,
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        1
      );

      const borrowPositions = result.filter(p => p.type === 'borrow');
      expect(borrowPositions.length).toBeGreaterThan(0);
      expect(borrowPositions[0].protocol.id).toBe('spark');
      expect(borrowPositions[0].tokens[0].symbol).toBe('USDC');
    });

    it('should skip reserves with failed multicall', async () => {
      vi.mocked(mockClient.readContract)
        .mockResolvedValueOnce([
          {
            symbol: 'DAI',
            tokenAddress: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
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

    it('should include health factor in positions', async () => {
      const healthFactorValue = 1500000000000000000n; // 1.5 health factor

      vi.mocked(mockClient.readContract)
        .mockResolvedValueOnce([
          {
            symbol: 'DAI',
            tokenAddress: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
          },
        ])
        .mockResolvedValueOnce([
          1000000000000000000n,
          0n,
          0n,
          0n,
          0n,
          healthFactorValue,
        ])
        .mockResolvedValue(18);

      vi.mocked(mockClient.multicall).mockResolvedValue([
        {
          status: 'success',
          result: [
            1000000000000000000n,
            0n,
            0n,
            0n,
            0n,
            0n,
            40000000000000000000000000n,
            0n,
            true,
          ],
        },
      ]);

      const result = await adapter.getPositions(
        mockClient,
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        1
      );

      expect(result[0].healthFactor).toBe(1.5);
    });
  });

  describe('getYieldRates', () => {
    it('should return empty array for unsupported chains', async () => {
      const result = await adapter.getYieldRates(mockClient, 42161 as any);
      expect(result).toEqual([]);
    });

    it('should fetch yield rates for all reserves', async () => {
      vi.mocked(mockClient.readContract).mockResolvedValue([
        {
          symbol: 'DAI',
          tokenAddress: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
        },
        {
          symbol: 'USDC',
          tokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        },
      ]);

      vi.mocked(mockClient.multicall).mockResolvedValue([
        {
          status: 'success',
          result: [
            0n,
            0n,
            0n,
            0n,
            0n,
            40000000000000000000000000n, // 4% in ray format
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
            50000000000000000000000000n, // 5% in ray format
            0n,
            0n,
            0n,
            0n,
          ],
        },
      ]);

      const result = await adapter.getYieldRates(mockClient, 1);

      expect(result.length).toBe(2);
      expect(result[0].protocol).toBe('spark');
      expect(result[0].assetSymbol).toBe('DAI');
      expect(result[0].type).toBe('supply');
      expect(result[0].chainId).toBe(1);
      expect(result[1].assetSymbol).toBe('USDC');
    });

    it('should skip reserves with failed multicall', async () => {
      vi.mocked(mockClient.readContract).mockResolvedValue([
        {
          symbol: 'DAI',
          tokenAddress: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
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
    it('should return addresses for Ethereum mainnet', () => {
      const addresses = (adapter as any).getAddresses(1);
      expect(addresses).not.toBeNull();
      expect(addresses?.pool).toBeDefined();
      expect(addresses?.poolDataProvider).toBeDefined();
    });

    it('should return null for unsupported chains', () => {
      const addresses = (adapter as any).getAddresses(42161);
      expect(addresses).toBeNull();
    });
  });
});
