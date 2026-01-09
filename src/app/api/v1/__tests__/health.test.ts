import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../health/route';

// Mock dependencies
vi.mock('@/chains', () => ({
  chainRegistry: {
    getAllChains: vi.fn(() => [
      { id: 1, name: 'Ethereum', network: 'evm' },
      { id: 42161, name: 'Arbitrum', network: 'evm' },
    ]),
    getEvmChains: vi.fn(() => [
      { id: 1, name: 'Ethereum', network: 'evm' },
      { id: 42161, name: 'Arbitrum', network: 'evm' },
    ]),
    getRpcStatus: vi.fn(() => ({
      1: { rpcUrl: 'https://eth.llamarpc.com', health: { failureCount: 0, lastSuccess: Date.now(), lastFailure: null } },
      42161: { rpcUrl: 'https://arb1.arbitrum.io/rpc', health: { failureCount: 0, lastSuccess: Date.now(), lastFailure: null } },
    })),
    healthCheckAll: vi.fn(() => Promise.resolve({ 1: true, 42161: true })),
  },
}));

vi.mock('@/protocols', () => ({
  protocolRegistry: {
    getAllAdapters: vi.fn(() => [
      {
        protocol: { id: 'aave-v3', name: 'Aave V3', category: 'lending', earnsYield: true },
        supportedChains: [1, 42161],
      },
      {
        protocol: { id: 'lido', name: 'Lido', category: 'liquid-staking', earnsYield: true },
        supportedChains: [1],
      },
    ]),
  },
}));

describe('Health API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return healthy status when all chains are healthy', async () => {
    const response = await GET();
    const data = await response.json();

    expect(data.status).toBe('healthy');
    expect(data.version).toBe('1.0.0');
    expect(data.timestamp).toBeDefined();
    expect(Array.isArray(data.chains)).toBe(true);
    expect(Array.isArray(data.protocols)).toBe(true);
  });

  it('should include chain information', async () => {
    const response = await GET();
    const data = await response.json();

    expect(data.chains.length).toBe(2);
    expect(data.chains[0]).toMatchObject({
      id: 1,
      name: 'Ethereum',
      network: 'evm',
    });
  });

  it('should include protocol information', async () => {
    const response = await GET();
    const data = await response.json();

    expect(data.protocols.length).toBe(2);
    expect(data.protocols[0]).toMatchObject({
      id: 'aave-v3',
      name: 'Aave V3',
      category: 'lending',
    });
  });

  it('should return degraded status when a chain is unhealthy', async () => {
    const { chainRegistry } = await import('@/chains');
    vi.mocked(chainRegistry.healthCheckAll).mockResolvedValue({ 1: true, 42161: false });

    const response = await GET();
    const data = await response.json();

    expect(data.status).toBe('degraded');
  });

  it('should include health check details for each chain', async () => {
    const response = await GET();
    const data = await response.json();

    const ethChain = data.chains.find((c: any) => c.id === 1);
    expect(ethChain.healthy).toBe(true);
    expect(ethChain.failureCount).toBe(0);
    expect(ethChain.rpcUrl).toBeDefined();
  });
});
