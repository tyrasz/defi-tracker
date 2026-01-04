import type { Chain } from 'viem';

export type ChainId = 1 | 42161 | 10 | 8453;

export type NetworkType = 'evm' | 'solana';

export interface ChainConfig {
  id: ChainId;
  name: string;
  network: NetworkType;
  viemChain: Chain;
  rpcUrls: string[];
  blockExplorer: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  multicall3Address: `0x${string}`;
  contracts: {
    weth?: `0x${string}`;
    usdc?: `0x${string}`;
    usdt?: `0x${string}`;
  };
}

export const CHAIN_NAMES: Record<ChainId, string> = {
  1: 'Ethereum',
  42161: 'Arbitrum',
  10: 'Optimism',
  8453: 'Base',
};
