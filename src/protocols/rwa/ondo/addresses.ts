import type { Address } from 'viem';
import type { ChainId } from '@/types/chain';

export interface OndoToken {
  address: Address;
  symbol: string;
  name: string;
  decimals: number;
  // Approximate APY - actual yield comes from underlying treasuries
  estimatedApy: number;
}

export const ONDO_TOKENS: Partial<Record<ChainId, OndoToken[]>> = {
  // Ethereum Mainnet
  1: [
    {
      address: '0x96F6eF951840721AdBF46Ac996b59E0235CB985C',
      symbol: 'USDY',
      name: 'Ondo US Dollar Yield',
      decimals: 18,
      estimatedApy: 0.0525, // ~5.25% from T-bills
    },
    {
      address: '0x1B19C19393e2d034D8Ff31ff34c81252FcBbee92',
      symbol: 'OUSG',
      name: 'Ondo Short-Term US Government Bond Fund',
      decimals: 18,
      estimatedApy: 0.052, // ~5.2% from short-term treasuries
    },
  ],
  // Arbitrum
  42161: [
    {
      address: '0x35e050d3C0eC2d29D269a8EcEa763a183bDF9A9D',
      symbol: 'USDY',
      name: 'Ondo US Dollar Yield',
      decimals: 18,
      estimatedApy: 0.0525,
    },
  ],
};
