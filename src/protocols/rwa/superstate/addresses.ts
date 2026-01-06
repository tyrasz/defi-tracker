import type { Address } from 'viem';
import type { ChainId } from '@/types/chain';

export interface SuperstateToken {
  address: Address;
  symbol: string;
  name: string;
  decimals: number;
  estimatedApy: number;
}

export const SUPERSTATE_TOKENS: Partial<Record<ChainId, SuperstateToken[]>> = {
  // Ethereum Mainnet
  1: [
    {
      address: '0x43415eB6ff9DB7E26A15b704e7A3eDCe97d96C47',
      symbol: 'USTB',
      name: 'Superstate Short Duration US Government Securities Fund',
      decimals: 6,
      estimatedApy: 0.051, // ~5.1% from short-term treasuries
    },
  ],
};
