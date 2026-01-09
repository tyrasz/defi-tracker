import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '../portfolio/[address]/route';

// Mock viem isAddress
vi.mock('viem', () => ({
  isAddress: vi.fn((input: string) => /^0x[a-fA-F0-9]{40}$/.test(input)),
}));

// Mock all dependencies
vi.mock('@/core/aggregator', () => ({
  portfolioAggregator: {
    getPortfolio: vi.fn(() => Promise.resolve({
      address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
      totalValueUsd: 10000,
      positions: [
        {
          id: 'test-1',
          chainId: 1,
          protocol: { id: 'aave-v3', name: 'Aave V3', category: 'lending', earnsYield: true, website: '' },
          type: 'supply',
          tokens: [
            {
              address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
              symbol: 'USDC',
              decimals: 6,
              balance: 10000000000n,
              balanceFormatted: '10000',
              priceUsd: 1,
              valueUsd: 10000,
            },
          ],
          valueUsd: 10000,
        },
      ],
      byChain: {},
      byProtocol: {},
      byType: {},
      fetchedAt: Date.now(),
    })),
  },
}));

vi.mock('@/core/yield', () => ({
  yieldAnalyzer: {
    analyzePortfolio: vi.fn(() => Promise.resolve({
      address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
      totalCurrentYield: 300,
      totalPotentialYield: 500,
      opportunities: [],
      idleAssets: [],
      analyzedAt: Date.now(),
    })),
  },
}));

vi.mock('@/core/pricing', () => ({
  priceFetcher: {
    enrichPositionsWithPrices: vi.fn(() => Promise.resolve()),
  },
}));

vi.mock('@/core/wallet', () => ({
  walletBalanceFetcher: {
    getBalances: vi.fn(() => Promise.resolve({
      address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
      balances: [],
      totalValueUsd: 0,
      fetchedAt: Date.now(),
    })),
  },
}));

vi.mock('@/core/wallet/solana-balance-fetcher', () => ({
  solanaBalanceFetcher: {
    getBalances: vi.fn(() => Promise.resolve({
      address: 'test',
      balances: { chainId: 'solana', chainName: 'Solana', balances: [], totalValueUsd: 0 },
      totalValueUsd: 0,
      fetchedAt: Date.now(),
    })),
  },
}));

vi.mock('@/core/ens', () => ({
  ensResolver: {
    isEnsName: vi.fn((input: string) => input.includes('.')),
    getEnsName: vi.fn(() => Promise.resolve(null)),
    resolveToAddress: vi.fn(() => Promise.resolve({ address: null, ensName: null, isEns: true })),
  },
}));

vi.mock('@/lib/utils/serialize', () => ({
  serializeBigInts: vi.fn((obj: any) => JSON.parse(JSON.stringify(obj, (_, v) =>
    typeof v === 'bigint' ? v.toString() : v
  ))),
}));

describe('Portfolio API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createMockRequest = (url = 'http://localhost/api/v1/portfolio/test') => {
    return new NextRequest(url);
  };

  const createParams = (address: string) => ({
    params: Promise.resolve({ address }),
  });

  it('should return portfolio for valid Ethereum address', async () => {
    const address = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0';
    const response = await GET(createMockRequest(), createParams(address));
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.data.address).toBe(address);
    expect(data.data.positions).toBeDefined();
  });

  it('should include yield analysis by default', async () => {
    const address = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0';
    const response = await GET(createMockRequest(), createParams(address));
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.data.yieldAnalysis).toBeDefined();
  });

  it('should exclude yield analysis when disabled via query param', async () => {
    const address = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0';
    const url = `http://localhost/api/v1/portfolio/${address}?yieldAnalysis=false`;
    const response = await GET(new NextRequest(url), createParams(address));
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.data.yieldAnalysis).toBeNull();
  });

  it('should include wallet balances', async () => {
    const address = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0';
    const response = await GET(createMockRequest(), createParams(address));
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.data.walletBalances).toBeDefined();
  });

  it('should return 400 for invalid address', async () => {
    const response = await GET(createMockRequest(), createParams('invalid'));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Invalid');
  });

  it('should return 400 for unresolvable ENS name', async () => {
    const response = await GET(createMockRequest(), createParams('nonexistent.eth'));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
  });

  it('should handle Solana addresses', async () => {
    const solanaAddress = '7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV';
    const response = await GET(createMockRequest(), createParams(solanaAddress));
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.data.network).toBe('solana');
  });

  it('should handle errors gracefully', async () => {
    const { portfolioAggregator } = await import('@/core/aggregator');
    vi.mocked(portfolioAggregator.getPortfolio).mockRejectedValueOnce(new Error('RPC Error'));

    const address = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0';
    const response = await GET(createMockRequest(), createParams(address));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Failed to fetch portfolio');
  });
});
