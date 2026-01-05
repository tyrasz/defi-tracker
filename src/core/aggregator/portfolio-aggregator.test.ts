import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Position } from '@/types/portfolio';
import type { IProtocolAdapter } from '@/protocols/types';
import { portfolioAggregator } from './portfolio-aggregator';

// Mock dependencies
const mockClient = {} as any;

const createMockAdapter = (
  id: string,
  hasPositions: boolean,
  positions: Position[]
): IProtocolAdapter => ({
  protocol: { id, name: id.toUpperCase(), category: 'lending', website: '' },
  supportedChains: [1],
  hasPositions: vi.fn().mockResolvedValue(hasPositions),
  getPositions: vi.fn().mockResolvedValue(positions),
  getYieldRates: vi.fn().mockResolvedValue([]),
});

vi.mock('@/chains', () => ({
  chainRegistry: {
    getClient: vi.fn(() => mockClient),
    getSupportedChainIds: vi.fn(() => [1]),
    getChain: vi.fn((chainId: number) => ({ name: `Chain ${chainId}`, id: chainId })),
  },
}));

vi.mock('@/protocols', () => ({
  protocolRegistry: {
    getAdaptersForChain: vi.fn(() => []),
  },
}));

describe('PortfolioAggregator', () => {
  const mockAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb' as const;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getPortfolio', () => {
    it('should fetch portfolio from all chains by default', async () => {
      const { chainRegistry } = await import('@/chains');
      vi.mocked(chainRegistry.getSupportedChainIds).mockReturnValue([1, 42161, 10]);

      const { protocolRegistry } = await import('@/protocols');
      vi.mocked(protocolRegistry.getAdaptersForChain).mockReturnValue([]);

      const portfolio = await portfolioAggregator.getPortfolio(mockAddress);

      expect(portfolio.address).toBe(mockAddress);
      expect(chainRegistry.getSupportedChainIds).toHaveBeenCalled();
      expect(protocolRegistry.getAdaptersForChain).toHaveBeenCalledTimes(3);
    });

    it('should fetch portfolio from specified chains only', async () => {
      const { protocolRegistry } = await import('@/protocols');
      vi.mocked(protocolRegistry.getAdaptersForChain).mockReturnValue([]);

      await portfolioAggregator.getPortfolio(mockAddress, [1, 10]);

      expect(protocolRegistry.getAdaptersForChain).toHaveBeenCalledTimes(2);
      expect(protocolRegistry.getAdaptersForChain).toHaveBeenCalledWith(1);
      expect(protocolRegistry.getAdaptersForChain).toHaveBeenCalledWith(10);
    });

    it('should aggregate positions from multiple protocols', async () => {
      const position1: Position = {
        id: 'aave-1',
        protocol: { id: 'aave-v3', name: 'Aave V3', category: 'lending', website: '' },
        chainId: 1,
        type: 'supply',
        tokens: [],
        valueUsd: 1000,
      };

      const position2: Position = {
        id: 'compound-1',
        protocol: { id: 'compound-v3', name: 'Compound V3', category: 'lending', website: '' },
        chainId: 1,
        type: 'supply',
        tokens: [],
        valueUsd: 2000,
      };

      const mockAdapter1 = createMockAdapter('aave-v3', true, [position1]);
      const mockAdapter2 = createMockAdapter('compound-v3', true, [position2]);

      const { protocolRegistry } = await import('@/protocols');
      vi.mocked(protocolRegistry.getAdaptersForChain).mockReturnValue([
        mockAdapter1,
        mockAdapter2,
      ]);

      const portfolio = await portfolioAggregator.getPortfolio(mockAddress, [1]);

      expect(portfolio.positions).toHaveLength(2);
      expect(portfolio.totalValueUsd).toBe(3000);
      expect(mockAdapter1.hasPositions).toHaveBeenCalledWith(mockClient, mockAddress, 1);
      expect(mockAdapter2.hasPositions).toHaveBeenCalledWith(mockClient, mockAddress, 1);
    });

    it('should skip fetching positions when hasPositions returns false', async () => {
      const mockAdapter = createMockAdapter('aave-v3', false, []);

      const { protocolRegistry } = await import('@/protocols');
      vi.mocked(protocolRegistry.getAdaptersForChain).mockReturnValue([mockAdapter]);

      const portfolio = await portfolioAggregator.getPortfolio(mockAddress, [1]);

      expect(mockAdapter.hasPositions).toHaveBeenCalled();
      expect(mockAdapter.getPositions).not.toHaveBeenCalled();
      expect(portfolio.positions).toHaveLength(0);
    });

    it('should handle adapter errors gracefully', async () => {
      const position1: Position = {
        id: 'aave-1',
        protocol: { id: 'aave-v3', name: 'Aave V3', category: 'lending', website: '' },
        chainId: 1,
        type: 'supply',
        tokens: [],
        valueUsd: 1000,
      };

      const mockAdapter1 = createMockAdapter('aave-v3', true, [position1]);
      const mockAdapter2: IProtocolAdapter = {
        protocol: { id: 'failing-protocol', name: 'Failing', category: 'lending', website: '' },
        supportedChains: [1],
        hasPositions: vi.fn().mockResolvedValue(true),
        getPositions: vi.fn().mockRejectedValue(new Error('RPC Error')),
        getYieldRates: vi.fn().mockResolvedValue([]),
      };

      const { protocolRegistry } = await import('@/protocols');
      vi.mocked(protocolRegistry.getAdaptersForChain).mockReturnValue([
        mockAdapter1,
        mockAdapter2,
      ]);

      const portfolio = await portfolioAggregator.getPortfolio(mockAddress, [1]);

      // Should still get successful position
      expect(portfolio.positions).toHaveLength(1);
      expect(portfolio.positions[0].id).toBe('aave-1');
      expect(portfolio.totalValueUsd).toBe(1000);
    });

    it('should handle hasPositions errors gracefully', async () => {
      const mockAdapter: IProtocolAdapter = {
        protocol: { id: 'aave-v3', name: 'Aave V3', category: 'lending', website: '' },
        supportedChains: [1],
        hasPositions: vi.fn().mockRejectedValue(new Error('Network error')),
        getPositions: vi.fn(),
        getYieldRates: vi.fn().mockResolvedValue([]),
      };

      const { protocolRegistry } = await import('@/protocols');
      vi.mocked(protocolRegistry.getAdaptersForChain).mockReturnValue([mockAdapter]);

      const portfolio = await portfolioAggregator.getPortfolio(mockAddress, [1]);

      // Should treat error as "no positions"
      expect(mockAdapter.getPositions).not.toHaveBeenCalled();
      expect(portfolio.positions).toHaveLength(0);
    });
  });

  describe('groupByChain', () => {
    const groupByChain = (positions: Position[], chains: number[]) => {
      return (portfolioAggregator as any).groupByChain(positions, chains);
    };

    it('should group positions by chain', () => {
      const positions: Position[] = [
        {
          id: '1',
          protocol: { id: 'aave-v3', name: 'Aave V3', category: 'lending', website: '' },
          chainId: 1,
          type: 'supply',
          tokens: [],
          valueUsd: 1000,
        },
        {
          id: '2',
          protocol: { id: 'aave-v3', name: 'Aave V3', category: 'lending', website: '' },
          chainId: 42161,
          type: 'supply',
          tokens: [],
          valueUsd: 2000,
        },
        {
          id: '3',
          protocol: { id: 'compound-v3', name: 'Compound V3', category: 'lending', website: '' },
          chainId: 1,
          type: 'supply',
          tokens: [],
          valueUsd: 500,
        },
      ];

      const result = groupByChain(positions, [1, 42161]);

      expect(result[1].positions).toHaveLength(2);
      expect(result[1].totalValueUsd).toBe(1500);
      expect(result[42161].positions).toHaveLength(1);
      expect(result[42161].totalValueUsd).toBe(2000);
    });

    it('should include chains with no positions', () => {
      const positions: Position[] = [
        {
          id: '1',
          protocol: { id: 'aave-v3', name: 'Aave V3', category: 'lending', website: '' },
          chainId: 1,
          type: 'supply',
          tokens: [],
          valueUsd: 1000,
        },
      ];

      const result = groupByChain(positions, [1, 42161]);

      expect(result[1].totalValueUsd).toBe(1000);
      expect(result[42161].totalValueUsd).toBe(0);
      expect(result[42161].positions).toHaveLength(0);
    });
  });

  describe('groupByProtocol', () => {
    const groupByProtocol = (positions: Position[]) => {
      return (portfolioAggregator as any).groupByProtocol(positions);
    };

    it('should group positions by protocol', () => {
      const positions: Position[] = [
        {
          id: '1',
          protocol: { id: 'aave-v3', name: 'Aave V3', category: 'lending', website: '' },
          chainId: 1,
          type: 'supply',
          tokens: [],
          valueUsd: 1000,
        },
        {
          id: '2',
          protocol: { id: 'aave-v3', name: 'Aave V3', category: 'lending', website: '' },
          chainId: 42161,
          type: 'supply',
          tokens: [],
          valueUsd: 2000,
        },
        {
          id: '3',
          protocol: { id: 'compound-v3', name: 'Compound V3', category: 'lending', website: '' },
          chainId: 1,
          type: 'supply',
          tokens: [],
          valueUsd: 500,
        },
      ];

      const result = groupByProtocol(positions);

      expect(result['aave-v3'].positions).toHaveLength(2);
      expect(result['aave-v3'].totalValueUsd).toBe(3000);
      expect(result['compound-v3'].positions).toHaveLength(1);
      expect(result['compound-v3'].totalValueUsd).toBe(500);
    });

    it('should handle empty positions', () => {
      const result = groupByProtocol([]);
      expect(Object.keys(result)).toHaveLength(0);
    });
  });

  describe('groupByType', () => {
    const groupByType = (positions: Position[]) => {
      return (portfolioAggregator as any).groupByType(positions);
    };

    it('should group positions by type', () => {
      const positions: Position[] = [
        {
          id: '1',
          protocol: { id: 'aave-v3', name: 'Aave V3', category: 'lending', website: '' },
          chainId: 1,
          type: 'supply',
          tokens: [],
          valueUsd: 1000,
        },
        {
          id: '2',
          protocol: { id: 'aave-v3', name: 'Aave V3', category: 'lending', website: '' },
          chainId: 1,
          type: 'borrow',
          tokens: [],
          valueUsd: 500,
        },
        {
          id: '3',
          protocol: { id: 'compound-v3', name: 'Compound V3', category: 'lending', website: '' },
          chainId: 1,
          type: 'supply',
          tokens: [],
          valueUsd: 2000,
        },
        {
          id: '4',
          protocol: { id: 'lido', name: 'Lido', category: 'liquid-staking', website: '' },
          chainId: 1,
          type: 'stake',
          tokens: [],
          valueUsd: 3000,
        },
      ];

      const result = groupByType(positions);

      expect(result['supply']).toHaveLength(2);
      expect(result['borrow']).toHaveLength(1);
      expect(result['stake']).toHaveLength(1);
    });

    it('should handle empty positions', () => {
      const result = groupByType([]);
      expect(Object.keys(result)).toHaveLength(0);
    });
  });

  describe('portfolio metadata', () => {
    it('should include fetchedAt timestamp', async () => {
      const { protocolRegistry } = await import('@/protocols');
      vi.mocked(protocolRegistry.getAdaptersForChain).mockReturnValue([]);

      const beforeTime = Date.now();
      const portfolio = await portfolioAggregator.getPortfolio(mockAddress, [1]);
      const afterTime = Date.now();

      expect(portfolio.fetchedAt).toBeGreaterThanOrEqual(beforeTime);
      expect(portfolio.fetchedAt).toBeLessThanOrEqual(afterTime);
    });

    it('should include address in portfolio', async () => {
      const { protocolRegistry } = await import('@/protocols');
      vi.mocked(protocolRegistry.getAdaptersForChain).mockReturnValue([]);

      const portfolio = await portfolioAggregator.getPortfolio(mockAddress, [1]);

      expect(portfolio.address).toBe(mockAddress);
    });
  });
});
