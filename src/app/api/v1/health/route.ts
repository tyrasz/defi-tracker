import { NextResponse } from 'next/server';
import { chainRegistry } from '@/chains';
import { protocolRegistry } from '@/protocols';

export async function GET() {
  const chains = chainRegistry.getAllChains();
  const protocols = protocolRegistry.getAllAdapters();

  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    chains: chains.map((c) => ({
      id: c.id,
      name: c.name,
    })),
    protocols: protocols.map((p) => ({
      id: p.protocol.id,
      name: p.protocol.name,
      category: p.protocol.category,
      supportedChains: p.supportedChains,
    })),
  });
}
