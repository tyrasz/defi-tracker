import { describe, it, expect, beforeEach } from 'vitest';
import { protocolRegistry } from './registry';

describe('ProtocolRegistry', () => {
  describe('getAllAdapters', () => {
    it('should return all 12 registered adapters', () => {
      const adapters = protocolRegistry.getAllAdapters();
      expect(adapters).toHaveLength(12);
    });

    it('should include all expected protocols', () => {
      const adapters = protocolRegistry.getAllAdapters();
      const protocolIds = adapters.map((a) => a.protocol.id);

      expect(protocolIds).toContain('aave-v3');
      expect(protocolIds).toContain('compound-v3');
      expect(protocolIds).toContain('spark');
      expect(protocolIds).toContain('morpho');
      expect(protocolIds).toContain('lido');
      expect(protocolIds).toContain('rocket-pool');
      expect(protocolIds).toContain('eigenlayer');
      expect(protocolIds).toContain('uniswap-v3');
      expect(protocolIds).toContain('curve');
      expect(protocolIds).toContain('yearn-v3');
      expect(protocolIds).toContain('convex');
      expect(protocolIds).toContain('maker');
    });
  });

  describe('getAdapter', () => {
    it('should return adapter by protocol ID', () => {
      const aaveAdapter = protocolRegistry.getAdapter('aave-v3');
      expect(aaveAdapter).toBeDefined();
      expect(aaveAdapter?.protocol.id).toBe('aave-v3');
      expect(aaveAdapter?.protocol.name).toBe('Aave V3');
    });

    it('should return undefined for non-existent protocol', () => {
      const adapter = protocolRegistry.getAdapter('non-existent');
      expect(adapter).toBeUndefined();
    });

    it('should return correct adapter for each registered protocol', () => {
      const protocols = ['lido', 'uniswap-v3', 'maker'];

      protocols.forEach((protocolId) => {
        const adapter = protocolRegistry.getAdapter(protocolId);
        expect(adapter).toBeDefined();
        expect(adapter?.protocol.id).toBe(protocolId);
      });
    });
  });

  describe('getAdaptersForChain', () => {
    it('should return adapters that support Ethereum mainnet (chainId: 1)', () => {
      const mainnetAdapters = protocolRegistry.getAdaptersForChain(1);

      expect(mainnetAdapters.length).toBeGreaterThan(0);
      expect(mainnetAdapters.every(a => a.supportedChains.includes(1))).toBe(true);
    });

    it('should return adapters that support Arbitrum (chainId: 42161)', () => {
      const arbitrumAdapters = protocolRegistry.getAdaptersForChain(42161);

      expect(arbitrumAdapters.length).toBeGreaterThan(0);
      expect(arbitrumAdapters.every(a => a.supportedChains.includes(42161))).toBe(true);
    });

    it('should return adapters that support Optimism (chainId: 10)', () => {
      const optimismAdapters = protocolRegistry.getAdaptersForChain(10);

      expect(optimismAdapters.length).toBeGreaterThan(0);
      expect(optimismAdapters.every(a => a.supportedChains.includes(10))).toBe(true);
    });

    it('should return empty array for unsupported chain', () => {
      const adapters = protocolRegistry.getAdaptersForChain(999999);
      expect(adapters).toEqual([]);
    });

    it('should not return duplicate adapters', () => {
      const adapters = protocolRegistry.getAdaptersForChain(1);
      const uniqueIds = new Set(adapters.map(a => a.protocol.id));
      expect(adapters.length).toBe(uniqueIds.size);
    });
  });

  describe('getAdaptersByCategory', () => {
    it('should return all lending protocols', () => {
      const lendingAdapters = protocolRegistry.getAdaptersByCategory('lending');

      expect(lendingAdapters).toHaveLength(4);
      expect(lendingAdapters.every(a => a.protocol.category === 'lending')).toBe(true);

      const ids = lendingAdapters.map(a => a.protocol.id);
      expect(ids).toContain('aave-v3');
      expect(ids).toContain('compound-v3');
      expect(ids).toContain('spark');
      expect(ids).toContain('morpho');
    });

    it('should return all liquid staking protocols', () => {
      const liquidStakingAdapters = protocolRegistry.getAdaptersByCategory('liquid-staking');

      expect(liquidStakingAdapters).toHaveLength(2);
      expect(liquidStakingAdapters.every(a => a.protocol.category === 'liquid-staking')).toBe(true);

      const ids = liquidStakingAdapters.map(a => a.protocol.id);
      expect(ids).toContain('lido');
      expect(ids).toContain('rocket-pool');
    });

    it('should return all DEX protocols', () => {
      const dexAdapters = protocolRegistry.getAdaptersByCategory('dex');

      expect(dexAdapters).toHaveLength(2);
      expect(dexAdapters.every(a => a.protocol.category === 'dex')).toBe(true);

      const ids = dexAdapters.map(a => a.protocol.id);
      expect(ids).toContain('uniswap-v3');
      expect(ids).toContain('curve');
    });

    it('should return all yield aggregator protocols', () => {
      const yieldAdapters = protocolRegistry.getAdaptersByCategory('yield-aggregator');

      expect(yieldAdapters).toHaveLength(2);
      expect(yieldAdapters.every(a => a.protocol.category === 'yield-aggregator')).toBe(true);

      const ids = yieldAdapters.map(a => a.protocol.id);
      expect(ids).toContain('yearn-v3');
      expect(ids).toContain('convex');
    });

    it('should return restaking protocols', () => {
      const restakingAdapters = protocolRegistry.getAdaptersByCategory('restaking');

      expect(restakingAdapters).toHaveLength(1);
      expect(restakingAdapters[0].protocol.id).toBe('eigenlayer');
    });

    it('should return CDP protocols', () => {
      const cdpAdapters = protocolRegistry.getAdaptersByCategory('cdp');

      expect(cdpAdapters).toHaveLength(1);
      expect(cdpAdapters[0].protocol.id).toBe('maker');
    });

    it('should return empty array for non-existent category', () => {
      const adapters = protocolRegistry.getAdaptersByCategory('non-existent');
      expect(adapters).toEqual([]);
    });
  });

  describe('adapter properties', () => {
    it('should have all required properties on each adapter', () => {
      const adapters = protocolRegistry.getAllAdapters();

      adapters.forEach((adapter) => {
        expect(adapter.protocol).toBeDefined();
        expect(adapter.protocol.id).toBeTruthy();
        expect(adapter.protocol.name).toBeTruthy();
        expect(adapter.protocol.category).toBeTruthy();
        expect(adapter.supportedChains).toBeInstanceOf(Array);
        expect(adapter.supportedChains.length).toBeGreaterThan(0);
        expect(typeof adapter.hasPositions).toBe('function');
        expect(typeof adapter.getPositions).toBe('function');
        expect(typeof adapter.getYieldRates).toBe('function');
      });
    });
  });
});
