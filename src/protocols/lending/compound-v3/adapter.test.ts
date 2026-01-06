import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PublicClient } from 'viem';
import { CompoundV3Adapter } from './adapter';

describe('CompoundV3Adapter', () => {
  let adapter: CompoundV3Adapter;
  let mockClient: PublicClient;

  beforeEach(() => {
    adapter = new CompoundV3Adapter();
    mockClient = {
      readContract: vi.fn(),
    } as any;
  });

  describe('protocol configuration', () => {
    it('should have correct protocol metadata', () => {
      expect(adapter.protocol.id).toBe('compound-v3');
      expect(adapter.protocol.name).toBe('Compound V3');
      expect(adapter.protocol.category).toBe('lending');
      expect(adapter.protocol.website).toBe('https://compound.finance');
    });

    it('should support Ethereum, Arbitrum, Optimism, and Base', () => {
      expect(adapter.supportedChains).toEqual([1, 42161, 10, 8453]);
      expect(adapter.supportedChains).toHaveLength(4);
    });
  });

  describe('hasPositions', () => {
    it('should return true when user has supply balance', async () => {
      vi.mocked(mockClient.readContract)
        .mockResolvedValueOnce(1000000000n) // balanceOf (supply)
        .mockResolvedValueOnce(0n); // borrowBalanceOf

      const result = await adapter.hasPositions(
        mockClient,
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        1
      );

      expect(result).toBe(true);
    });

    it('should return true when user has borrow balance', async () => {
      vi.mocked(mockClient.readContract)
        .mockResolvedValueOnce(0n) // balanceOf
        .mockResolvedValueOnce(500000000n); // borrowBalanceOf (borrow)

      const result = await adapter.hasPositions(
        mockClient,
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        1
      );

      expect(result).toBe(true);
    });

    it('should return true when user has both supply and borrow', async () => {
      vi.mocked(mockClient.readContract)
        .mockResolvedValueOnce(1000000000n)
        .mockResolvedValueOnce(500000000n);

      const result = await adapter.hasPositions(
        mockClient,
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        1
      );

      expect(result).toBe(true);
    });

    it('should check all markets on chain', async () => {
      // Ethereum has 2 markets (USDC and WETH)
      vi.mocked(mockClient.readContract)
        .mockResolvedValueOnce(0n) // USDC balanceOf
        .mockResolvedValueOnce(0n) // USDC borrowBalanceOf
        .mockResolvedValueOnce(1000000000000000000n) // WETH balanceOf
        .mockResolvedValueOnce(0n); // WETH borrowBalanceOf

      const result = await adapter.hasPositions(
        mockClient,
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        1
      );

      expect(result).toBe(true);
      expect(mockClient.readContract).toHaveBeenCalledTimes(4);
    });

    it('should return false when user has no positions', async () => {
      vi.mocked(mockClient.readContract)
        .mockResolvedValueOnce(0n)
        .mockResolvedValueOnce(0n)
        .mockResolvedValueOnce(0n)
        .mockResolvedValueOnce(0n);

      const result = await adapter.hasPositions(
        mockClient,
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        1
      );

      expect(result).toBe(false);
    });

    it('should work on Arbitrum (1 market)', async () => {
      vi.mocked(mockClient.readContract)
        .mockResolvedValueOnce(1000000000n)
        .mockResolvedValueOnce(0n);

      const result = await adapter.hasPositions(
        mockClient,
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        42161
      );

      expect(result).toBe(true);
      // Only 1 market on Arbitrum
      expect(mockClient.readContract).toHaveBeenCalledTimes(2);
    });

    it('should work on Base (2 markets)', async () => {
      vi.mocked(mockClient.readContract)
        .mockResolvedValueOnce(0n)
        .mockResolvedValueOnce(0n)
        .mockResolvedValueOnce(5000000000000000000n)
        .mockResolvedValueOnce(0n);

      const result = await adapter.hasPositions(
        mockClient,
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        8453
      );

      expect(result).toBe(true);
    });

    it('should return false for unsupported chains', async () => {
      const result = await adapter.hasPositions(
        mockClient,
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        137 as any
      );

      expect(result).toBe(false);
      expect(mockClient.readContract).not.toHaveBeenCalled();
    });

    it('should handle contract errors gracefully and continue', async () => {
      // First market fails (Promise.all rejects), second succeeds
      vi.mocked(mockClient.readContract)
        .mockRejectedValueOnce(new Error('RPC Error')) // First market balanceOf fails
        .mockResolvedValueOnce(0n) // First market borrowBalanceOf (consumed but Promise.all fails)
        .mockResolvedValueOnce(1000000000000000000n) // Second market balanceOf
        .mockResolvedValueOnce(0n); // Second market borrowBalanceOf

      const result = await adapter.hasPositions(
        mockClient,
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        1
      );

      expect(result).toBe(true);
    });
  });

  describe('getPositions', () => {
    it('should return empty array for unsupported chains', async () => {
      const result = await adapter.getPositions(
        mockClient,
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        137 as any
      );

      expect(result).toEqual([]);
    });

    it('should parse supply position', async () => {
      const supplyBalance = 10000000000n; // 10,000 USDC (6 decimals)
      const borrowBalance = 0n;
      const utilization = 800000000000000000n; // 80% utilization
      const supplyRate = 317097919n; // ~1% APY

      vi.mocked(mockClient.readContract)
        // First market checks
        .mockResolvedValueOnce(supplyBalance) // balanceOf
        .mockResolvedValueOnce(borrowBalance) // borrowBalanceOf
        .mockResolvedValueOnce(utilization) // getUtilization
        .mockResolvedValueOnce(6) // getTokenDecimals
        .mockResolvedValueOnce(supplyRate) // getSupplyRate
        .mockResolvedValueOnce(0) // numAssets
        // Second market checks (no positions)
        .mockResolvedValueOnce(0n)
        .mockResolvedValueOnce(0n)
        .mockResolvedValueOnce(utilization)
        .mockResolvedValueOnce(6)
        .mockResolvedValueOnce(0); // numAssets

      const result = await adapter.getPositions(
        mockClient,
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        1
      );

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('supply');
      expect(result[0].protocol.id).toBe('compound-v3');
      expect(result[0].chainId).toBe(1);
      expect(result[0].tokens[0].symbol).toBe('USDC');
      expect(result[0].tokens[0].balance).toBe(supplyBalance);
      expect(result[0].yield?.apy).toBeCloseTo(0.01, 2);
    });

    it('should parse borrow position', async () => {
      const supplyBalance = 0n;
      const borrowBalance = 5000000000n; // 5,000 USDC
      const utilization = 800000000000000000n;

      vi.mocked(mockClient.readContract)
        .mockResolvedValueOnce(supplyBalance)
        .mockResolvedValueOnce(borrowBalance)
        .mockResolvedValueOnce(utilization)
        .mockResolvedValueOnce(6) // decimals
        .mockResolvedValueOnce(0) // numAssets
        // Second market
        .mockResolvedValueOnce(0n)
        .mockResolvedValueOnce(0n)
        .mockResolvedValueOnce(utilization)
        .mockResolvedValueOnce(6)
        .mockResolvedValueOnce(0);

      const result = await adapter.getPositions(
        mockClient,
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        1
      );

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('borrow');
      expect(result[0].tokens[0].symbol).toBe('USDC');
      expect(result[0].tokens[0].balance).toBe(borrowBalance);
      expect(result[0].yield).toBeUndefined();
    });

    it('should parse collateral positions', async () => {
      const supplyBalance = 0n;
      const borrowBalance = 0n;
      const utilization = 800000000000000000n;
      const numAssets = 2;
      const collateralBalance = 1000000000000000000n; // 1 ETH

      vi.mocked(mockClient.readContract)
        .mockResolvedValueOnce(supplyBalance)
        .mockResolvedValueOnce(borrowBalance)
        .mockResolvedValueOnce(utilization)
        .mockResolvedValueOnce(6)
        .mockResolvedValueOnce(numAssets) // numAssets
        // First asset - no collateral
        .mockResolvedValueOnce({ asset: '0xToken1' }) // getAssetInfo
        .mockResolvedValueOnce([0n]) // userCollateral
        // Second asset - has collateral
        .mockResolvedValueOnce({ asset: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' }) // WETH
        .mockResolvedValueOnce([collateralBalance]) // userCollateral
        .mockResolvedValueOnce(18) // decimals
        .mockResolvedValueOnce('WETH') // symbol
        // Second market
        .mockResolvedValueOnce(0n)
        .mockResolvedValueOnce(0n)
        .mockResolvedValueOnce(utilization)
        .mockResolvedValueOnce(18)
        .mockResolvedValueOnce(0);

      const result = await adapter.getPositions(
        mockClient,
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        1
      );

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('collateral');
      expect(result[0].tokens[0].symbol).toBe('WETH');
      expect(result[0].tokens[0].balance).toBe(collateralBalance);
    });

    it('should parse supply and borrow positions together', async () => {
      const supplyBalance = 10000000000n;
      const borrowBalance = 3000000000n;
      const utilization = 800000000000000000n;
      const supplyRate = 317097919n;

      vi.mocked(mockClient.readContract)
        .mockResolvedValueOnce(supplyBalance)
        .mockResolvedValueOnce(borrowBalance)
        .mockResolvedValueOnce(utilization)
        .mockResolvedValueOnce(6) // decimals for supply
        .mockResolvedValueOnce(supplyRate)
        .mockResolvedValueOnce(0) // numAssets
        // Second market
        .mockResolvedValueOnce(0n)
        .mockResolvedValueOnce(0n)
        .mockResolvedValueOnce(utilization)
        .mockResolvedValueOnce(6)
        .mockResolvedValueOnce(0);

      const result = await adapter.getPositions(
        mockClient,
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        1
      );

      expect(result).toHaveLength(2);
      expect(result[0].type).toBe('supply');
      expect(result[1].type).toBe('borrow');
    });

    it('should work on Arbitrum', async () => {
      const supplyBalance = 5000000000n;

      vi.mocked(mockClient.readContract)
        .mockResolvedValueOnce(supplyBalance)
        .mockResolvedValueOnce(0n)
        .mockResolvedValueOnce(800000000000000000n)
        .mockResolvedValueOnce(6)
        .mockResolvedValueOnce(317097919n)
        .mockResolvedValueOnce(0);

      const result = await adapter.getPositions(
        mockClient,
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        42161
      );

      expect(result).toHaveLength(1);
      expect(result[0].chainId).toBe(42161);
      expect(result[0].tokens[0].symbol).toBe('USDC');
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(mockClient.readContract).mockRejectedValue(new Error('RPC Error'));

      const result = await adapter.getPositions(
        mockClient,
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        1
      );

      expect(result).toEqual([]);
    });

    it('should calculate APY correctly', async () => {
      const supplyBalance = 10000000000n;
      const supplyRate = 317097919n; // Rate per second
      const expectedAPY = (317097919 * 60 * 60 * 24 * 365) / 1e18;

      vi.mocked(mockClient.readContract)
        .mockResolvedValueOnce(supplyBalance)
        .mockResolvedValueOnce(0n)
        .mockResolvedValueOnce(800000000000000000n)
        .mockResolvedValueOnce(6)
        .mockResolvedValueOnce(supplyRate)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0n)
        .mockResolvedValueOnce(0n)
        .mockResolvedValueOnce(800000000000000000n)
        .mockResolvedValueOnce(6)
        .mockResolvedValueOnce(0);

      const result = await adapter.getPositions(
        mockClient,
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        1
      );

      expect(result[0].yield?.apy).toBeCloseTo(expectedAPY, 5);
      expect(result[0].yield?.apr).toBe(result[0].yield?.apy);
    });
  });

  describe('getYieldRates', () => {
    it('should return yield rates for all markets', async () => {
      const utilization = 800000000000000000n;
      const supplyRate = 317097919n;

      vi.mocked(mockClient.readContract)
        // First market (USDC)
        .mockResolvedValueOnce(utilization)
        .mockResolvedValueOnce(supplyRate)
        // Second market (WETH)
        .mockResolvedValueOnce(utilization)
        .mockResolvedValueOnce(supplyRate);

      const result = await adapter.getYieldRates(mockClient, 1);

      expect(result).toHaveLength(2);
      expect(result[0].protocol).toBe('compound-v3');
      expect(result[0].chainId).toBe(1);
      expect(result[0].assetSymbol).toBe('USDC');
      expect(result[0].type).toBe('supply');
      expect(result[0].apy).toBeCloseTo(0.01, 2);
      expect(result[1].assetSymbol).toBe('WETH');
    });

    it('should work on Arbitrum (1 market)', async () => {
      vi.mocked(mockClient.readContract)
        .mockResolvedValueOnce(800000000000000000n)
        .mockResolvedValueOnce(317097919n);

      const result = await adapter.getYieldRates(mockClient, 42161);

      expect(result).toHaveLength(1);
      expect(result[0].chainId).toBe(42161);
      expect(result[0].assetSymbol).toBe('USDC');
    });

    it('should work on Base (2 markets)', async () => {
      vi.mocked(mockClient.readContract)
        .mockResolvedValueOnce(800000000000000000n)
        .mockResolvedValueOnce(317097919n)
        .mockResolvedValueOnce(800000000000000000n)
        .mockResolvedValueOnce(317097919n);

      const result = await adapter.getYieldRates(mockClient, 8453);

      expect(result).toHaveLength(2);
      expect(result[0].assetSymbol).toBe('USDC');
      expect(result[1].assetSymbol).toBe('WETH');
    });

    it('should return empty array for unsupported chains', async () => {
      const result = await adapter.getYieldRates(mockClient, 137 as any);
      expect(result).toEqual([]);
    });

    it('should handle errors gracefully and continue', async () => {
      vi.mocked(mockClient.readContract)
        .mockRejectedValueOnce(new Error('RPC Error'))
        .mockResolvedValueOnce(800000000000000000n)
        .mockResolvedValueOnce(317097919n);

      const result = await adapter.getYieldRates(mockClient, 1);

      // Should still return second market's rate
      expect(result).toHaveLength(1);
      expect(result[0].assetSymbol).toBe('WETH');
    });
  });

  describe('getAddresses', () => {
    it('should return first market comet address for Ethereum', () => {
      const addresses = (adapter as any).getAddresses(1);
      expect(addresses).not.toBeNull();
      expect(addresses?.comet).toBe('0xc3d688B66703497DAA19211EEdff47f25384cdc3');
    });

    it('should return comet address for Arbitrum', () => {
      const addresses = (adapter as any).getAddresses(42161);
      expect(addresses).not.toBeNull();
      expect(addresses?.comet).toBe('0xA5EDBDD9646f8dFF606d7448e414884C7d905dCA');
    });

    it('should return comet address for Optimism', () => {
      const addresses = (adapter as any).getAddresses(10);
      expect(addresses).not.toBeNull();
      expect(addresses?.comet).toBe('0x2e44e174f7D53F0212823acC11C01A11d58c5bCB');
    });

    it('should return comet address for Base', () => {
      const addresses = (adapter as any).getAddresses(8453);
      expect(addresses).not.toBeNull();
      expect(addresses?.comet).toBe('0xb125E6687d4313864e53df431d5425969c15Eb2F');
    });

    it('should return null for unsupported chains', () => {
      const addresses = (adapter as any).getAddresses(137);
      expect(addresses).toBeNull();
    });
  });
});
