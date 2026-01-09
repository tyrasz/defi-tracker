import type { SolanaChainConfig } from '@/types/chain';

export const solanaConfig: SolanaChainConfig = {
  id: 'solana',
  name: 'Solana',
  network: 'solana',
  rpcUrls: [
    process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
    'https://rpc.ankr.com/solana',
    'https://solana.publicnode.com',
  ],
  blockExplorer: 'https://solscan.io',
  nativeCurrency: {
    name: 'Solana',
    symbol: 'SOL',
    decimals: 9,
  },
  tokens: {
    wsol: 'So11111111111111111111111111111111111111112',
    usdc: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    usdt: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
  },
};
