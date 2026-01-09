import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '../resolve/[nameOrAddress]/route';

// Mock ENS resolver
vi.mock('@/core/ens', () => ({
  ensResolver: {
    resolveToAddress: vi.fn(),
    getEnsAvatar: vi.fn(),
  },
}));

describe('Resolve API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createMockRequest = () => {
    return new NextRequest('http://localhost/api/v1/resolve/test');
  };

  const createParams = (nameOrAddress: string) => ({
    params: Promise.resolve({ nameOrAddress }),
  });

  it('should resolve a valid Ethereum address', async () => {
    const { ensResolver } = await import('@/core/ens');
    const mockAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0';

    vi.mocked(ensResolver.resolveToAddress).mockResolvedValue({
      address: mockAddress as `0x${string}`,
      ensName: 'vitalik.eth',
      isEns: false,
    });
    vi.mocked(ensResolver.getEnsAvatar).mockResolvedValue(null);

    const response = await GET(createMockRequest(), createParams(mockAddress));
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.address).toBe(mockAddress);
    expect(data.isEns).toBe(false);
  });

  it('should resolve an ENS name to address', async () => {
    const { ensResolver } = await import('@/core/ens');
    const mockAddress = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';

    vi.mocked(ensResolver.resolveToAddress).mockResolvedValue({
      address: mockAddress as `0x${string}`,
      ensName: 'vitalik.eth',
      isEns: true,
    });
    vi.mocked(ensResolver.getEnsAvatar).mockResolvedValue('https://example.com/avatar.png');

    const response = await GET(createMockRequest(), createParams('vitalik.eth'));
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.address).toBe(mockAddress);
    expect(data.ensName).toBe('vitalik.eth');
    expect(data.isEns).toBe(true);
    expect(data.avatar).toBe('https://example.com/avatar.png');
  });

  it('should return 404 for unresolvable ENS name', async () => {
    const { ensResolver } = await import('@/core/ens');

    vi.mocked(ensResolver.resolveToAddress).mockResolvedValue({
      address: null,
      ensName: null,
      isEns: true,
    });

    const response = await GET(createMockRequest(), createParams('nonexistent.eth'));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Could not resolve');
  });

  it('should return 500 on error', async () => {
    const { ensResolver } = await import('@/core/ens');

    vi.mocked(ensResolver.resolveToAddress).mockRejectedValue(new Error('RPC Error'));

    const response = await GET(createMockRequest(), createParams('test.eth'));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Failed to resolve');
  });
});
