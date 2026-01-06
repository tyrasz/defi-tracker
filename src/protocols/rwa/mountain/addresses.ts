import type { Address } from 'viem';
import type { ChainId } from '@/types/chain';

export interface MountainToken {
  address: Address;
  symbol: string;
  name: string;
  decimals: number;
  // Approximate APY - actual yield comes from underlying treasuries
  estimatedApy: number;
}

export const MOUNTAIN_TOKENS: Partial<Record<ChainId, MountainToken[]>> = {
  // Ethereum Mainnet
  1: [
    {
      address: '0x59D9356E565Ab3A36dD77763Fc0d87fEaf85508C',
      symbol: 'USDM',
      name: 'Mountain Protocol USD',
      decimals: 18,
      estimatedApy: 0.05, // ~5% from T-bills
    },
  ],
  // Base
  8453: [
    {
      address: '0x59D9356E565Ab3A36dD77763Fc0d87fEaf85508C',
      symbol: 'USDM',
      name: 'Mountain Protocol USD',
      decimals: 18,
      estimatedApy: 0.05,
    },
  ],
  // Arbitrum
  42161: [
    {
      address: '0x59D9356E565Ab3A36dD77763Fc0d87fEaf85508C',
      symbol: 'USDM',
      name: 'Mountain Protocol USD',
      decimals: 18,
      estimatedApy: 0.05,
    },
  ],
  // Optimism
  10: [
    {
      address: '0x59D9356E565Ab3A36dD77763Fc0d87fEaf85508C',
      symbol: 'USDM',
      name: 'Mountain Protocol USD',
      decimals: 18,
      estimatedApy: 0.05,
    },
  ],
};
