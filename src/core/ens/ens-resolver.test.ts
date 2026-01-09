import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Address } from 'viem';
import { ensResolver } from './ens-resolver';

// Mock viem/ens normalize function
vi.mock('viem/ens', () => ({
  normalize: vi.fn((name: string) => name.toLowerCase()),
}));

// Mock chain registry
vi.mock('@/chains', () => ({
  chainRegistry: {
    getClient: vi.fn(() => ({
      getEnsAddress: vi.fn(),
      getEnsName: vi.fn(),
      getEnsAvatar: vi.fn(),
    })),
  },
}));

describe('EnsResolver', () => {
  const mockAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0' as Address;

  beforeEach(() => {
    vi.clearAllMocks();
    ensResolver.clearCache();
  });

  describe('isEnsName', () => {
    it('should return true for .eth names', () => {
      expect(ensResolver.isEnsName('vitalik.eth')).toBe(true);
      expect(ensResolver.isEnsName('test.eth')).toBe(true);
      expect(ensResolver.isEnsName('my-wallet.eth')).toBe(true);
    });

    it('should return true for names with dots', () => {
      expect(ensResolver.isEnsName('subdomain.vitalik.eth')).toBe(true);
      expect(ensResolver.isEnsName('test.xyz')).toBe(true);
    });

    it('should return false for plain addresses', () => {
      expect(ensResolver.isEnsName('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0')).toBe(false);
    });

    it('should return false for strings without dots', () => {
      expect(ensResolver.isEnsName('notaname')).toBe(false);
      expect(ensResolver.isEnsName('')).toBe(false);
    });
  });

  describe('isValidAddress', () => {
    it('should return true for valid Ethereum addresses', () => {
      expect(ensResolver.isValidAddress('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0')).toBe(true);
      expect(ensResolver.isValidAddress('0x0000000000000000000000000000000000000000')).toBe(true);
      expect(ensResolver.isValidAddress('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48')).toBe(true);
    });

    it('should return false for invalid addresses', () => {
      expect(ensResolver.isValidAddress('0x742d35Cc')).toBe(false);
      expect(ensResolver.isValidAddress('742d35Cc6634C0532925a3b844Bc9e7595f0bEb0')).toBe(false);
      expect(ensResolver.isValidAddress('vitalik.eth')).toBe(false);
      expect(ensResolver.isValidAddress('')).toBe(false);
      expect(ensResolver.isValidAddress('0xGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG')).toBe(false);
    });
  });

  describe('resolveEns', () => {
    it('should resolve ENS name to address', async () => {
      const { chainRegistry } = await import('@/chains');
      const mockClient = {
        getEnsAddress: vi.fn().mockResolvedValue(mockAddress),
      };
      vi.mocked(chainRegistry.getClient).mockReturnValue(mockClient as any);

      const result = await ensResolver.resolveEns('vitalik.eth');

      expect(result).toBe(mockAddress);
      expect(mockClient.getEnsAddress).toHaveBeenCalledWith({ name: 'vitalik.eth' });
    });

    it('should return null for non-existent ENS names', async () => {
      const { chainRegistry } = await import('@/chains');
      const mockClient = {
        getEnsAddress: vi.fn().mockResolvedValue(null),
      };
      vi.mocked(chainRegistry.getClient).mockReturnValue(mockClient as any);

      const result = await ensResolver.resolveEns('nonexistent.eth');

      expect(result).toBe(null);
    });

    it('should cache resolved addresses', async () => {
      const { chainRegistry } = await import('@/chains');
      const mockClient = {
        getEnsAddress: vi.fn().mockResolvedValue(mockAddress),
      };
      vi.mocked(chainRegistry.getClient).mockReturnValue(mockClient as any);

      // First call
      await ensResolver.resolveEns('vitalik.eth');
      // Second call (should use cache)
      const result = await ensResolver.resolveEns('vitalik.eth');

      expect(result).toBe(mockAddress);
      expect(mockClient.getEnsAddress).toHaveBeenCalledTimes(1);
    });

    it('should handle RPC errors gracefully', async () => {
      const { chainRegistry } = await import('@/chains');
      const mockClient = {
        getEnsAddress: vi.fn().mockRejectedValue(new Error('RPC Error')),
      };
      vi.mocked(chainRegistry.getClient).mockReturnValue(mockClient as any);

      const result = await ensResolver.resolveEns('error.eth');

      expect(result).toBe(null);
    });

    it('should normalize ENS names to lowercase for caching', async () => {
      const { chainRegistry } = await import('@/chains');
      const mockClient = {
        getEnsAddress: vi.fn().mockResolvedValue(mockAddress),
      };
      vi.mocked(chainRegistry.getClient).mockReturnValue(mockClient as any);

      await ensResolver.resolveEns('VitalIK.eth');
      const result = await ensResolver.resolveEns('vitalik.eth');

      // Both should hit cache after first resolution
      expect(mockClient.getEnsAddress).toHaveBeenCalledTimes(1);
      expect(result).toBe(mockAddress);
    });
  });

  describe('getEnsName', () => {
    it('should return ENS name for an address (reverse resolution)', async () => {
      const { chainRegistry } = await import('@/chains');
      const mockClient = {
        getEnsName: vi.fn().mockResolvedValue('vitalik.eth'),
      };
      vi.mocked(chainRegistry.getClient).mockReturnValue(mockClient as any);

      const result = await ensResolver.getEnsName(mockAddress);

      expect(result).toBe('vitalik.eth');
      expect(mockClient.getEnsName).toHaveBeenCalledWith({ address: mockAddress });
    });

    it('should return null if no ENS name is set', async () => {
      const { chainRegistry } = await import('@/chains');
      const mockClient = {
        getEnsName: vi.fn().mockResolvedValue(null),
      };
      vi.mocked(chainRegistry.getClient).mockReturnValue(mockClient as any);

      const result = await ensResolver.getEnsName(mockAddress);

      expect(result).toBe(null);
    });

    it('should handle errors gracefully', async () => {
      const { chainRegistry } = await import('@/chains');
      const mockClient = {
        getEnsName: vi.fn().mockRejectedValue(new Error('RPC Error')),
      };
      vi.mocked(chainRegistry.getClient).mockReturnValue(mockClient as any);

      const result = await ensResolver.getEnsName(mockAddress);

      expect(result).toBe(null);
    });
  });

  describe('getEnsAvatar', () => {
    it('should return avatar URL for ENS name', async () => {
      const { chainRegistry } = await import('@/chains');
      const mockClient = {
        getEnsAvatar: vi.fn().mockResolvedValue('https://example.com/avatar.png'),
      };
      vi.mocked(chainRegistry.getClient).mockReturnValue(mockClient as any);

      const result = await ensResolver.getEnsAvatar('vitalik.eth');

      expect(result).toBe('https://example.com/avatar.png');
    });

    it('should return avatar URL for address (reverse lookup first)', async () => {
      const { chainRegistry } = await import('@/chains');
      const mockClient = {
        getEnsName: vi.fn().mockResolvedValue('vitalik.eth'),
        getEnsAvatar: vi.fn().mockResolvedValue('https://example.com/avatar.png'),
      };
      vi.mocked(chainRegistry.getClient).mockReturnValue(mockClient as any);

      const result = await ensResolver.getEnsAvatar(mockAddress);

      expect(mockClient.getEnsName).toHaveBeenCalledWith({ address: mockAddress });
      expect(result).toBe('https://example.com/avatar.png');
    });

    it('should return null if address has no ENS name', async () => {
      const { chainRegistry } = await import('@/chains');
      const mockClient = {
        getEnsName: vi.fn().mockResolvedValue(null),
      };
      vi.mocked(chainRegistry.getClient).mockReturnValue(mockClient as any);

      const result = await ensResolver.getEnsAvatar(mockAddress);

      expect(result).toBe(null);
    });

    it('should handle errors gracefully', async () => {
      const { chainRegistry } = await import('@/chains');
      const mockClient = {
        getEnsAvatar: vi.fn().mockRejectedValue(new Error('RPC Error')),
      };
      vi.mocked(chainRegistry.getClient).mockReturnValue(mockClient as any);

      const result = await ensResolver.getEnsAvatar('vitalik.eth');

      expect(result).toBe(null);
    });
  });

  describe('resolveToAddress', () => {
    it('should return address directly if valid address is provided', async () => {
      const { chainRegistry } = await import('@/chains');
      const mockClient = {
        getEnsName: vi.fn().mockResolvedValue('vitalik.eth'),
      };
      vi.mocked(chainRegistry.getClient).mockReturnValue(mockClient as any);

      const result = await ensResolver.resolveToAddress(mockAddress);

      expect(result.address).toBe(mockAddress);
      expect(result.isEns).toBe(false);
      expect(result.ensName).toBe('vitalik.eth');
    });

    it('should resolve ENS name to address', async () => {
      const { chainRegistry } = await import('@/chains');
      const mockClient = {
        getEnsAddress: vi.fn().mockResolvedValue(mockAddress),
      };
      vi.mocked(chainRegistry.getClient).mockReturnValue(mockClient as any);

      const result = await ensResolver.resolveToAddress('vitalik.eth');

      expect(result.address).toBe(mockAddress);
      expect(result.isEns).toBe(true);
      expect(result.ensName).toBe('vitalik.eth');
    });

    it('should return null for unresolvable ENS names', async () => {
      const { chainRegistry } = await import('@/chains');
      const mockClient = {
        getEnsAddress: vi.fn().mockResolvedValue(null),
      };
      vi.mocked(chainRegistry.getClient).mockReturnValue(mockClient as any);

      const result = await ensResolver.resolveToAddress('nonexistent.eth');

      expect(result.address).toBe(null);
      expect(result.isEns).toBe(true);
      expect(result.ensName).toBe(null);
    });

    it('should return null for invalid input', async () => {
      const result = await ensResolver.resolveToAddress('invalidinput');

      expect(result.address).toBe(null);
      expect(result.isEns).toBe(false);
      expect(result.ensName).toBe(null);
    });

    it('should trim whitespace from input', async () => {
      const { chainRegistry } = await import('@/chains');
      const mockClient = {
        getEnsName: vi.fn().mockResolvedValue(null),
      };
      vi.mocked(chainRegistry.getClient).mockReturnValue(mockClient as any);

      const result = await ensResolver.resolveToAddress(`  ${mockAddress}  `);

      expect(result.address).toBe(mockAddress);
    });
  });

  describe('batchResolve', () => {
    it('should resolve multiple names/addresses', async () => {
      const { chainRegistry } = await import('@/chains');
      const address2 = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as Address;

      const mockClient = {
        getEnsAddress: vi.fn()
          .mockResolvedValueOnce(mockAddress)
          .mockResolvedValueOnce(address2),
        getEnsName: vi.fn().mockResolvedValue(null),
      };
      vi.mocked(chainRegistry.getClient).mockReturnValue(mockClient as any);

      const results = await ensResolver.batchResolve(['vitalik.eth', 'test.eth']);

      expect(results.get('vitalik.eth')).toBe(mockAddress);
      expect(results.get('test.eth')).toBe(address2);
    });

    it('should handle partial failures', async () => {
      const { chainRegistry } = await import('@/chains');
      const mockClient = {
        getEnsAddress: vi.fn()
          .mockResolvedValueOnce(mockAddress)
          .mockResolvedValueOnce(null),
        getEnsName: vi.fn().mockResolvedValue(null),
      };
      vi.mocked(chainRegistry.getClient).mockReturnValue(mockClient as any);

      const results = await ensResolver.batchResolve(['vitalik.eth', 'nonexistent.eth']);

      expect(results.get('vitalik.eth')).toBe(mockAddress);
      expect(results.get('nonexistent.eth')).toBe(null);
    });
  });

  describe('clearCache', () => {
    it('should clear the ENS cache', async () => {
      const { chainRegistry } = await import('@/chains');
      const mockClient = {
        getEnsAddress: vi.fn().mockResolvedValue(mockAddress),
      };
      vi.mocked(chainRegistry.getClient).mockReturnValue(mockClient as any);

      // First call
      await ensResolver.resolveEns('vitalik.eth');

      // Clear cache
      ensResolver.clearCache();

      // Second call should not use cache
      await ensResolver.resolveEns('vitalik.eth');

      expect(mockClient.getEnsAddress).toHaveBeenCalledTimes(2);
    });
  });
});
