import { base } from 'viem/chains';
import type { ChainConfig } from '@/types/chain';

export const baseConfig: ChainConfig = {
  id: 8453,
  name: 'Base',
  network: 'evm',
  viemChain: base,
  rpcUrls: [
    process.env.BASE_RPC_URL || 'https://mainnet.base.org',
    'https://rpc.ankr.com/base',
    'https://base.publicnode.com',
  ],
  blockExplorer: 'https://basescan.org',
  nativeCurrency: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  multicall3Address: '0xcA11bde05977b3631167028862bE2a173976CA11',
  contracts: {
    weth: '0x4200000000000000000000000000000000000006',
    usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    dai: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
    usde: '0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34',
  },
};
