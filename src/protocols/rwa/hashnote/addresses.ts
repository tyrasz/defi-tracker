import type { Address } from 'viem';
import type { ChainId } from '@/types/chain';

export interface HashnoteToken {
  address: Address;
  symbol: string;
  name: string;
  decimals: number;
  estimatedApy: number;
}

export const HASHNOTE_TOKENS: Partial<Record<ChainId, HashnoteToken[]>> = {
  // Ethereum Mainnet
  1: [
    {
      address: '0x136471a34f6ef19fE571EFFC1CA711fdb8E49f2b',
      symbol: 'USYC',
      name: 'Hashnote US Yield Coin',
      decimals: 6,
      estimatedApy: 0.053, // ~5.3% from T-bills
    },
  ],
};
