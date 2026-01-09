import { NextResponse } from 'next/server';
import { chainRegistry } from '@/chains';
import { protocolRegistry } from '@/protocols';

export async function GET() {
  const chains = chainRegistry.getAllChains();
  const evmChains = chainRegistry.getEvmChains();
  const protocols = protocolRegistry.getAllAdapters();

  // Get RPC health status (only for EVM chains)
  const rpcStatus = chainRegistry.getRpcStatus();
  const healthResults = await chainRegistry.healthCheckAll();

  const chainHealth = chains.map((c) => {
    const status = rpcStatus[c.id];
    const isEvmChain = typeof c.id === 'number';

    return {
      id: c.id,
      name: c.name,
      network: c.network,
      rpcUrl: status?.rpcUrl,
      // Only EVM chains have health check results
      healthy: isEvmChain ? healthResults[c.id as keyof typeof healthResults] : null,
      failureCount: status?.health.failureCount ?? 0,
      lastSuccess: status?.health.lastSuccess,
      lastFailure: status?.health.lastFailure,
    };
  });

  const evmChainHealth = chainHealth.filter((c) => c.healthy !== null);
  const allHealthy = evmChainHealth.every((c) => c.healthy);

  return NextResponse.json({
    status: allHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    chains: chainHealth,
    protocols: protocols.map((p) => ({
      id: p.protocol.id,
      name: p.protocol.name,
      category: p.protocol.category,
      earnsYield: p.protocol.earnsYield,
      supportedChains: p.supportedChains,
    })),
  });
}
