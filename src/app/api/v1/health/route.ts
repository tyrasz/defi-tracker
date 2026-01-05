import { NextResponse } from 'next/server';
import { chainRegistry } from '@/chains';
import { protocolRegistry } from '@/protocols';

export async function GET() {
  const chains = chainRegistry.getAllChains();
  const protocols = protocolRegistry.getAllAdapters();

  // Get RPC health status
  const rpcStatus = chainRegistry.getRpcStatus();
  const healthResults = await chainRegistry.healthCheckAll();

  const chainHealth = chains.map((c) => {
    const status = rpcStatus[c.id];
    return {
      id: c.id,
      name: c.name,
      rpcUrl: status?.rpcUrl,
      healthy: healthResults[c.id],
      failureCount: status?.health.failureCount ?? 0,
      lastSuccess: status?.health.lastSuccess,
      lastFailure: status?.health.lastFailure,
    };
  });

  const allHealthy = chainHealth.every((c) => c.healthy);

  return NextResponse.json({
    status: allHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    chains: chainHealth,
    protocols: protocols.map((p) => ({
      id: p.protocol.id,
      name: p.protocol.name,
      category: p.protocol.category,
      supportedChains: p.supportedChains,
    })),
  });
}
