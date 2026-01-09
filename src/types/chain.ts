import type { Chain } from 'viem';

// EVM Chains: Ethereum (1), Arbitrum (42161), Optimism (10), Base (8453), Polygon (137), Avalanche (43114), BSC (56)
// Non-EVM: Solana uses string addresses
export type EvmChainId = 1 | 42161 | 10 | 8453 | 137 | 43114 | 56;
export type ChainId = EvmChainId | 'solana';

export type NetworkType = 'evm' | 'solana';

// Base interface for all chains
export interface BaseChainConfig {
  id: ChainId;
  name: string;
  network: NetworkType;
  rpcUrls: string[];
  blockExplorer: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

// EVM-specific chain config
export interface EvmChainConfig extends BaseChainConfig {
  id: EvmChainId;
  network: 'evm';
  viemChain: Chain;
  multicall3Address: `0x${string}`;
  contracts: {
    weth?: `0x${string}`;
    usdc?: `0x${string}`;
    usdt?: `0x${string}`;
    dai?: `0x${string}`;
    usds?: `0x${string}`;
    usde?: `0x${string}`;
  };
}

// Solana-specific chain config
export interface SolanaChainConfig extends BaseChainConfig {
  id: 'solana';
  network: 'solana';
  tokens: {
    wsol?: string;
    usdc?: string;
    usdt?: string;
  };
}

// Union type for all chain configs
export type ChainConfig = EvmChainConfig | SolanaChainConfig;

// Legacy type alias for backwards compatibility
export type { EvmChainConfig as LegacyChainConfig };

export const CHAIN_NAMES: Record<ChainId, string> = {
  1: 'Ethereum',
  42161: 'Arbitrum',
  10: 'Optimism',
  8453: 'Base',
  137: 'Polygon',
  43114: 'Avalanche',
  56: 'BSC',
  'solana': 'Solana',
};
