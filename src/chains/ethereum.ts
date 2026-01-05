import { mainnet } from 'viem/chains';
import type { ChainConfig } from '@/types/chain';

export const ethereumConfig: ChainConfig = {
  id: 1,
  name: 'Ethereum',
  network: 'evm',
  viemChain: mainnet,
  rpcUrls: [
    process.env.ETHEREUM_RPC_URL || 'https://eth.llamarpc.com',
    'https://rpc.ankr.com/eth',
    'https://ethereum.publicnode.com',
  ],
  blockExplorer: 'https://etherscan.io',
  nativeCurrency: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  multicall3Address: '0xcA11bde05977b3631167028862bE2a173976CA11',
  contracts: {
    weth: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    usdc: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    usdt: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    dai: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
    usds: '0xdC035D45d973E3EC169d2276DDab16f1e407384F',
    usde: '0x4c9EDD5852cd905f086C759E8383e09bff1E68B3',
  },
};
