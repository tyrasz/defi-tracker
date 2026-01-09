import { avalanche } from 'viem/chains';
import type { EvmChainConfig } from '@/types/chain';

export const avalancheConfig: EvmChainConfig = {
  id: 43114,
  name: 'Avalanche',
  network: 'evm',
  viemChain: avalanche,
  rpcUrls: [
    process.env.AVALANCHE_RPC_URL || 'https://api.avax.network/ext/bc/C/rpc',
    'https://rpc.ankr.com/avalanche',
    'https://avalanche-c-chain-rpc.publicnode.com',
  ],
  blockExplorer: 'https://snowtrace.io',
  nativeCurrency: {
    name: 'Avalanche',
    symbol: 'AVAX',
    decimals: 18,
  },
  multicall3Address: '0xcA11bde05977b3631167028862bE2a173976CA11',
  contracts: {
    weth: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7', // WAVAX
    usdc: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
    usdt: '0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7',
    dai: '0xd586E7F844cEa2F87f50152665BCbc2C279D8d70',
  },
};
