import { polygon } from 'viem/chains';
import type { EvmChainConfig } from '@/types/chain';

export const polygonConfig: EvmChainConfig = {
  id: 137,
  name: 'Polygon',
  network: 'evm',
  viemChain: polygon,
  rpcUrls: [
    process.env.POLYGON_RPC_URL || 'https://polygon.llamarpc.com',
    'https://rpc.ankr.com/polygon',
    'https://polygon-bor-rpc.publicnode.com',
  ],
  blockExplorer: 'https://polygonscan.com',
  nativeCurrency: {
    name: 'MATIC',
    symbol: 'MATIC',
    decimals: 18,
  },
  multicall3Address: '0xcA11bde05977b3631167028862bE2a173976CA11',
  contracts: {
    weth: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', // WMATIC
    usdc: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
    usdt: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
    dai: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063',
  },
};
