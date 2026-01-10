import { createPublicClient, http, type PublicClient, type Chain } from 'viem';
import { mainnet, arbitrum, optimism, base, polygon, avalanche, bsc } from 'viem/chains';

export type EvmChainId = 1 | 42161 | 10 | 8453 | 137 | 43114 | 56;

interface ChainConfig {
  id: EvmChainId;
  name: string;
  chain: Chain;
  rpcUrls: string[];
  nativeSymbol: string;
}

const CHAIN_CONFIGS: ChainConfig[] = [
  {
    id: 1,
    name: 'Ethereum',
    chain: mainnet,
    rpcUrls: [
      'https://eth.llamarpc.com',
      'https://rpc.ankr.com/eth',
      'https://cloudflare-eth.com',
    ],
    nativeSymbol: 'ETH',
  },
  {
    id: 42161,
    name: 'Arbitrum',
    chain: arbitrum,
    rpcUrls: [
      'https://arb1.arbitrum.io/rpc',
      'https://rpc.ankr.com/arbitrum',
    ],
    nativeSymbol: 'ETH',
  },
  {
    id: 10,
    name: 'Optimism',
    chain: optimism,
    rpcUrls: [
      'https://mainnet.optimism.io',
      'https://rpc.ankr.com/optimism',
    ],
    nativeSymbol: 'ETH',
  },
  {
    id: 8453,
    name: 'Base',
    chain: base,
    rpcUrls: [
      'https://mainnet.base.org',
      'https://base.llamarpc.com',
    ],
    nativeSymbol: 'ETH',
  },
  {
    id: 137,
    name: 'Polygon',
    chain: polygon,
    rpcUrls: [
      'https://polygon-rpc.com',
      'https://rpc.ankr.com/polygon',
    ],
    nativeSymbol: 'MATIC',
  },
  {
    id: 43114,
    name: 'Avalanche',
    chain: avalanche,
    rpcUrls: [
      'https://api.avax.network/ext/bc/C/rpc',
      'https://rpc.ankr.com/avalanche',
    ],
    nativeSymbol: 'AVAX',
  },
  {
    id: 56,
    name: 'BSC',
    chain: bsc,
    rpcUrls: [
      'https://bsc-dataseed.binance.org',
      'https://rpc.ankr.com/bsc',
    ],
    nativeSymbol: 'BNB',
  },
];

class ChainService {
  private clients: Map<EvmChainId, PublicClient> = new Map();
  private configs: Map<EvmChainId, ChainConfig> = new Map();

  constructor() {
    for (const config of CHAIN_CONFIGS) {
      this.configs.set(config.id, config);
      this.clients.set(
        config.id,
        createPublicClient({
          chain: config.chain,
          transport: http(config.rpcUrls[0]),
        })
      );
    }
  }

  getClient(chainId: EvmChainId): PublicClient {
    const client = this.clients.get(chainId);
    if (!client) throw new Error(`No client for chain ${chainId}`);
    return client;
  }

  getConfig(chainId: EvmChainId): ChainConfig {
    const config = this.configs.get(chainId);
    if (!config) throw new Error(`No config for chain ${chainId}`);
    return config;
  }

  getAllChainIds(): EvmChainId[] {
    return Array.from(this.configs.keys());
  }

  async withFailover<T>(
    chainId: EvmChainId,
    fn: (client: PublicClient) => Promise<T>
  ): Promise<T> {
    const config = this.getConfig(chainId);
    let lastError: Error | null = null;

    for (const rpcUrl of config.rpcUrls) {
      try {
        const client = createPublicClient({
          chain: config.chain,
          transport: http(rpcUrl),
        });
        return await fn(client);
      } catch (error) {
        lastError = error as Error;
        console.warn(`RPC failed for ${config.name} (${rpcUrl}):`, error);
      }
    }

    throw lastError || new Error(`All RPCs failed for chain ${chainId}`);
  }
}

export const chainService = new ChainService();
