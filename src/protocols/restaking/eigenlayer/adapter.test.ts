import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PublicClient } from 'viem';
import { EigenLayerAdapter } from './adapter';

describe('EigenLayerAdapter', () => {
  let adapter: EigenLayerAdapter;
  let mockClient: PublicClient;

  beforeEach(() => {
    adapter = new EigenLayerAdapter();
    mockClient = {
      readContract: vi.fn(),
    } as any;
  });

  describe('protocol configuration', () => {
    it('should have correct protocol metadata', () => {
      expect(adapter.protocol.id).toBe('eigenlayer');
      expect(adapter.protocol.name).toBe('EigenLayer');
      expect(adapter.protocol.category).toBe('restaking');
      expect(adapter.protocol.website).toBe('https://eigenlayer.xyz');
    });

    it('should support only Ethereum mainnet', () => {
      expect(adapter.supportedChains).toEqual([1]);
      expect(adapter.supportedChains).toHaveLength(1);
    });
  });

  describe('hasPositions', () => {
    it('should return true when user has shares in first strategy', async () => {
      vi.mocked(mockClient.readContract)
        .mockResolvedValueOnce(1000000000000000000n) // stETH strategy
        .mockResolvedValueOnce(0n) // rETH strategy
        .mockResolvedValueOnce(0n); // cbETH strategy

      const result = await adapter.hasPositions(
        mockClient,
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        1
      );

      expect(result).toBe(true);
      // Only checks first 3 strategies
      expect(mockClient.readContract).toHaveBeenCalledTimes(3);
    });

    it('should return true when user has shares in any of first 3 strategies', async () => {
      vi.mocked(mockClient.readContract)
        .mockResolvedValueOnce(0n)
        .mockResolvedValueOnce(0n)
        .mockResolvedValueOnce(5000000000000000000n); // cbETH strategy

      const result = await adapter.hasPositions(
        mockClient,
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        1
      );

      expect(result).toBe(true);
    });

    it('should return false when user has no shares', async () => {
      vi.mocked(mockClient.readContract)
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

    it('should only check first 3 strategies for performance', async () => {
      vi.mocked(mockClient.readContract)
        .mockResolvedValueOnce(0n)
        .mockResolvedValueOnce(0n)
        .mockResolvedValueOnce(0n);

      await adapter.hasPositions(
        mockClient,
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        1
      );

      // Should only check 3 strategies, not all 11
      expect(mockClient.readContract).toHaveBeenCalledTimes(3);
    });

    it('should return false for unsupported chains', async () => {
      const result = await adapter.hasPositions(
        mockClient,
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        42161 as any
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

    it('should return empty array when no shares', async () => {
      // Mock all 11 strategy shares as 0
      for (let i = 0; i < 11; i++) {
        vi.mocked(mockClient.readContract).mockResolvedValueOnce(0n);
      }

      const result = await adapter.getPositions(
        mockClient,
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        1
      );

      expect(result).toEqual([]);
    });

    it('should parse restaking position for single strategy', async () => {
      const shares = 1000000000000000000n; // 1 share
      const underlyingAmount = 1050000000000000000n; // 1.05 stETH

      // Mock shares for all 11 strategies (only first has shares)
      vi.mocked(mockClient.readContract)
        .mockResolvedValueOnce(shares) // stETH strategy
        .mockResolvedValueOnce(0n) // rETH
        .mockResolvedValueOnce(0n) // cbETH
        .mockResolvedValueOnce(0n) // osETH
        .mockResolvedValueOnce(0n) // swETH
        .mockResolvedValueOnce(0n) // ankrETH
        .mockResolvedValueOnce(0n) // oETH
        .mockResolvedValueOnce(0n) // wBETH
        .mockResolvedValueOnce(0n) // sfrxETH
        .mockResolvedValueOnce(0n) // lsETH
        .mockResolvedValueOnce(0n) // mETH
        .mockResolvedValueOnce(underlyingAmount) // sharesToUnderlyingView
        .mockResolvedValueOnce(false) // isDelegated
        .mockResolvedValueOnce(18); // getTokenDecimals

      const result = await adapter.getPositions(
        mockClient,
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        1
      );

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('restake');
      expect(result[0].protocol.id).toBe('eigenlayer');
      expect(result[0].chainId).toBe(1);
      expect(result[0].tokens[0].symbol).toBe('stETH');
      expect(result[0].tokens[0].balance).toBe(underlyingAmount);
      expect(result[0].metadata?.strategyName).toBe('stETH Strategy');
      expect(result[0].metadata?.shares).toBe(shares.toString());
    });

    it('should parse multiple restaking positions', async () => {
      const stETHShares = 1000000000000000000n;
      const rETHShares = 2000000000000000000n;
      const stETHUnderlying = 1050000000000000000n;
      const rETHUnderlying = 2100000000000000000n;

      vi.mocked(mockClient.readContract)
        // Shares for all strategies
        .mockResolvedValueOnce(stETHShares)
        .mockResolvedValueOnce(rETHShares)
        .mockResolvedValueOnce(0n)
        .mockResolvedValueOnce(0n)
        .mockResolvedValueOnce(0n)
        .mockResolvedValueOnce(0n)
        .mockResolvedValueOnce(0n)
        .mockResolvedValueOnce(0n)
        .mockResolvedValueOnce(0n)
        .mockResolvedValueOnce(0n)
        .mockResolvedValueOnce(0n)
        // Underlying amounts for active strategies
        .mockResolvedValueOnce(stETHUnderlying)
        .mockResolvedValueOnce(rETHUnderlying)
        // Delegation
        .mockResolvedValueOnce(false)
        // Decimals
        .mockResolvedValueOnce(18)
        .mockResolvedValueOnce(18);

      const result = await adapter.getPositions(
        mockClient,
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        1
      );

      expect(result).toHaveLength(2);
      expect(result[0].tokens[0].symbol).toBe('stETH');
      expect(result[1].tokens[0].symbol).toBe('rETH');
    });

    it('should include delegation information when delegated', async () => {
      const shares = 1000000000000000000n;
      const underlyingAmount = 1050000000000000000n;
      const operatorAddress = '0x1234567890123456789012345678901234567890' as const;

      vi.mocked(mockClient.readContract)
        .mockResolvedValueOnce(shares)
        .mockResolvedValueOnce(0n)
        .mockResolvedValueOnce(0n)
        .mockResolvedValueOnce(0n)
        .mockResolvedValueOnce(0n)
        .mockResolvedValueOnce(0n)
        .mockResolvedValueOnce(0n)
        .mockResolvedValueOnce(0n)
        .mockResolvedValueOnce(0n)
        .mockResolvedValueOnce(0n)
        .mockResolvedValueOnce(0n)
        .mockResolvedValueOnce(underlyingAmount)
        .mockResolvedValueOnce(true) // isDelegated
        .mockResolvedValueOnce(operatorAddress) // delegatedTo
        .mockResolvedValueOnce(18);

      const result = await adapter.getPositions(
        mockClient,
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        1
      );

      expect(result[0].metadata?.delegatedTo).toBe(operatorAddress);
    });

    it('should not include delegation when not delegated', async () => {
      const shares = 1000000000000000000n;
      const underlyingAmount = 1050000000000000000n;

      vi.mocked(mockClient.readContract)
        .mockResolvedValueOnce(shares)
        .mockResolvedValueOnce(0n)
        .mockResolvedValueOnce(0n)
        .mockResolvedValueOnce(0n)
        .mockResolvedValueOnce(0n)
        .mockResolvedValueOnce(0n)
        .mockResolvedValueOnce(0n)
        .mockResolvedValueOnce(0n)
        .mockResolvedValueOnce(0n)
        .mockResolvedValueOnce(0n)
        .mockResolvedValueOnce(0n)
        .mockResolvedValueOnce(underlyingAmount)
        .mockResolvedValueOnce(false) // isDelegated
        .mockResolvedValueOnce(18);

      const result = await adapter.getPositions(
        mockClient,
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        1
      );

      expect(result[0].metadata?.delegatedTo).toBeUndefined();
    });

    it('should handle delegation check errors gracefully', async () => {
      const shares = 1000000000000000000n;
      const underlyingAmount = 1050000000000000000n;

      vi.mocked(mockClient.readContract)
        .mockResolvedValueOnce(shares)
        .mockResolvedValueOnce(0n)
        .mockResolvedValueOnce(0n)
        .mockResolvedValueOnce(0n)
        .mockResolvedValueOnce(0n)
        .mockResolvedValueOnce(0n)
        .mockResolvedValueOnce(0n)
        .mockResolvedValueOnce(0n)
        .mockResolvedValueOnce(0n)
        .mockResolvedValueOnce(0n)
        .mockResolvedValueOnce(0n)
        .mockResolvedValueOnce(underlyingAmount)
        .mockRejectedValueOnce(new Error('Delegation manager error'))
        .mockResolvedValueOnce(18);

      const result = await adapter.getPositions(
        mockClient,
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        1
      );

      expect(result).toHaveLength(1);
      expect(result[0].metadata?.delegatedTo).toBeUndefined();
    });

    it('should include strategy metadata', async () => {
      const shares = 1000000000000000000n;
      const underlyingAmount = 1050000000000000000n;

      vi.mocked(mockClient.readContract)
        .mockResolvedValueOnce(0n)
        .mockResolvedValueOnce(shares) // rETH strategy
        .mockResolvedValueOnce(0n)
        .mockResolvedValueOnce(0n)
        .mockResolvedValueOnce(0n)
        .mockResolvedValueOnce(0n)
        .mockResolvedValueOnce(0n)
        .mockResolvedValueOnce(0n)
        .mockResolvedValueOnce(0n)
        .mockResolvedValueOnce(0n)
        .mockResolvedValueOnce(0n)
        .mockResolvedValueOnce(underlyingAmount)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(18);

      const result = await adapter.getPositions(
        mockClient,
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        1
      );

      expect(result[0].metadata).toMatchObject({
        strategyName: 'rETH Strategy',
        strategyAddress: '0x1BeE69b7dFFfA4E2d53C2a2Df135C388AD25dCD2',
        shares: shares.toString(),
      });
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

    it('should call sharesToUnderlyingView with correct shares', async () => {
      const shares = 1234567890123456789n;
      const underlyingAmount = 1300000000000000000n;

      vi.mocked(mockClient.readContract)
        .mockResolvedValueOnce(shares)
        .mockResolvedValueOnce(0n)
        .mockResolvedValueOnce(0n)
        .mockResolvedValueOnce(0n)
        .mockResolvedValueOnce(0n)
        .mockResolvedValueOnce(0n)
        .mockResolvedValueOnce(0n)
        .mockResolvedValueOnce(0n)
        .mockResolvedValueOnce(0n)
        .mockResolvedValueOnce(0n)
        .mockResolvedValueOnce(0n)
        .mockResolvedValueOnce(underlyingAmount)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(18);

      await adapter.getPositions(
        mockClient,
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        1
      );

      // Verify sharesToUnderlyingView was called with correct shares
      const sharesToUnderlyingCall = vi.mocked(mockClient.readContract).mock.calls.find(
        (call: any) => call[0]?.functionName === 'sharesToUnderlyingView'
      );
      expect(sharesToUnderlyingCall).toBeDefined();
      expect(sharesToUnderlyingCall![0].args).toEqual([shares]);
    });

    it('should check all 11 strategies', async () => {
      // All strategies have 0 shares
      for (let i = 0; i < 11; i++) {
        vi.mocked(mockClient.readContract).mockResolvedValueOnce(0n);
      }

      await adapter.getPositions(
        mockClient,
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        1
      );

      // Should check all 11 strategies
      const sharesCalls = vi.mocked(mockClient.readContract).mock.calls.filter(
        (call: any) => call[0]?.functionName === 'stakerStrategyShares'
      );
      expect(sharesCalls).toHaveLength(11);
    });
  });

  describe('getYieldRates', () => {
    it('should return empty array (not implemented)', async () => {
      const result = await adapter.getYieldRates(mockClient, 1);
      expect(result).toEqual([]);
    });

    it('should return empty array for unsupported chains', async () => {
      const result = await adapter.getYieldRates(mockClient, 42161 as any);
      expect(result).toEqual([]);
    });
  });

  describe('getAddresses', () => {
    it('should return addresses for Ethereum mainnet', () => {
      const addresses = (adapter as any).getAddresses(1);
      expect(addresses).not.toBeNull();
      expect(addresses?.strategyManager).toBe('0x858646372CC42E1A627fcE94aa7A7033e7CF075A');
      expect(addresses?.delegationManager).toBe('0x39053D51B77DC0d36036Fc1fCc8Cb819df8Ef37A');
      expect(addresses?.strategies).toBeDefined();
      expect(addresses?.strategies.length).toBe(11);
    });

    it('should return null for unsupported chains', () => {
      const addresses = (adapter as any).getAddresses(42161);
      expect(addresses).toBeNull();
    });
  });
});
