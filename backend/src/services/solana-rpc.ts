// Shared Solana RPC configuration
// Uses Helius if API key is provided, falls back to public RPC

export const SOLANA_RPC = process.env.HELIUS_API_KEY
  ? `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`
  : 'https://api.mainnet-beta.solana.com';

// Log which RPC is being used (once at startup)
if (process.env.HELIUS_API_KEY) {
  console.log('Using Helius RPC for Solana');
} else {
  console.log('Using public Solana RPC (rate limits apply)');
}
