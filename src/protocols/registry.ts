import type { ChainId } from '@/types/chain';
import type { IProtocolAdapter } from './types';
import { AaveV3Adapter } from './lending/aave-v3';
import { CompoundV3Adapter } from './lending/compound-v3';
import { LidoAdapter } from './liquid-staking/lido';
import { RocketPoolAdapter } from './liquid-staking/rocket-pool';
import { UniswapV3Adapter } from './dex/uniswap-v3';
import { CurveAdapter } from './dex/curve';
import { YearnV3Adapter } from './yield-aggregator/yearn-v3';

class ProtocolRegistry {
  private adapters: Map<string, IProtocolAdapter> = new Map();

  constructor() {
    this.registerAdapter(new AaveV3Adapter());
    this.registerAdapter(new CompoundV3Adapter());
    this.registerAdapter(new LidoAdapter());
    this.registerAdapter(new RocketPoolAdapter());
    this.registerAdapter(new UniswapV3Adapter());
    this.registerAdapter(new CurveAdapter());
    this.registerAdapter(new YearnV3Adapter());
  }

  registerAdapter(adapter: IProtocolAdapter): void {
    this.adapters.set(adapter.protocol.id, adapter);
  }

  getAdapter(protocolId: string): IProtocolAdapter | undefined {
    return this.adapters.get(protocolId);
  }

  getAllAdapters(): IProtocolAdapter[] {
    return Array.from(this.adapters.values());
  }

  getAdaptersForChain(chainId: ChainId): IProtocolAdapter[] {
    return this.getAllAdapters().filter((adapter) =>
      adapter.supportedChains.includes(chainId)
    );
  }

  getAdaptersByCategory(category: string): IProtocolAdapter[] {
    return this.getAllAdapters().filter(
      (adapter) => adapter.protocol.category === category
    );
  }
}

export const protocolRegistry = new ProtocolRegistry();
