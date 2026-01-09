import { optimism } from 'viem/chains';
import type { EvmChainConfig } from '@/types/chain';

export const optimismConfig: EvmChainConfig = {
  id: 10,
  name: 'Optimism',
  network: 'evm',
  viemChain: optimism,
  rpcUrls: [
    process.env.OPTIMISM_RPC_URL || 'https://mainnet.optimism.io',
    'https://rpc.ankr.com/optimism',
    'https://optimism.publicnode.com',
  ],
  blockExplorer: 'https://optimistic.etherscan.io',
  nativeCurrency: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  multicall3Address: '0xcA11bde05977b3631167028862bE2a173976CA11',
  contracts: {
    weth: '0x4200000000000000000000000000000000000006',
    usdc: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
    usdt: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
    dai: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
    usde: '0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34',
  },
};
