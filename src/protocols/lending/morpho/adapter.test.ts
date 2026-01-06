import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PublicClient } from 'viem';
import { MorphoAdapter } from './adapter';

describe('MorphoAdapter', () => {
  let adapter: MorphoAdapter;
  let mockClient: PublicClient;

  beforeEach(() => {
    adapter = new MorphoAdapter();
    mockClient = {
      readContract: vi.fn(),
    } as any;
  });

  describe('protocol configuration', () => {
    it('should have correct protocol metadata', () => {
      expect(adapter.protocol.id).toBe('morpho');
      expect(adapter.protocol.name).toBe('Morpho');
      expect(adapter.protocol.category).toBe('lending');
      expect(adapter.protocol.website).toBe('https://morpho.org');
    });

    it('should support Ethereum and Base chains', () => {
      expect(adapter.supportedChains).toEqual([1, 8453]);
      expect(adapter.supportedChains).toHaveLength(2);
    });
  });

  describe('hasPositions', () => {
    it('should return true when user has balance in first vault', async () => {
      vi.mocked(mockClient.readContract)
        .mockResolvedValueOnce(1000000000000000000n) // First vault has balance
        .mockResolvedValueOnce(0n) // Second vault no balance
        .mockResolvedValueOnce(0n); // Third vault no balance

      const result = await adapter.hasPositions(
        mockClient,
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        1
      );

      expect(result).toBe(true);
      expect(mockClient.readContract).toHaveBeenCalledTimes(3); // Checks first 3 vaults
    });

    it('should return true when user has balance in any of first 3 vaults', async () => {
      vi.mocked(mockClient.readContract)
        .mockResolvedValueOnce(0n) // First vault no balance
        .mockResolvedValueOnce(0n) // Second vault no balance
        .mockResolvedValueOnce(5000000000000000000n); // Third vault has balance

      const result = await adapter.hasPositions(
        mockClient,
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        1
      );

      expect(result).toBe(true);
    });

    it('should return false when user has no balance in any vault', async () => {
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

    it('should only check first 3 vaults for performance', async () => {
      vi.mocked(mockClient.readContract).mockResolvedValue(0n);

      await adapter.hasPositions(
        mockClient,
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        1
      );

      // Ethereum has 5 vaults, but should only check first 3
      expect(mockClient.readContract).toHaveBeenCalledTimes(3);
    });

    it('should work on Base chain', async () => {
      vi.mocked(mockClient.readContract)
        .mockResolvedValueOnce(1000000000000000000n)
        .mockResolvedValueOnce(0n);

      const result = await adapter.hasPositions(
        mockClient,
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        8453
      );

      expect(result).toBe(true);
      // Base has 2 vaults, should check both
      expect(mockClient.readContract).toHaveBeenCalledTimes(2);
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

    it('should return empty array when no vault balances', async () => {
      // Mock all 5 vault balances as 0
      vi.mocked(mockClient.readContract)
        .mockResolvedValueOnce(0n)
        .mockResolvedValueOnce(0n)
        .mockResolvedValueOnce(0n)
        .mockResolvedValueOnce(0n)
        .mockResolvedValueOnce(0n);

      const result = await adapter.getPositions(
        mockClient,
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        1
      );

      expect(result).toEqual([]);
    });

    it('should parse vault positions correctly', async () => {
      const vaultBalance = 1000000000000000000n; // 1 vault token
      const underlyingAmount = 1050000n; // 1.05 USDC (6 decimals)

      // Mock balanceOf for all 5 vaults (only first has balance)
      vi.mocked(mockClient.readContract)
        .mockResolvedValueOnce(vaultBalance)
        .mockResolvedValueOnce(0n)
        .mockResolvedValueOnce(0n)
        .mockResolvedValueOnce(0n)
        .mockResolvedValueOnce(0n)
        // Mock convertToAssets
        .mockResolvedValueOnce(underlyingAmount)
        // Mock getTokenDecimals (USDC has 6 decimals)
        .mockResolvedValueOnce(6)
        // Mock getTokenSymbol
        .mockResolvedValueOnce('USDC');

      const result = await adapter.getPositions(
        mockClient,
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        1
      );

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('supply');
      expect(result[0].protocol.id).toBe('morpho');
      expect(result[0].chainId).toBe(1);
      expect(result[0].tokens[0].symbol).toBe('steakUSDC');
      expect(result[0].tokens[0].decimals).toBe(18); // Vault tokens always 18 decimals
      expect(result[0].metadata?.vaultName).toBe('Morpho Steakhouse USDC');
      expect(result[0].metadata?.underlyingSymbol).toBe('USDC');
      expect(result[0].metadata?.underlyingAmount).toBe('1.05');
    });

    it('should handle multiple active vaults', async () => {
      const vault1Balance = 1000000000000000000n; // 1 steakUSDC
      const vault2Balance = 2000000000000000000n; // 2 steakETH
      const underlying1 = 1050000n; // 1.05 USDC
      const underlying2 = 2100000000000000000n; // 2.1 WETH

      // Mock balanceOf for all 5 vaults
      vi.mocked(mockClient.readContract)
        .mockResolvedValueOnce(vault1Balance)
        .mockResolvedValueOnce(vault2Balance)
        .mockResolvedValueOnce(0n)
        .mockResolvedValueOnce(0n)
        .mockResolvedValueOnce(0n)
        // Mock convertToAssets for both active vaults
        .mockResolvedValueOnce(underlying1)
        .mockResolvedValueOnce(underlying2)
        // Mock token info for vault 1 (USDC)
        .mockResolvedValueOnce(6)
        .mockResolvedValueOnce('USDC')
        // Mock token info for vault 2 (WETH)
        .mockResolvedValueOnce(18)
        .mockResolvedValueOnce('WETH');

      const result = await adapter.getPositions(
        mockClient,
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        1
      );

      expect(result).toHaveLength(2);
      expect(result[0].tokens[0].symbol).toBe('steakUSDC');
      expect(result[0].metadata?.underlyingSymbol).toBe('USDC');
      expect(result[1].tokens[0].symbol).toBe('steakETH');
      expect(result[1].metadata?.underlyingSymbol).toBe('WETH');
    });

    it('should skip vaults with zero balance', async () => {
      const vaultBalance = 1000000000000000000n;
      const underlyingAmount = 1050000n;

      // Mock balanceOf - only 3rd vault has balance
      vi.mocked(mockClient.readContract)
        .mockResolvedValueOnce(0n)
        .mockResolvedValueOnce(0n)
        .mockResolvedValueOnce(vaultBalance)
        .mockResolvedValueOnce(0n)
        .mockResolvedValueOnce(0n)
        // Mock convertToAssets (only called once for active vault)
        .mockResolvedValueOnce(underlyingAmount)
        // Mock token info
        .mockResolvedValueOnce(6)
        .mockResolvedValueOnce('USDC');

      const result = await adapter.getPositions(
        mockClient,
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        1
      );

      expect(result).toHaveLength(1);
      expect(result[0].tokens[0].symbol).toBe('gtUSDC'); // 3rd vault
    });

    it('should work on Base chain', async () => {
      const vaultBalance = 5000000000000000000n;
      const underlyingAmount = 5100000n;

      // Base has 2 vaults
      vi.mocked(mockClient.readContract)
        .mockResolvedValueOnce(vaultBalance)
        .mockResolvedValueOnce(0n)
        .mockResolvedValueOnce(underlyingAmount)
        .mockResolvedValueOnce(6)
        .mockResolvedValueOnce('USDC');

      const result = await adapter.getPositions(
        mockClient,
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        8453
      );

      expect(result).toHaveLength(1);
      expect(result[0].chainId).toBe(8453);
      expect(result[0].tokens[0].symbol).toBe('mwUSDC');
    });

    it('should include vault metadata', async () => {
      const vaultBalance = 1000000000000000000n;
      const underlyingAmount = 1050000000000000000n;

      vi.mocked(mockClient.readContract)
        .mockResolvedValueOnce(0n)
        .mockResolvedValueOnce(vaultBalance) // steakETH vault
        .mockResolvedValueOnce(0n)
        .mockResolvedValueOnce(0n)
        .mockResolvedValueOnce(0n)
        .mockResolvedValueOnce(underlyingAmount)
        .mockResolvedValueOnce(18)
        .mockResolvedValueOnce('WETH');

      const result = await adapter.getPositions(
        mockClient,
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        1
      );

      expect(result[0].metadata).toMatchObject({
        vaultName: 'Morpho Steakhouse ETH',
        underlyingAsset: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
        underlyingSymbol: 'WETH',
        underlyingAmount: '1.05',
      });
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

    it('should call convertToAssets to get underlying amount', async () => {
      const vaultBalance = 1000000000000000000n;

      vi.mocked(mockClient.readContract)
        .mockResolvedValueOnce(vaultBalance)
        .mockResolvedValueOnce(0n)
        .mockResolvedValueOnce(0n)
        .mockResolvedValueOnce(0n)
        .mockResolvedValueOnce(0n)
        .mockResolvedValueOnce(1050000n) // convertToAssets result
        .mockResolvedValueOnce(6)
        .mockResolvedValueOnce('USDC');

      await adapter.getPositions(
        mockClient,
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        1
      );

      // Verify convertToAssets was called with the vault balance
      const convertToAssetsCall = vi.mocked(mockClient.readContract).mock.calls.find(
        (call: any) => call[0]?.functionName === 'convertToAssets'
      );
      expect(convertToAssetsCall).toBeDefined();
      expect(convertToAssetsCall![0].args).toEqual([vaultBalance]);
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

    it('should return empty array for Base chain', async () => {
      const result = await adapter.getYieldRates(mockClient, 8453);
      expect(result).toEqual([]);
    });
  });

  describe('getAddresses', () => {
    it('should return addresses for Ethereum mainnet', () => {
      const addresses = (adapter as any).getAddresses(1);
      expect(addresses).not.toBeNull();
      expect(addresses?.morphoBlue).toBeDefined();
      expect(addresses?.metaMorphoFactory).toBeDefined();
      expect(addresses?.vaults).toBeDefined();
      expect(addresses?.vaults.length).toBe(5);
    });

    it('should return addresses for Base', () => {
      const addresses = (adapter as any).getAddresses(8453);
      expect(addresses).not.toBeNull();
      expect(addresses?.morphoBlue).toBeDefined();
      expect(addresses?.metaMorphoFactory).toBeDefined();
      expect(addresses?.vaults).toBeDefined();
      expect(addresses?.vaults.length).toBe(2);
    });

    it('should return null for unsupported chains', () => {
      const addresses = (adapter as any).getAddresses(42161);
      expect(addresses).toBeNull();
    });
  });
});
