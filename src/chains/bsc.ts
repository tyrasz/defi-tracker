import { bsc } from 'viem/chains';
import type { EvmChainConfig } from '@/types/chain';

export const bscConfig: EvmChainConfig = {
  id: 56,
  name: 'BSC',
  network: 'evm',
  viemChain: bsc,
  rpcUrls: [
    process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org',
    'https://rpc.ankr.com/bsc',
    'https://bsc-rpc.publicnode.com',
  ],
  blockExplorer: 'https://bscscan.com',
  nativeCurrency: {
    name: 'BNB',
    symbol: 'BNB',
    decimals: 18,
  },
  multicall3Address: '0xcA11bde05977b3631167028862bE2a173976CA11',
  contracts: {
    weth: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', // WBNB
    usdc: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
    usdt: '0x55d398326f99059fF775485246999027B3197955',
    dai: '0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3',
  },
};
