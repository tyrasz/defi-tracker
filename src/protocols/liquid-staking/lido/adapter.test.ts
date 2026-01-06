import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PublicClient } from 'viem';
import { LidoAdapter } from './adapter';
import { LIDO_ESTIMATED_APR } from './addresses';

describe('LidoAdapter', () => {
  let adapter: LidoAdapter;
  let mockClient: PublicClient;

  beforeEach(() => {
    adapter = new LidoAdapter();
    mockClient = {
      readContract: vi.fn(),
    } as any;
  });

  describe('protocol configuration', () => {
    it('should have correct protocol metadata', () => {
      expect(adapter.protocol.id).toBe('lido');
      expect(adapter.protocol.name).toBe('Lido');
      expect(adapter.protocol.category).toBe('liquid-staking');
      expect(adapter.protocol.website).toBe('https://lido.fi');
    });

    it('should support Ethereum, Arbitrum, Optimism, and Base', () => {
      expect(adapter.supportedChains).toEqual([1, 42161, 10, 8453]);
      expect(adapter.supportedChains).toHaveLength(4);
    });
  });

  describe('hasPositions', () => {
    it('should return true when user has stETH on mainnet', async () => {
      vi.mocked(mockClient.readContract)
        .mockResolvedValueOnce(1000000000000000000n) // stETH balance
        .mockResolvedValueOnce(0n); // wstETH balance

      const result = await adapter.hasPositions(
        mockClient,
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        1
      );

      expect(result).toBe(true);
    });

    it('should return true when user has wstETH', async () => {
      vi.mocked(mockClient.readContract)
        .mockResolvedValueOnce(0n) // stETH balance
        .mockResolvedValueOnce(2000000000000000000n); // wstETH balance

      const result = await adapter.hasPositions(
        mockClient,
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        1
      );

      expect(result).toBe(true);
    });

    it('should return true when user has both stETH and wstETH', async () => {
      vi.mocked(mockClient.readContract)
        .mockResolvedValueOnce(1000000000000000000n)
        .mockResolvedValueOnce(2000000000000000000n);

      const result = await adapter.hasPositions(
        mockClient,
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        1
      );

      expect(result).toBe(true);
    });

    it('should return false when user has no balance', async () => {
      vi.mocked(mockClient.readContract)
        .mockResolvedValueOnce(0n)
        .mockResolvedValueOnce(0n);

      const result = await adapter.hasPositions(
        mockClient,
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        1
      );

      expect(result).toBe(false);
    });

    it('should only check wstETH on L2s (stETH address is 0x0)', async () => {
      // On Arbitrum, stETH address is 0x0000..., so it should skip stETH check
      vi.mocked(mockClient.readContract)
        .mockResolvedValueOnce(1000000000000000000n); // Only wstETH balance

      const result = await adapter.hasPositions(
        mockClient,
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        42161
      );

      expect(result).toBe(true);
      // Should only call readContract once for wstETH
      expect(mockClient.readContract).toHaveBeenCalledTimes(1);
    });

    it('should work on Optimism', async () => {
      vi.mocked(mockClient.readContract).mockResolvedValueOnce(5000000000000000000n);

      const result = await adapter.hasPositions(
        mockClient,
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        10
      );

      expect(result).toBe(true);
    });

    it('should work on Base', async () => {
      vi.mocked(mockClient.readContract).mockResolvedValueOnce(3000000000000000000n);

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

    it('should parse stETH position on mainnet', async () => {
      const stETHBalance = 5000000000000000000n; // 5 stETH
      const wstETHBalance = 0n;

      vi.mocked(mockClient.readContract)
        .mockResolvedValueOnce(stETHBalance)
        .mockResolvedValueOnce(wstETHBalance);

      const result = await adapter.getPositions(
        mockClient,
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        1
      );

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('lido-steth-1');
      expect(result[0].type).toBe('stake');
      expect(result[0].protocol.id).toBe('lido');
      expect(result[0].tokens[0].symbol).toBe('stETH');
      expect(result[0].tokens[0].balance).toBe(stETHBalance);
      expect(result[0].tokens[0].balanceFormatted).toBe('5');
      expect(result[0].yield?.apy).toBe(LIDO_ESTIMATED_APR);
      expect(result[0].yield?.apr).toBe(LIDO_ESTIMATED_APR);
    });

    it('should parse wstETH position with underlying stETH', async () => {
      const wstETHBalance = 2000000000000000000n; // 2 wstETH
      const underlyingStETH = 2200000000000000000n; // 2.2 stETH

      // On mainnet, first check stETH (0), then wstETH
      vi.mocked(mockClient.readContract)
        .mockResolvedValueOnce(0n) // stETH balance
        .mockResolvedValueOnce(wstETHBalance) // wstETH balance
        .mockResolvedValueOnce(underlyingStETH); // getStETHByWstETH

      const result = await adapter.getPositions(
        mockClient,
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        1
      );

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('lido-wsteth-1');
      expect(result[0].type).toBe('stake');
      expect(result[0].tokens[0].symbol).toBe('wstETH');
      expect(result[0].tokens[0].balance).toBe(wstETHBalance);
      expect(result[0].tokens[0].balanceFormatted).toBe('2');
      expect(result[0].metadata?.underlyingStETH).toBe('2.2');
      expect(result[0].yield?.apy).toBe(LIDO_ESTIMATED_APR);
    });

    it('should return both stETH and wstETH positions when user has both', async () => {
      const stETHBalance = 3000000000000000000n;
      const wstETHBalance = 1000000000000000000n;
      const underlyingStETH = 1100000000000000000n;

      vi.mocked(mockClient.readContract)
        .mockResolvedValueOnce(stETHBalance)
        .mockResolvedValueOnce(wstETHBalance)
        .mockResolvedValueOnce(underlyingStETH);

      const result = await adapter.getPositions(
        mockClient,
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        1
      );

      expect(result).toHaveLength(2);
      expect(result[0].tokens[0].symbol).toBe('stETH');
      expect(result[1].tokens[0].symbol).toBe('wstETH');
    });

    it('should skip stETH on L2 chains', async () => {
      const wstETHBalance = 4000000000000000000n;
      const underlyingStETH = 4400000000000000000n;

      vi.mocked(mockClient.readContract)
        .mockResolvedValueOnce(wstETHBalance)
        .mockResolvedValueOnce(underlyingStETH);

      const result = await adapter.getPositions(
        mockClient,
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        42161
      );

      expect(result).toHaveLength(1);
      expect(result[0].tokens[0].symbol).toBe('wstETH');
      expect(result[0].chainId).toBe(42161);
      // Should only call for wstETH balance and underlying
      expect(mockClient.readContract).toHaveBeenCalledTimes(2);
    });

    it('should use 1:1 fallback if getStETHByWstETH fails', async () => {
      const wstETHBalance = 1000000000000000000n;

      vi.mocked(mockClient.readContract)
        .mockResolvedValueOnce(wstETHBalance)
        .mockRejectedValueOnce(new Error('Contract error'));

      const result = await adapter.getPositions(
        mockClient,
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        42161
      );

      expect(result).toHaveLength(1);
      expect(result[0].metadata?.underlyingStETH).toBe('1'); // Uses wstETH balance as fallback
    });

    it('should skip zero balances', async () => {
      vi.mocked(mockClient.readContract)
        .mockResolvedValueOnce(0n) // stETH
        .mockResolvedValueOnce(0n); // wstETH

      const result = await adapter.getPositions(
        mockClient,
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        1
      );

      expect(result).toEqual([]);
    });

    it('should work on Optimism', async () => {
      const wstETHBalance = 2000000000000000000n;
      const underlyingStETH = 2100000000000000000n;

      vi.mocked(mockClient.readContract)
        .mockResolvedValueOnce(wstETHBalance)
        .mockResolvedValueOnce(underlyingStETH);

      const result = await adapter.getPositions(
        mockClient,
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        10
      );

      expect(result).toHaveLength(1);
      expect(result[0].chainId).toBe(10);
      expect(result[0].tokens[0].symbol).toBe('wstETH');
    });

    it('should work on Base', async () => {
      const wstETHBalance = 3000000000000000000n;
      const underlyingStETH = 3300000000000000000n;

      vi.mocked(mockClient.readContract)
        .mockResolvedValueOnce(wstETHBalance)
        .mockResolvedValueOnce(underlyingStETH);

      const result = await adapter.getPositions(
        mockClient,
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        8453
      );

      expect(result).toHaveLength(1);
      expect(result[0].chainId).toBe(8453);
      expect(result[0].tokens[0].symbol).toBe('wstETH');
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
      const wstETHBalance = 1000000000000000000n;
      const underlyingStETH = 1050000000000000000n;

      vi.mocked(mockClient.readContract)
        .mockResolvedValueOnce(wstETHBalance)
        .mockResolvedValueOnce(underlyingStETH);

      const result = await adapter.getPositions(
        mockClient,
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        42161
      );

      expect(result[0].yield).toEqual({
        apy: LIDO_ESTIMATED_APR,
        apr: LIDO_ESTIMATED_APR,
      });
    });
  });

  describe('getYieldRates', () => {
    it('should return yield rates for Ethereum', async () => {
      const result = await adapter.getYieldRates(mockClient, 1);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        protocol: 'lido',
        chainId: 1,
        assetSymbol: 'wstETH',
        type: 'stake',
        apy: LIDO_ESTIMATED_APR,
        apr: LIDO_ESTIMATED_APR,
      });
      expect(result[0].asset).toBe('0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0');
    });

    it('should return yield rates for Arbitrum', async () => {
      const result = await adapter.getYieldRates(mockClient, 42161);

      expect(result).toHaveLength(1);
      expect(result[0].chainId).toBe(42161);
      expect(result[0].assetSymbol).toBe('wstETH');
      expect(result[0].apy).toBe(LIDO_ESTIMATED_APR);
    });

    it('should return yield rates for Optimism', async () => {
      const result = await adapter.getYieldRates(mockClient, 10);

      expect(result).toHaveLength(1);
      expect(result[0].chainId).toBe(10);
      expect(result[0].apy).toBe(LIDO_ESTIMATED_APR);
    });

    it('should return yield rates for Base', async () => {
      const result = await adapter.getYieldRates(mockClient, 8453);

      expect(result).toHaveLength(1);
      expect(result[0].chainId).toBe(8453);
      expect(result[0].apy).toBe(LIDO_ESTIMATED_APR);
    });

    it('should return empty array for unsupported chains', async () => {
      const result = await adapter.getYieldRates(mockClient, 137 as any);
      expect(result).toEqual([]);
    });

    it('should use correct APR value', () => {
      expect(LIDO_ESTIMATED_APR).toBeCloseTo(0.034, 3);
    });
  });

  describe('getAddresses', () => {
    it('should return addresses for Ethereum mainnet', () => {
      const addresses = (adapter as any).getAddresses(1);
      expect(addresses).not.toBeNull();
      expect(addresses?.stETH).toBe('0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84');
      expect(addresses?.wstETH).toBe('0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0');
    });

    it('should return addresses for Arbitrum', () => {
      const addresses = (adapter as any).getAddresses(42161);
      expect(addresses).not.toBeNull();
      expect(addresses?.stETH).toBe('0x0000000000000000000000000000000000000000');
      expect(addresses?.wstETH).toBe('0x5979D7b546E38E414F7E9822514be443A4800529');
    });

    it('should return addresses for Optimism', () => {
      const addresses = (adapter as any).getAddresses(10);
      expect(addresses).not.toBeNull();
      expect(addresses?.stETH).toBe('0x0000000000000000000000000000000000000000');
      expect(addresses?.wstETH).toBe('0x1F32b1c2345538c0c6f582fCB022739c4A194Ebb');
    });

    it('should return addresses for Base', () => {
      const addresses = (adapter as any).getAddresses(8453);
      expect(addresses).not.toBeNull();
      expect(addresses?.stETH).toBe('0x0000000000000000000000000000000000000000');
      expect(addresses?.wstETH).toBe('0xc1CBa3fCea344f92D9239c08C0568f6F2F0ee452');
    });

    it('should return null for unsupported chains', () => {
      const addresses = (adapter as any).getAddresses(137);
      expect(addresses).toBeNull();
    });
  });
});
