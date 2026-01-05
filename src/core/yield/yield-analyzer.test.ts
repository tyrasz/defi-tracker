import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Position } from '@/types/portfolio';
import type { YieldRate } from '@/protocols/types';
import { yieldAnalyzer } from './yield-analyzer';

// Mock dependencies
vi.mock('@/chains', () => ({
  chainRegistry: {
    getClient: vi.fn(() => ({})),
    getSupportedChainIds: vi.fn(() => [1]),
  },
}));

vi.mock('@/protocols', () => ({
  protocolRegistry: {
    getAdapter: vi.fn((id: string) => ({
      protocol: { name: id.toUpperCase(), id },
      getYieldRates: vi.fn(() => Promise.resolve([])),
    })),
    getAdaptersForChain: vi.fn(() => []),
  },
}));

describe('YieldAnalyzer', () => {
  const mockAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb' as const;

  describe('asset equivalency', () => {
    // Access the private method through reflection for testing
    const isEquivalentAsset = (s1: string, s2: string) => {
      return (yieldAnalyzer as any).isEquivalentAsset(s1, s2);
    };

    it('should match exact symbols (case insensitive)', () => {
      expect(isEquivalentAsset('ETH', 'ETH')).toBe(true);
      expect(isEquivalentAsset('eth', 'ETH')).toBe(true);
      expect(isEquivalentAsset('USDC', 'usdc')).toBe(true);
    });

    it('should match stablecoin equivalents', () => {
      expect(isEquivalentAsset('USDC', 'DAI')).toBe(true);
      expect(isEquivalentAsset('USDT', 'USDC')).toBe(true);
      expect(isEquivalentAsset('DAI', 'FRAX')).toBe(true);
      expect(isEquivalentAsset('LUSD', 'USDC')).toBe(true);
      expect(isEquivalentAsset('usdc', 'dai')).toBe(true); // case insensitive
    });

    it('should match ETH derivatives', () => {
      expect(isEquivalentAsset('ETH', 'WETH')).toBe(true);
      expect(isEquivalentAsset('STETH', 'ETH')).toBe(true);
      expect(isEquivalentAsset('WSTETH', 'STETH')).toBe(true);
      expect(isEquivalentAsset('RETH', 'ETH')).toBe(true);
      expect(isEquivalentAsset('CBETH', 'WETH')).toBe(true);
    });

    it('should not match different asset types', () => {
      expect(isEquivalentAsset('ETH', 'USDC')).toBe(false);
      expect(isEquivalentAsset('WBTC', 'ETH')).toBe(false);
      expect(isEquivalentAsset('DAI', 'ETH')).toBe(false);
      expect(isEquivalentAsset('LINK', 'USDC')).toBe(false);
    });
  });

  describe('risk assessment', () => {
    const assessRisk = (rate: YieldRate) => {
      return (yieldAnalyzer as any).assessRisk(rate);
    };

    it('should assess low risk for battle-tested protocols', () => {
      const lowRiskProtocols = ['aave-v3', 'compound-v3', 'lido'];

      lowRiskProtocols.forEach((protocol) => {
        const rate: YieldRate = {
          protocol,
          chainId: 1,
          asset: mockAddress,
          assetSymbol: 'ETH',
          type: 'supply',
          apy: 0.05,
          apr: 0.05,
        };
        expect(assessRisk(rate)).toBe('low');
      });
    });

    it('should assess medium risk for established complex protocols', () => {
      const mediumRiskProtocols = ['uniswap-v3', 'curve', 'yearn-v3', 'rocket-pool'];

      mediumRiskProtocols.forEach((protocol) => {
        const rate: YieldRate = {
          protocol,
          chainId: 1,
          asset: mockAddress,
          assetSymbol: 'ETH',
          type: 'supply',
          apy: 0.08,
          apr: 0.08,
        };
        expect(assessRisk(rate)).toBe('medium');
      });
    });

    it('should assess high risk for other protocols', () => {
      const rate: YieldRate = {
        protocol: 'unknown-defi-protocol',
        chainId: 1,
        asset: mockAddress,
        assetSymbol: 'ETH',
        type: 'supply',
        apy: 0.15,
        apr: 0.15,
      };
      expect(assessRisk(rate)).toBe('high');
    });

    it('should be case insensitive', () => {
      const rate: YieldRate = {
        protocol: 'AAVE-V3',
        chainId: 1,
        asset: mockAddress,
        assetSymbol: 'ETH',
        type: 'supply',
        apy: 0.05,
        apr: 0.05,
      };
      expect(assessRisk(rate)).toBe('low');
    });
  });

  describe('calculateCurrentYield', () => {
    const calculateCurrentYield = (positions: Position[]) => {
      return (yieldAnalyzer as any).calculateCurrentYield(positions);
    };

    it('should calculate total yield from positions', () => {
      const positions: Position[] = [
        {
          id: '1',
          protocol: { id: 'aave-v3', name: 'Aave V3', category: 'lending', website: '' },
          chainId: 1,
          type: 'supply',
          tokens: [],
          valueUsd: 10000,
          yield: { apy: 0.05, apr: 0.05 },
        },
        {
          id: '2',
          protocol: { id: 'lido', name: 'Lido', category: 'liquid-staking', website: '' },
          chainId: 1,
          type: 'stake',
          tokens: [],
          valueUsd: 5000,
          yield: { apy: 0.04, apr: 0.04 },
        },
      ];

      const result = calculateCurrentYield(positions);
      // 10000 * 0.05 + 5000 * 0.04 = 500 + 200 = 700
      expect(result).toBe(700);
    });

    it('should ignore positions without yield', () => {
      const positions: Position[] = [
        {
          id: '1',
          protocol: { id: 'aave-v3', name: 'Aave V3', category: 'lending', website: '' },
          chainId: 1,
          type: 'supply',
          tokens: [],
          valueUsd: 10000,
          yield: { apy: 0.05, apr: 0.05 },
        },
        {
          id: '2',
          protocol: { id: 'uniswap-v3', name: 'Uniswap V3', category: 'dex', website: '' },
          chainId: 1,
          type: 'liquidity',
          tokens: [],
          valueUsd: 5000,
          // No yield
        },
      ];

      const result = calculateCurrentYield(positions);
      expect(result).toBe(500); // Only first position
    });

    it('should return 0 for empty positions', () => {
      expect(calculateCurrentYield([])).toBe(0);
    });
  });

  describe('findOpportunities', () => {
    const findOpportunities = (positions: Position[], yieldRates: YieldRate[]) => {
      return (yieldAnalyzer as any).findOpportunities(positions, yieldRates);
    };

    it('should find better yield opportunities', () => {
      const positions: Position[] = [
        {
          id: '1',
          protocol: { id: 'aave-v3', name: 'Aave V3', category: 'lending', website: '' },
          chainId: 1,
          type: 'supply',
          tokens: [{
            address: mockAddress,
            symbol: 'USDC',
            decimals: 6,
            balance: 10000000000n,
            balanceFormatted: '10000',
            priceUsd: 1,
            valueUsd: 10000,
          }],
          valueUsd: 10000,
          yield: { apy: 0.03, apr: 0.03 },
        },
      ];

      const yieldRates: YieldRate[] = [
        {
          protocol: 'compound-v3',
          chainId: 1,
          asset: mockAddress,
          assetSymbol: 'USDC',
          type: 'supply',
          apy: 0.05,
          apr: 0.05,
        },
      ];

      const opportunities = findOpportunities(positions, yieldRates);

      expect(opportunities).toHaveLength(1);
      expect(opportunities[0].currentPosition.id).toBe('1');
      expect(opportunities[0].betterAlternatives).toHaveLength(1);
      expect(opportunities[0].betterAlternatives[0].protocol).toBe('compound-v3');
      expect(opportunities[0].potentialGainApy).toBeCloseTo(0.02, 5); // 0.05 - 0.03
      expect(opportunities[0].potentialGainUsd).toBeCloseTo(200, 0); // 10000 * 0.02
    });

    it('should not suggest same protocol on same chain', () => {
      const positions: Position[] = [
        {
          id: '1',
          protocol: { id: 'aave-v3', name: 'Aave V3', category: 'lending', website: '' },
          chainId: 1,
          type: 'supply',
          tokens: [{
            address: mockAddress,
            symbol: 'USDC',
            decimals: 6,
            balance: 10000000000n,
            balanceFormatted: '10000',
            priceUsd: 1,
            valueUsd: 10000,
          }],
          valueUsd: 10000,
          yield: { apy: 0.03, apr: 0.03 },
        },
      ];

      const yieldRates: YieldRate[] = [
        {
          protocol: 'aave-v3',
          chainId: 1,
          asset: mockAddress,
          assetSymbol: 'USDC',
          type: 'supply',
          apy: 0.05,
          apr: 0.05,
        },
      ];

      const opportunities = findOpportunities(positions, yieldRates);
      expect(opportunities).toHaveLength(0);
    });

    it('should only suggest improvements above MIN_APY_IMPROVEMENT threshold', () => {
      const positions: Position[] = [
        {
          id: '1',
          protocol: { id: 'aave-v3', name: 'Aave V3', category: 'lending', website: '' },
          chainId: 1,
          type: 'supply',
          tokens: [{
            address: mockAddress,
            symbol: 'USDC',
            decimals: 6,
            balance: 10000000000n,
            balanceFormatted: '10000',
            priceUsd: 1,
            valueUsd: 10000,
          }],
          valueUsd: 10000,
          yield: { apy: 0.03, apr: 0.03 },
        },
      ];

      const yieldRates: YieldRate[] = [
        {
          protocol: 'compound-v3',
          chainId: 1,
          asset: mockAddress,
          assetSymbol: 'USDC',
          type: 'supply',
          apy: 0.034, // Only 0.4% improvement (below 0.5% threshold)
          apr: 0.034,
        },
      ];

      const opportunities = findOpportunities(positions, yieldRates);
      expect(opportunities).toHaveLength(0);
    });

    it('should filter positions below MIN_VALUE_USD', () => {
      const positions: Position[] = [
        {
          id: '1',
          protocol: { id: 'aave-v3', name: 'Aave V3', category: 'lending', website: '' },
          chainId: 1,
          type: 'supply',
          tokens: [{
            address: mockAddress,
            symbol: 'USDC',
            decimals: 6,
            balance: 5000000n,
            balanceFormatted: '5',
            priceUsd: 1,
            valueUsd: 5,
          }],
          valueUsd: 5, // Below $10 minimum
          yield: { apy: 0.03, apr: 0.03 },
        },
      ];

      const yieldRates: YieldRate[] = [
        {
          protocol: 'compound-v3',
          chainId: 1,
          asset: mockAddress,
          assetSymbol: 'USDC',
          type: 'supply',
          apy: 0.10,
          apr: 0.10,
        },
      ];

      const opportunities = findOpportunities(positions, yieldRates);
      expect(opportunities).toHaveLength(0);
    });

    it('should sort opportunities by potential gain', () => {
      const positions: Position[] = [
        {
          id: '1',
          protocol: { id: 'aave-v3', name: 'Aave V3', category: 'lending', website: '' },
          chainId: 1,
          type: 'supply',
          tokens: [{
            address: mockAddress,
            symbol: 'USDC',
            decimals: 6,
            balance: 10000000000n,
            balanceFormatted: '10000',
            priceUsd: 1,
            valueUsd: 10000,
          }],
          valueUsd: 10000,
          yield: { apy: 0.03, apr: 0.03 },
        },
        {
          id: '2',
          protocol: { id: 'compound-v3', name: 'Compound V3', category: 'lending', website: '' },
          chainId: 1,
          type: 'supply',
          tokens: [{
            address: mockAddress,
            symbol: 'DAI',
            decimals: 18,
            balance: 1000000000000000000000n,
            balanceFormatted: '1000',
            priceUsd: 1,
            valueUsd: 1000,
          }],
          valueUsd: 1000,
          yield: { apy: 0.02, apr: 0.02 },
        },
      ];

      const yieldRates: YieldRate[] = [
        {
          protocol: 'morpho',
          chainId: 1,
          asset: mockAddress,
          assetSymbol: 'USDC',
          type: 'supply',
          apy: 0.05,
          apr: 0.05,
        },
        {
          protocol: 'spark',
          chainId: 1,
          asset: mockAddress,
          assetSymbol: 'DAI',
          type: 'supply',
          apy: 0.08,
          apr: 0.08,
        },
      ];

      const opportunities = findOpportunities(positions, yieldRates);

      expect(opportunities).toHaveLength(2);
      // First opportunity should be the one with higher USD gain
      // Position 1 (USDC, $10k @ 3%): Best alternative is Spark DAI @ 8% = 5% improvement = $500 gain
      // Position 2 (DAI, $1k @ 2%): Best alternative is Spark DAI @ 8% = 6% improvement = $60 gain
      // (Note: USDC and DAI are treated as equivalent by isEquivalentAsset)
      expect(opportunities[0].potentialGainUsd).toBe(500);
      expect(opportunities[1].potentialGainUsd).toBe(60);
    });
  });

  describe('findIdleAssets', () => {
    const findIdleAssets = (positions: Position[], yieldRates: YieldRate[]) => {
      return (yieldAnalyzer as any).findIdleAssets(positions, yieldRates);
    };

    it('should find idle assets with yield opportunities', () => {
      const positions: Position[] = [
        {
          id: '1',
          protocol: { id: 'wallet', name: 'Wallet', category: 'wallet', website: '' },
          chainId: 1,
          type: 'wallet',
          tokens: [{
            address: mockAddress,
            symbol: 'USDC',
            decimals: 6,
            balance: 10000000000n,
            balanceFormatted: '10000',
            priceUsd: 1,
            valueUsd: 10000,
          }],
          valueUsd: 10000,
          // No yield
        },
      ];

      const yieldRates: YieldRate[] = [
        {
          protocol: 'aave-v3',
          chainId: 1,
          asset: mockAddress,
          assetSymbol: 'USDC',
          type: 'supply',
          apy: 0.05,
          apr: 0.05,
        },
      ];

      const idleAssets = findIdleAssets(positions, yieldRates);

      expect(idleAssets).toHaveLength(1);
      expect(idleAssets[0].symbol).toBe('USDC');
      expect(idleAssets[0].valueUsd).toBe(10000);
      expect(idleAssets[0].bestYieldOpportunities).toHaveLength(1);
      expect(idleAssets[0].bestYieldOpportunities[0].protocol).toBe('aave-v3');
    });

    it('should not flag positions already earning yield', () => {
      const positions: Position[] = [
        {
          id: '1',
          protocol: { id: 'aave-v3', name: 'Aave V3', category: 'lending', website: '' },
          chainId: 1,
          type: 'supply',
          tokens: [{
            address: mockAddress,
            symbol: 'USDC',
            decimals: 6,
            balance: 10000000000n,
            balanceFormatted: '10000',
            priceUsd: 1,
            valueUsd: 10000,
          }],
          valueUsd: 10000,
          yield: { apy: 0.03, apr: 0.03 },
        },
      ];

      const yieldRates: YieldRate[] = [];

      const idleAssets = findIdleAssets(positions, yieldRates);
      expect(idleAssets).toHaveLength(0);
    });

    it('should limit to top 3 opportunities per asset', () => {
      const positions: Position[] = [
        {
          id: '1',
          protocol: { id: 'wallet', name: 'Wallet', category: 'wallet', website: '' },
          chainId: 1,
          type: 'wallet',
          tokens: [{
            address: mockAddress,
            symbol: 'USDC',
            decimals: 6,
            balance: 10000000000n,
            balanceFormatted: '10000',
            priceUsd: 1,
            valueUsd: 10000,
          }],
          valueUsd: 10000,
        },
      ];

      const yieldRates: YieldRate[] = [
        { protocol: 'protocol1', chainId: 1, asset: mockAddress, assetSymbol: 'USDC', type: 'supply', apy: 0.08, apr: 0.08 },
        { protocol: 'protocol2', chainId: 1, asset: mockAddress, assetSymbol: 'USDC', type: 'supply', apy: 0.07, apr: 0.07 },
        { protocol: 'protocol3', chainId: 1, asset: mockAddress, assetSymbol: 'USDC', type: 'supply', apy: 0.06, apr: 0.06 },
        { protocol: 'protocol4', chainId: 1, asset: mockAddress, assetSymbol: 'USDC', type: 'supply', apy: 0.05, apr: 0.05 },
        { protocol: 'protocol5', chainId: 1, asset: mockAddress, assetSymbol: 'USDC', type: 'supply', apy: 0.04, apr: 0.04 },
      ];

      const idleAssets = findIdleAssets(positions, yieldRates);

      expect(idleAssets).toHaveLength(1);
      expect(idleAssets[0].bestYieldOpportunities).toHaveLength(3);
      // Should be sorted by APY descending
      expect(idleAssets[0].bestYieldOpportunities[0].apy).toBe(0.08);
      expect(idleAssets[0].bestYieldOpportunities[1].apy).toBe(0.07);
      expect(idleAssets[0].bestYieldOpportunities[2].apy).toBe(0.06);
    });
  });
});
