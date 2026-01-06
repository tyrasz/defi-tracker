import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PublicClient } from 'viem';
import { RocketPoolAdapter } from './adapter';
import { ROCKET_POOL_ESTIMATED_APR } from './addresses';

describe('RocketPoolAdapter', () => {
  let adapter: RocketPoolAdapter;
  let mockClient: PublicClient;

  beforeEach(() => {
    adapter = new RocketPoolAdapter();
    mockClient = {
      readContract: vi.fn(),
    } as any;
  });

  describe('protocol configuration', () => {
    it('should have correct protocol metadata', () => {
      expect(adapter.protocol.id).toBe('rocket-pool');
      expect(adapter.protocol.name).toBe('Rocket Pool');
      expect(adapter.protocol.category).toBe('liquid-staking');
      expect(adapter.protocol.website).toBe('https://rocketpool.net');
    });

    it('should support Ethereum, Arbitrum, Optimism, and Base', () => {
      expect(adapter.supportedChains).toEqual([1, 42161, 10, 8453]);
      expect(adapter.supportedChains).toHaveLength(4);
    });
  });

  describe('hasPositions', () => {
    it('should return true when user has rETH balance', async () => {
      vi.mocked(mockClient.readContract).mockResolvedValueOnce(1000000000000000000n);

      const result = await adapter.hasPositions(
        mockClient,
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        1
      );

      expect(result).toBe(true);
    });

    it('should return false when user has no rETH balance', async () => {
      vi.mocked(mockClient.readContract).mockResolvedValueOnce(0n);

      const result = await adapter.hasPositions(
        mockClient,
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        1
      );

      expect(result).toBe(false);
    });

    it('should work on Arbitrum', async () => {
      vi.mocked(mockClient.readContract).mockResolvedValueOnce(5000000000000000000n);

      const result = await adapter.hasPositions(
        mockClient,
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        42161
      );

      expect(result).toBe(true);
    });

    it('should work on Optimism', async () => {
      vi.mocked(mockClient.readContract).mockResolvedValueOnce(3000000000000000000n);

      const result = await adapter.hasPositions(
        mockClient,
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        10
      );

      expect(result).toBe(true);
    });

    it('should work on Base', async () => {
      vi.mocked(mockClient.readContract).mockResolvedValueOnce(2000000000000000000n);

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
        137 as any // Polygon - not supported
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
        137 as any
      );

      expect(result).toEqual([]);
    });

    it('should parse rETH position with underlying ETH', async () => {
      const rETHBalance = 10000000000000000000n; // 10 rETH
      const underlyingETH = 11000000000000000000n; // 11 ETH

      vi.mocked(mockClient.readContract)
        .mockResolvedValueOnce(rETHBalance)
        .mockResolvedValueOnce(underlyingETH);

      const result = await adapter.getPositions(
        mockClient,
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        1
      );

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('rocket-pool-reth-1');
      expect(result[0].type).toBe('stake');
      expect(result[0].protocol.id).toBe('rocket-pool');
      expect(result[0].chainId).toBe(1);
      expect(result[0].tokens[0].symbol).toBe('rETH');
      expect(result[0].tokens[0].decimals).toBe(18);
      expect(result[0].tokens[0].balance).toBe(rETHBalance);
      expect(result[0].tokens[0].balanceFormatted).toBe('10');
      expect(result[0].metadata?.underlyingETH).toBe('11');
      expect(result[0].yield?.apy).toBe(ROCKET_POOL_ESTIMATED_APR);
      expect(result[0].yield?.apr).toBe(ROCKET_POOL_ESTIMATED_APR);
    });

    it('should skip zero balances', async () => {
      vi.mocked(mockClient.readContract).mockResolvedValueOnce(0n);

      const result = await adapter.getPositions(
        mockClient,
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        1
      );

      expect(result).toEqual([]);
    });

    it('should use 1:1 fallback if getEthValue fails', async () => {
      const rETHBalance = 5000000000000000000n;

      vi.mocked(mockClient.readContract)
        .mockResolvedValueOnce(rETHBalance)
        .mockRejectedValueOnce(new Error('Contract error'));

      const result = await adapter.getPositions(
        mockClient,
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        1
      );

      expect(result).toHaveLength(1);
      expect(result[0].metadata?.underlyingETH).toBe('5'); // Uses rETH balance as fallback
    });

    it('should work on Arbitrum', async () => {
      const rETHBalance = 2000000000000000000n;
      const underlyingETH = 2200000000000000000n;

      vi.mocked(mockClient.readContract)
        .mockResolvedValueOnce(rETHBalance)
        .mockResolvedValueOnce(underlyingETH);

      const result = await adapter.getPositions(
        mockClient,
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        42161
      );

      expect(result).toHaveLength(1);
      expect(result[0].chainId).toBe(42161);
      expect(result[0].tokens[0].symbol).toBe('rETH');
      expect(result[0].metadata?.underlyingETH).toBe('2.2');
    });

    it('should work on Optimism', async () => {
      const rETHBalance = 3000000000000000000n;
      const underlyingETH = 3300000000000000000n;

      vi.mocked(mockClient.readContract)
        .mockResolvedValueOnce(rETHBalance)
        .mockResolvedValueOnce(underlyingETH);

      const result = await adapter.getPositions(
        mockClient,
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        10
      );

      expect(result).toHaveLength(1);
      expect(result[0].chainId).toBe(10);
      expect(result[0].tokens[0].symbol).toBe('rETH');
    });

    it('should work on Base', async () => {
      const rETHBalance = 1500000000000000000n;
      const underlyingETH = 1650000000000000000n;

      vi.mocked(mockClient.readContract)
        .mockResolvedValueOnce(rETHBalance)
        .mockResolvedValueOnce(underlyingETH);

      const result = await adapter.getPositions(
        mockClient,
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        8453
      );

      expect(result).toHaveLength(1);
      expect(result[0].chainId).toBe(8453);
      expect(result[0].tokens[0].symbol).toBe('rETH');
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

    it('should include yield information', async () => {
      const rETHBalance = 1000000000000000000n;
      const underlyingETH = 1100000000000000000n;

      vi.mocked(mockClient.readContract)
        .mockResolvedValueOnce(rETHBalance)
        .mockResolvedValueOnce(underlyingETH);

      const result = await adapter.getPositions(
        mockClient,
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        1
      );

      expect(result[0].yield).toEqual({
        apy: ROCKET_POOL_ESTIMATED_APR,
        apr: ROCKET_POOL_ESTIMATED_APR,
      });
    });

    it('should call getEthValue with correct rETH balance', async () => {
      const rETHBalance = 7000000000000000000n;
      const underlyingETH = 7700000000000000000n;

      vi.mocked(mockClient.readContract)
        .mockResolvedValueOnce(rETHBalance)
        .mockResolvedValueOnce(underlyingETH);

      await adapter.getPositions(
        mockClient,
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        1
      );

      // Verify getEthValue was called with the rETH balance
      const getEthValueCall = vi.mocked(mockClient.readContract).mock.calls.find(
        (call: any) => call[0]?.functionName === 'getEthValue'
      );
      expect(getEthValueCall).toBeDefined();
      expect(getEthValueCall![0].args).toEqual([rETHBalance]);
    });
  });

  describe('getYieldRates', () => {
    it('should return yield rates for Ethereum', async () => {
      const result = await adapter.getYieldRates(mockClient, 1);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        protocol: 'rocket-pool',
        chainId: 1,
        assetSymbol: 'rETH',
        type: 'stake',
        apy: ROCKET_POOL_ESTIMATED_APR,
        apr: ROCKET_POOL_ESTIMATED_APR,
      });
      expect(result[0].asset).toBe('0xae78736Cd615f374D3085123A210448E74Fc6393');
    });

    it('should return yield rates for Arbitrum', async () => {
      const result = await adapter.getYieldRates(mockClient, 42161);

      expect(result).toHaveLength(1);
      expect(result[0].chainId).toBe(42161);
      expect(result[0].assetSymbol).toBe('rETH');
      expect(result[0].apy).toBe(ROCKET_POOL_ESTIMATED_APR);
      expect(result[0].asset).toBe('0xEC70Dcb4A1EFa46b8F2D97C310C9c4790ba5ffA8');
    });

    it('should return yield rates for Optimism', async () => {
      const result = await adapter.getYieldRates(mockClient, 10);

      expect(result).toHaveLength(1);
      expect(result[0].chainId).toBe(10);
      expect(result[0].apy).toBe(ROCKET_POOL_ESTIMATED_APR);
      expect(result[0].asset).toBe('0x9Bcef72be871e61ED4fBbc7630889beE758eb81D');
    });

    it('should return yield rates for Base', async () => {
      const result = await adapter.getYieldRates(mockClient, 8453);

      expect(result).toHaveLength(1);
      expect(result[0].chainId).toBe(8453);
      expect(result[0].apy).toBe(ROCKET_POOL_ESTIMATED_APR);
      expect(result[0].asset).toBe('0xB6fe221Fe9EeF5aBa221c348bA20A1Bf5e73624c');
    });

    it('should return empty array for unsupported chains', async () => {
      const result = await adapter.getYieldRates(mockClient, 137 as any);
      expect(result).toEqual([]);
    });

    it('should use correct APR value', () => {
      expect(ROCKET_POOL_ESTIMATED_APR).toBeCloseTo(0.032, 3);
    });
  });

  describe('getAddresses', () => {
    it('should return addresses for Ethereum mainnet', () => {
      const addresses = (adapter as any).getAddresses(1);
      expect(addresses).not.toBeNull();
      expect(addresses?.rETH).toBe('0xae78736Cd615f374D3085123A210448E74Fc6393');
    });

    it('should return addresses for Arbitrum', () => {
      const addresses = (adapter as any).getAddresses(42161);
      expect(addresses).not.toBeNull();
      expect(addresses?.rETH).toBe('0xEC70Dcb4A1EFa46b8F2D97C310C9c4790ba5ffA8');
    });

    it('should return addresses for Optimism', () => {
      const addresses = (adapter as any).getAddresses(10);
      expect(addresses).not.toBeNull();
      expect(addresses?.rETH).toBe('0x9Bcef72be871e61ED4fBbc7630889beE758eb81D');
    });

    it('should return addresses for Base', () => {
      const addresses = (adapter as any).getAddresses(8453);
      expect(addresses).not.toBeNull();
      expect(addresses?.rETH).toBe('0xB6fe221Fe9EeF5aBa221c348bA20A1Bf5e73624c');
    });

    it('should return null for unsupported chains', () => {
      const addresses = (adapter as any).getAddresses(137);
      expect(addresses).toBeNull();
    });
  });
});
