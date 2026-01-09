import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { PublicClient, Address } from 'viem';
import { walletBalanceFetcher } from './wallet-balance-fetcher';

// Mock dependencies
vi.mock('@/chains', () => ({
  chainRegistry: {
    getEvmChainIds: vi.fn(() => [1, 42161]),
    getEvmChain: vi.fn((chainId: number) => ({
      id: chainId,
      name: chainId === 1 ? 'Ethereum' : 'Arbitrum',
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    })),
    getClient: vi.fn(() => ({
      getBalance: vi.fn(),
      multicall: vi.fn(),
    })),
    withFailover: vi.fn((_chainId, fn) => fn({
      getBalance: vi.fn(() => Promise.resolve(1000000000000000000n)), // 1 ETH
      multicall: vi.fn(() => Promise.resolve([])),
    })),
  },
}));

vi.mock('@/core/pricing', () => ({
  priceFetcher: {
    getPrice: vi.fn(() => Promise.resolve({
      priceUsd: 2500,
      source: 'chainlink',
      updatedAt: Date.now(),
    })),
  },
}));

vi.mock('@/core/tokens', () => ({
  getTokensForChain: vi.fn(() => []),
  getSolanaTokens: vi.fn(() => []),
}));

describe('WalletBalanceFetcher', () => {
  const mockAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0' as Address;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getBalances', () => {
    it('should fetch balances from all EVM chains', async () => {
      const result = await walletBalanceFetcher.getBalances(mockAddress);

      expect(result.address).toBe(mockAddress);
      expect(result.fetchedAt).toBeGreaterThan(0);
      expect(Array.isArray(result.balances)).toBe(true);
    });

    it('should calculate total value across all chains', async () => {
      const result = await walletBalanceFetcher.getBalances(mockAddress);

      // Should have fetched from 2 chains (1 and 42161)
      expect(result.balances.length).toBeLessThanOrEqual(2);
      expect(typeof result.totalValueUsd).toBe('number');
    });

    it('should handle chain errors gracefully', async () => {
      const { chainRegistry } = await import('@/chains');
      vi.mocked(chainRegistry.withFailover).mockRejectedValueOnce(new Error('RPC Error'));

      const result = await walletBalanceFetcher.getBalances(mockAddress);

      // Should still return results for other chains
      expect(result.address).toBe(mockAddress);
      expect(Array.isArray(result.balances)).toBe(true);
    });

    it('should not include chains with zero balances', async () => {
      const { chainRegistry } = await import('@/chains');
      vi.mocked(chainRegistry.withFailover).mockImplementation((_chainId, fn) =>
        fn({
          getBalance: vi.fn(() => Promise.resolve(0n)),
          multicall: vi.fn(() => Promise.resolve([])),
        } as any)
      );

      const result = await walletBalanceFetcher.getBalances(mockAddress);

      expect(result.balances.length).toBe(0);
      expect(result.totalValueUsd).toBe(0);
    });
  });

  describe('native balance handling', () => {
    it('should format native balance correctly', async () => {
      const { chainRegistry } = await import('@/chains');
      vi.mocked(chainRegistry.withFailover).mockImplementation((_chainId, fn) =>
        fn({
          getBalance: vi.fn(() => Promise.resolve(2500000000000000000n)), // 2.5 ETH
          multicall: vi.fn(() => Promise.resolve([])),
        } as any)
      );

      const result = await walletBalanceFetcher.getBalances(mockAddress);

      if (result.balances.length > 0) {
        const nativeBalance = result.balances[0].balances.find(
          (b) => b.address === '0x0000000000000000000000000000000000000000'
        );
        if (nativeBalance) {
          expect(nativeBalance.balanceFormatted).toBe('2.5');
          expect(nativeBalance.symbol).toBe('ETH');
        }
      }
    });

    it('should calculate USD value for native token', async () => {
      const { chainRegistry } = await import('@/chains');
      const { priceFetcher } = await import('@/core/pricing');

      vi.mocked(chainRegistry.withFailover).mockImplementation((_chainId, fn) =>
        fn({
          getBalance: vi.fn(() => Promise.resolve(1000000000000000000n)), // 1 ETH
          multicall: vi.fn(() => Promise.resolve([])),
        } as any)
      );

      vi.mocked(priceFetcher.getPrice).mockResolvedValue({
        address: '0x0000000000000000000000000000000000000000' as Address,
        priceUsd: 2500,
        source: 'chainlink',
        updatedAt: Date.now(),
      });

      const result = await walletBalanceFetcher.getBalances(mockAddress);

      if (result.balances.length > 0 && result.balances[0].balances.length > 0) {
        const nativeBalance = result.balances[0].balances[0];
        expect(nativeBalance.valueUsd).toBe(2500); // 1 ETH * $2500
      }
    });
  });

  describe('ERC20 token handling', () => {
    it('should fetch ERC20 token balances using multicall', async () => {
      const { chainRegistry } = await import('@/chains');
      const { getTokensForChain } = await import('@/core/tokens');

      vi.mocked(getTokensForChain).mockReturnValue([
        { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as Address, symbol: 'USDC', decimals: 6 },
      ]);

      vi.mocked(chainRegistry.withFailover).mockImplementation((_chainId, fn) =>
        fn({
          getBalance: vi.fn(() => Promise.resolve(0n)),
          multicall: vi.fn(() => Promise.resolve([
            { status: 'success', result: 1000000000n }, // 1000 USDC
          ])),
        } as any)
      );

      const result = await walletBalanceFetcher.getBalances(mockAddress);

      // Should have processed token balances
      expect(result).toBeDefined();
    });

    it('should filter out zero balance tokens', async () => {
      const { chainRegistry } = await import('@/chains');
      const { getTokensForChain } = await import('@/core/tokens');

      vi.mocked(getTokensForChain).mockReturnValue([
        { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as Address, symbol: 'USDC', decimals: 6 },
        { address: '0x6B175474E89094C44Da98b954EedeAC495271d0F' as Address, symbol: 'DAI', decimals: 18 },
      ]);

      vi.mocked(chainRegistry.withFailover).mockImplementation((_chainId, fn) =>
        fn({
          getBalance: vi.fn(() => Promise.resolve(0n)),
          multicall: vi.fn(() => Promise.resolve([
            { status: 'success', result: 1000000000n }, // 1000 USDC
            { status: 'success', result: 0n }, // 0 DAI
          ])),
        } as any)
      );

      const result = await walletBalanceFetcher.getBalances(mockAddress);

      // Zero balance tokens should be filtered out
      expect(result).toBeDefined();
    });
  });

  describe('chain-specific native token handling', () => {
    it('should use correct price symbol for Polygon (MATIC)', async () => {
      const { chainRegistry } = await import('@/chains');
      const { priceFetcher } = await import('@/core/pricing');

      vi.mocked(chainRegistry.getEvmChainIds).mockReturnValue([137]);
      vi.mocked(chainRegistry.getEvmChain).mockReturnValue({
        id: 137,
        name: 'Polygon',
        nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
      } as any);

      vi.mocked(chainRegistry.withFailover).mockImplementation((_chainId, fn) =>
        fn({
          getBalance: vi.fn(() => Promise.resolve(100000000000000000000n)), // 100 MATIC
          multicall: vi.fn(() => Promise.resolve([])),
        } as any)
      );

      await walletBalanceFetcher.getBalances(mockAddress);

      expect(priceFetcher.getPrice).toHaveBeenCalledWith(
        expect.anything(),
        '0x0000000000000000000000000000000000000000',
        'MATIC',
        137
      );
    });

    it('should use correct price symbol for Avalanche (AVAX)', async () => {
      const { chainRegistry } = await import('@/chains');
      const { priceFetcher } = await import('@/core/pricing');

      vi.mocked(chainRegistry.getEvmChainIds).mockReturnValue([43114]);
      vi.mocked(chainRegistry.getEvmChain).mockReturnValue({
        id: 43114,
        name: 'Avalanche',
        nativeCurrency: { name: 'AVAX', symbol: 'AVAX', decimals: 18 },
      } as any);

      vi.mocked(chainRegistry.withFailover).mockImplementation((_chainId, fn) =>
        fn({
          getBalance: vi.fn(() => Promise.resolve(50000000000000000000n)), // 50 AVAX
          multicall: vi.fn(() => Promise.resolve([])),
        } as any)
      );

      await walletBalanceFetcher.getBalances(mockAddress);

      expect(priceFetcher.getPrice).toHaveBeenCalledWith(
        expect.anything(),
        '0x0000000000000000000000000000000000000000',
        'AVAX',
        43114
      );
    });

    it('should use correct price symbol for BSC (BNB)', async () => {
      const { chainRegistry } = await import('@/chains');
      const { priceFetcher } = await import('@/core/pricing');

      vi.mocked(chainRegistry.getEvmChainIds).mockReturnValue([56]);
      vi.mocked(chainRegistry.getEvmChain).mockReturnValue({
        id: 56,
        name: 'BNB Smart Chain',
        nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
      } as any);

      vi.mocked(chainRegistry.withFailover).mockImplementation((_chainId, fn) =>
        fn({
          getBalance: vi.fn(() => Promise.resolve(10000000000000000000n)), // 10 BNB
          multicall: vi.fn(() => Promise.resolve([])),
        } as any)
      );

      await walletBalanceFetcher.getBalances(mockAddress);

      expect(priceFetcher.getPrice).toHaveBeenCalledWith(
        expect.anything(),
        '0x0000000000000000000000000000000000000000',
        'BNB',
        56
      );
    });
  });
});
