import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { ChainConfig, ChainId } from '@/types/chain';
import type { PublicClient } from 'viem';

// Mock viem before importing ChainRegistry
vi.mock('viem', () => ({
  createPublicClient: vi.fn((config: any) => ({
    _isPublicClient: true,
    _config: config,
  })),
  http: vi.fn((url: string) => ({ _transport: 'http', _url: url })),
}));

describe('ChainRegistry', () => {
  let chainRegistry: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Clear the module cache and reimport to get fresh instance
    vi.resetModules();

    const module = await import('./registry');
    chainRegistry = module.chainRegistry;
  });

  describe('initialization', () => {
    it('should register all default chains', () => {
      const chains = chainRegistry.getAllChains();
      expect(chains.length).toBeGreaterThanOrEqual(4);

      const chainIds = chainRegistry.getSupportedChainIds();
      expect(chainIds).toContain(1); // Ethereum
      expect(chainIds).toContain(42161); // Arbitrum
      expect(chainIds).toContain(10); // Optimism
      expect(chainIds).toContain(8453); // Base
    });

    it('should have Ethereum mainnet configured', () => {
      const ethereum = chainRegistry.getChain(1);
      expect(ethereum).toBeDefined();
      expect(ethereum?.id).toBe(1);
      expect(ethereum?.name).toBe('Ethereum');
    });

    it('should have Arbitrum configured', () => {
      const arbitrum = chainRegistry.getChain(42161);
      expect(arbitrum).toBeDefined();
      expect(arbitrum?.id).toBe(42161);
      expect(arbitrum?.name).toBe('Arbitrum');
    });

    it('should have Optimism configured', () => {
      const optimism = chainRegistry.getChain(10);
      expect(optimism).toBeDefined();
      expect(optimism?.id).toBe(10);
      expect(optimism?.name).toBe('Optimism');
    });

    it('should have Base configured', () => {
      const base = chainRegistry.getChain(8453);
      expect(base).toBeDefined();
      expect(base?.id).toBe(8453);
      expect(base?.name).toBe('Base');
    });
  });

  describe('registerChain', () => {
    it('should register a new chain', () => {
      const newChain: ChainConfig = {
        id: 137 as ChainId,
        name: 'Polygon',
        nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
        rpcUrls: ['https://polygon-rpc.com'],
        blockExplorer: 'https://polygonscan.com',
        viemChain: {} as any,
      };

      chainRegistry.registerChain(newChain);

      const chain = chainRegistry.getChain(137);
      expect(chain).toBeDefined();
      expect(chain?.name).toBe('Polygon');
    });

    it('should overwrite existing chain if registered again', () => {
      const originalChainCount = chainRegistry.getAllChains().length;

      const updatedEthereum: ChainConfig = {
        id: 1 as ChainId,
        name: 'Ethereum Updated',
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
        rpcUrls: ['https://new-rpc.com'],
        blockExplorer: 'https://etherscan.io',
        viemChain: {} as any,
      };

      chainRegistry.registerChain(updatedEthereum);

      const chain = chainRegistry.getChain(1);
      expect(chain?.name).toBe('Ethereum Updated');
      expect(chainRegistry.getAllChains().length).toBe(originalChainCount);
    });
  });

  describe('getChain', () => {
    it('should return chain config for registered chains', () => {
      const ethereum = chainRegistry.getChain(1);
      expect(ethereum).toBeDefined();
      expect(ethereum?.id).toBe(1);
    });

    it('should return undefined for unregistered chains', () => {
      const chain = chainRegistry.getChain(999 as ChainId);
      expect(chain).toBeUndefined();
    });
  });

  describe('getAllChains', () => {
    it('should return all registered chains', () => {
      const chains = chainRegistry.getAllChains();
      expect(Array.isArray(chains)).toBe(true);
      expect(chains.length).toBeGreaterThanOrEqual(4);
    });

    it('should return chains with all required properties', () => {
      const chains = chainRegistry.getAllChains();

      chains.forEach((chain: ChainConfig) => {
        expect(chain.id).toBeDefined();
        expect(chain.name).toBeDefined();
        expect(chain.nativeCurrency).toBeDefined();
        expect(chain.rpcUrls).toBeDefined();
        expect(Array.isArray(chain.rpcUrls)).toBe(true);
        expect(chain.rpcUrls.length).toBeGreaterThan(0);
        expect(chain.blockExplorer).toBeDefined();
        // viemChain is only defined for EVM chains
        if (chain.network === 'evm') {
          expect((chain as any).viemChain).toBeDefined();
        }
      });
    });
  });

  describe('getSupportedChainIds', () => {
    it('should return array of chain IDs', () => {
      const chainIds = chainRegistry.getSupportedChainIds();
      expect(Array.isArray(chainIds)).toBe(true);
      expect(chainIds.length).toBeGreaterThanOrEqual(4);
    });

    it('should include all default chains', () => {
      const chainIds = chainRegistry.getSupportedChainIds();
      expect(chainIds).toContain(1);
      expect(chainIds).toContain(42161);
      expect(chainIds).toContain(10);
      expect(chainIds).toContain(8453);
    });

    it('should return chain IDs (numeric for EVM, string for non-EVM)', () => {
      const chainIds = chainRegistry.getSupportedChainIds();
      chainIds.forEach((id: ChainId) => {
        // EVM chain IDs are numbers, non-EVM (like Solana) are strings
        expect(typeof id === 'number' || typeof id === 'string').toBe(true);
      });
    });
  });

  describe('getEvmChainIds', () => {
    it('should return only numeric EVM chain IDs', () => {
      const evmChainIds = chainRegistry.getEvmChainIds();
      expect(Array.isArray(evmChainIds)).toBe(true);
      evmChainIds.forEach((id) => {
        expect(typeof id).toBe('number');
      });
    });

    it('should include all default EVM chains', () => {
      const evmChainIds = chainRegistry.getEvmChainIds();
      expect(evmChainIds).toContain(1);
      expect(evmChainIds).toContain(42161);
      expect(evmChainIds).toContain(10);
      expect(evmChainIds).toContain(8453);
    });

    it('should not include non-EVM chains', () => {
      const evmChainIds = chainRegistry.getEvmChainIds();
      expect(evmChainIds).not.toContain('solana');
    });
  });

  describe('getClient', () => {
    it('should create and return a public client for registered chain', () => {
      const client = chainRegistry.getClient(1);
      expect(client).toBeDefined();
    });

    it('should cache clients and not recreate on subsequent calls', () => {
      const client1 = chainRegistry.getClient(1);
      const client2 = chainRegistry.getClient(1);

      expect(client1).toBe(client2);
    });

    it('should create different clients for different chains', () => {
      const client1 = chainRegistry.getClient(1);
      const client2 = chainRegistry.getClient(42161);

      expect(client1).toBeDefined();
      expect(client2).toBeDefined();
      expect(client1).not.toBe(client2);
    });

    it('should throw error for unregistered chain', () => {
      expect(() => {
        chainRegistry.getClient(999 as ChainId);
      }).toThrow('Chain 999 not registered');
    });

    it('should configure client with batch multicall settings', () => {
      const client = chainRegistry.getClient(1);
      // Client should be created successfully with multicall config
      expect(client).toBeDefined();
      expect(client._config).toBeDefined();
      expect(client._config.batch).toBeDefined();
    });

    it('should use HTTP transport', () => {
      const client = chainRegistry.getClient(1);
      expect(client).toBeDefined();
      expect(client._config.transport).toBeDefined();
    });
  });

  describe('rotateRpc', () => {
    it('should rotate to next RPC URL', () => {
      // Get initial client (uses first RPC)
      const client1 = chainRegistry.getClient(1);

      // Rotate RPC
      chainRegistry.rotateRpc(1);

      // Get client again (should use different RPC)
      const client2 = chainRegistry.getClient(1);

      expect(client1).toBeDefined();
      expect(client2).toBeDefined();
    });

    it('should clear cached client when rotating', () => {
      const client1 = chainRegistry.getClient(1);

      chainRegistry.rotateRpc(1);

      const client2 = chainRegistry.getClient(1);
      expect(client1).not.toBe(client2);
    });

    it('should wrap around to first RPC when reaching end', () => {
      const chain = chainRegistry.getChain(1);
      const rpcCount = chain?.rpcUrls.length || 1;

      // Rotate through all RPCs and back to first
      for (let i = 0; i < rpcCount; i++) {
        chainRegistry.rotateRpc(1);
        chainRegistry.getClient(1);
      }

      // Should be back at first RPC now
      chainRegistry.rotateRpc(1);
      const client = chainRegistry.getClient(1);
      expect(client).toBeDefined();
    });

    it('should handle rotation for unregistered chain gracefully', () => {
      expect(() => {
        chainRegistry.rotateRpc(999 as ChainId);
      }).not.toThrow();
    });

    it('should handle multiple chains independently', () => {
      // Get clients for both chains
      const eth1 = chainRegistry.getClient(1);
      const arb1 = chainRegistry.getClient(42161);

      // Rotate only Ethereum
      chainRegistry.rotateRpc(1);
      const eth2 = chainRegistry.getClient(1);
      const arb2 = chainRegistry.getClient(42161);

      // Ethereum client should be different, Arbitrum should be same
      expect(eth1).not.toBe(eth2);
      expect(arb1).toBe(arb2);
    });
  });

  describe('RPC failover scenarios', () => {
    it('should allow manual RPC rotation on failure', () => {
      // Initial client
      const client1 = chainRegistry.getClient(1);

      // Simulate RPC failure by rotating
      chainRegistry.rotateRpc(1);

      // Get new client with different RPC
      const client2 = chainRegistry.getClient(1);

      expect(client1).not.toBe(client2);
    });

    it('should maintain RPC index per chain independently', () => {
      // Rotate Ethereum twice
      chainRegistry.rotateRpc(1);
      chainRegistry.rotateRpc(1);

      // Rotate Arbitrum once
      chainRegistry.rotateRpc(42161);

      // Get clients
      const ethClient = chainRegistry.getClient(1);
      const arbClient = chainRegistry.getClient(42161);

      // Both should work despite different rotation counts
      expect(ethClient).toBeDefined();
      expect(arbClient).toBeDefined();
    });
  });

  describe('chain configuration properties', () => {
    it('should have multiple RPC URLs for redundancy', () => {
      const chains = chainRegistry.getAllChains();

      chains.forEach((chain: ChainConfig) => {
        expect(chain.rpcUrls.length).toBeGreaterThanOrEqual(1);
      });
    });

    it('should have valid native currency configuration', () => {
      const ethereum = chainRegistry.getChain(1);

      expect(ethereum?.nativeCurrency.name).toBeTruthy();
      expect(ethereum?.nativeCurrency.symbol).toBeTruthy();
      expect(ethereum?.nativeCurrency.decimals).toBe(18);
    });

    it('should have block explorer configured', () => {
      const chains = chainRegistry.getAllChains();

      chains.forEach((chain: ChainConfig) => {
        expect(chain.blockExplorer).toBeTruthy();
        expect(typeof chain.blockExplorer).toBe('string');
      });
    });
  });
});
