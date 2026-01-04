import type { ChainId } from '@/types/chain';
import type { IProtocolAdapter } from './types';
// Lending
import { AaveV3Adapter } from './lending/aave-v3';
import { CompoundV3Adapter } from './lending/compound-v3';
import { SparkAdapter } from './lending/spark';
import { MorphoAdapter } from './lending/morpho';
// Liquid Staking
import { LidoAdapter } from './liquid-staking/lido';
import { RocketPoolAdapter } from './liquid-staking/rocket-pool';
// Restaking
import { EigenLayerAdapter } from './restaking/eigenlayer';
// DEX
import { UniswapV3Adapter } from './dex/uniswap-v3';
import { CurveAdapter } from './dex/curve';
// Yield Aggregators
import { YearnV3Adapter } from './yield-aggregator/yearn-v3';
import { ConvexAdapter } from './yield-aggregator/convex';
// CDP
import { MakerAdapter } from './cdp/maker';

class ProtocolRegistry {
  private adapters: Map<string, IProtocolAdapter> = new Map();

  constructor() {
    // Lending
    this.registerAdapter(new AaveV3Adapter());
    this.registerAdapter(new CompoundV3Adapter());
    this.registerAdapter(new SparkAdapter());
    this.registerAdapter(new MorphoAdapter());
    // Liquid Staking
    this.registerAdapter(new LidoAdapter());
    this.registerAdapter(new RocketPoolAdapter());
    // Restaking
    this.registerAdapter(new EigenLayerAdapter());
    // DEX
    this.registerAdapter(new UniswapV3Adapter());
    this.registerAdapter(new CurveAdapter());
    // Yield Aggregators
    this.registerAdapter(new YearnV3Adapter());
    this.registerAdapter(new ConvexAdapter());
    // CDP
    this.registerAdapter(new MakerAdapter());
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
