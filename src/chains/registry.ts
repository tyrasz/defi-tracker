import { createPublicClient, http, type PublicClient } from 'viem';
import type { ChainConfig, ChainId } from '@/types/chain';
import { ethereumConfig } from './ethereum';
import { arbitrumConfig } from './arbitrum';
import { optimismConfig } from './optimism';
import { baseConfig } from './base';

class ChainRegistry {
  private chains: Map<ChainId, ChainConfig> = new Map();
  private clients: Map<ChainId, PublicClient> = new Map();
  private rpcIndex: Map<ChainId, number> = new Map();

  constructor() {
    this.registerChain(ethereumConfig);
    this.registerChain(arbitrumConfig);
    this.registerChain(optimismConfig);
    this.registerChain(baseConfig);
  }

  registerChain(config: ChainConfig): void {
    this.chains.set(config.id, config);
    this.rpcIndex.set(config.id, 0);
  }

  getChain(chainId: ChainId): ChainConfig | undefined {
    return this.chains.get(chainId);
  }

  getAllChains(): ChainConfig[] {
    return Array.from(this.chains.values());
  }

  getClient(chainId: ChainId): PublicClient {
    if (!this.clients.has(chainId)) {
      const config = this.chains.get(chainId);
      if (!config) {
        throw new Error(`Chain ${chainId} not registered`);
      }

      const rpcIndex = this.rpcIndex.get(chainId) || 0;
      const rpcUrl = config.rpcUrls[rpcIndex];

      const client = createPublicClient({
        chain: config.viemChain,
        transport: http(rpcUrl),
        batch: {
          multicall: {
            batchSize: 1024,
            wait: 16,
          },
        },
      });

      this.clients.set(chainId, client as PublicClient);
    }

    return this.clients.get(chainId)!;
  }

  rotateRpc(chainId: ChainId): void {
    const config = this.chains.get(chainId);
    if (!config) return;

    const currentIndex = this.rpcIndex.get(chainId) || 0;
    const nextIndex = (currentIndex + 1) % config.rpcUrls.length;
    this.rpcIndex.set(chainId, nextIndex);
    this.clients.delete(chainId);
  }

  getSupportedChainIds(): ChainId[] {
    return Array.from(this.chains.keys());
  }
}

export const chainRegistry = new ChainRegistry();
