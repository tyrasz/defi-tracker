import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Address, PublicClient } from 'viem';
import type { ChainId } from '@/types/chain';
import type { Position } from '@/types/portfolio';
import type { ProtocolInfo } from '@/types/protocol';
import type { ProtocolAddresses, YieldRate } from './types';
import { BaseProtocolAdapter } from './base-adapter';

// Create a concrete test implementation of the abstract class
class TestProtocolAdapter extends BaseProtocolAdapter {
  readonly protocol: ProtocolInfo = {
    id: 'test-protocol',
    name: 'Test Protocol',
    category: 'lending',
    website: 'https://test.com',
  };

  readonly supportedChains: ChainId[] = [1, 42161];

  protected getAddresses(chainId: ChainId): ProtocolAddresses | null {
    if (chainId === 1) {
      return { pool: '0x1234567890123456789012345678901234567890' as Address };
    }
    if (chainId === 42161) {
      return { pool: '0x0987654321098765432109876543210987654321' as Address };
    }
    return null;
  }

  async getPositions(
    client: PublicClient,
    address: Address,
    chainId: ChainId
  ): Promise<Position[]> {
    return [];
  }

  async getYieldRates(client: PublicClient, chainId: ChainId): Promise<YieldRate[]> {
    return [];
  }
}

describe('BaseProtocolAdapter', () => {
  let adapter: TestProtocolAdapter;
  let mockClient: PublicClient;

  beforeEach(() => {
    adapter = new TestProtocolAdapter();
    mockClient = {
      readContract: vi.fn(),
    } as any;
  });

  describe('isChainSupported', () => {
    it('should return true for supported chains with addresses', () => {
      expect((adapter as any).isChainSupported(1)).toBe(true);
      expect((adapter as any).isChainSupported(42161)).toBe(true);
    });

    it('should return false for supported chains without addresses', () => {
      // Override to return null
      adapter['getAddresses'] = vi.fn(() => null);
      expect((adapter as any).isChainSupported(1)).toBe(false);
    });

    it('should return false for unsupported chains', () => {
      expect((adapter as any).isChainSupported(999 as ChainId)).toBe(false);
    });
  });

  describe('hasPositions', () => {
    it('should return true when positions exist', async () => {
      const mockPosition: Position = {
        id: 'test-1',
        protocol: adapter.protocol,
        chainId: 1,
        type: 'supply',
        tokens: [],
        valueUsd: 1000,
      };

      adapter.getPositions = vi.fn().mockResolvedValue([mockPosition]);

      const result = await adapter.hasPositions(
        mockClient,
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb' as Address,
        1
      );

      expect(result).toBe(true);
    });

    it('should return false when no positions exist', async () => {
      adapter.getPositions = vi.fn().mockResolvedValue([]);

      const result = await adapter.hasPositions(
        mockClient,
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb' as Address,
        1
      );

      expect(result).toBe(false);
    });

    it('should return false for unsupported chains', async () => {
      const result = await adapter.hasPositions(
        mockClient,
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb' as Address,
        999 as ChainId
      );

      expect(result).toBe(false);
    });

    it('should return false when getPositions throws error', async () => {
      adapter.getPositions = vi.fn().mockRejectedValue(new Error('RPC Error'));

      const result = await adapter.hasPositions(
        mockClient,
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb' as Address,
        1
      );

      expect(result).toBe(false);
    });
  });

  describe('getTokenDecimals', () => {
    it('should fetch token decimals from contract', async () => {
      vi.mocked(mockClient.readContract).mockResolvedValue(6);

      const result = await (adapter as any).getTokenDecimals(
        mockClient,
        '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as Address
      );

      expect(result).toBe(6);
      expect(mockClient.readContract).toHaveBeenCalledWith({
        address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        abi: expect.any(Array),
        functionName: 'decimals',
      });
    });

    it('should return 18 as default when readContract fails', async () => {
      vi.mocked(mockClient.readContract).mockRejectedValue(new Error('Contract error'));

      const result = await (adapter as any).getTokenDecimals(
        mockClient,
        '0xInvalidAddress' as Address
      );

      expect(result).toBe(18);
    });

    it('should handle different decimal values', async () => {
      const testCases = [
        { decimals: 0, expected: 0 },
        { decimals: 8, expected: 8 },
        { decimals: 18, expected: 18 },
        { decimals: 27, expected: 27 },
      ];

      for (const { decimals, expected } of testCases) {
        vi.mocked(mockClient.readContract).mockResolvedValue(decimals);
        const result = await (adapter as any).getTokenDecimals(
          mockClient,
          '0xToken' as Address
        );
        expect(result).toBe(expected);
      }
    });
  });

  describe('getTokenSymbol', () => {
    it('should fetch token symbol from contract', async () => {
      vi.mocked(mockClient.readContract).mockResolvedValue('USDC');

      const result = await (adapter as any).getTokenSymbol(
        mockClient,
        '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as Address
      );

      expect(result).toBe('USDC');
      expect(mockClient.readContract).toHaveBeenCalledWith({
        address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        abi: expect.any(Array),
        functionName: 'symbol',
      });
    });

    it('should return UNKNOWN as default when readContract fails', async () => {
      vi.mocked(mockClient.readContract).mockRejectedValue(new Error('Contract error'));

      const result = await (adapter as any).getTokenSymbol(
        mockClient,
        '0xInvalidAddress' as Address
      );

      expect(result).toBe('UNKNOWN');
    });

    it('should handle various token symbols', async () => {
      const testSymbols = ['USDC', 'DAI', 'WETH', 'WBTC', 'UNI'];

      for (const symbol of testSymbols) {
        vi.mocked(mockClient.readContract).mockResolvedValue(symbol);
        const result = await (adapter as any).getTokenSymbol(
          mockClient,
          '0xToken' as Address
        );
        expect(result).toBe(symbol);
      }
    });
  });

  describe('adapter properties', () => {
    it('should have correct protocol info', () => {
      expect(adapter.protocol.id).toBe('test-protocol');
      expect(adapter.protocol.name).toBe('Test Protocol');
      expect(adapter.protocol.category).toBe('lending');
      expect(adapter.protocol.website).toBe('https://test.com');
    });

    it('should have supported chains configured', () => {
      expect(adapter.supportedChains).toEqual([1, 42161]);
      expect(adapter.supportedChains.includes(1)).toBe(true);
      expect(adapter.supportedChains.includes(42161)).toBe(true);
      expect(adapter.supportedChains.includes(10)).toBe(false);
    });
  });
});
