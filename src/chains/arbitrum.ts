import { arbitrum } from 'viem/chains';
import type { ChainConfig } from '@/types/chain';

export const arbitrumConfig: ChainConfig = {
  id: 42161,
  name: 'Arbitrum',
  network: 'evm',
  viemChain: arbitrum,
  rpcUrls: [
    process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc',
    'https://rpc.ankr.com/arbitrum',
    'https://arbitrum.publicnode.com',
  ],
  blockExplorer: 'https://arbiscan.io',
  nativeCurrency: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  multicall3Address: '0xcA11bde05977b3631167028862bE2a173976CA11',
  contracts: {
    weth: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
    usdc: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    usdt: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
  },
};
