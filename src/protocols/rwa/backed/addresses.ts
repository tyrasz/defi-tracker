import type { Address } from 'viem';
import type { ChainId } from '@/types/chain';

export interface BackedToken {
  address: Address;
  symbol: string;
  name: string;
  decimals: number;
  // Approximate APY for treasury products
  estimatedApy: number;
  underlying: string;
}

// Backed Finance Treasury Products (RWA)
export const BACKED_RWA_TOKENS: Partial<Record<ChainId, BackedToken[]>> = {
  // Ethereum Mainnet
  1: [
    {
      address: '0xCA30c93B02514f86d5C86a6e375E3A330B435Fb5',
      symbol: 'bIB01',
      name: 'Backed IB01 $ Treasury Bond 0-1yr',
      decimals: 18,
      estimatedApy: 0.052, // ~5.2% from short-term treasuries
      underlying: 'iShares $ Treasury Bond 0-1yr UCITS ETF',
    },
    {
      address: '0x2F123cF3F37CE3328CC9B5b8415f9EC5109b45e7',
      symbol: 'bIBTA',
      name: 'Backed IBTA $ Treasury Bond 1-3yr',
      decimals: 18,
      estimatedApy: 0.048, // ~4.8% from 1-3yr treasuries
      underlying: 'iShares $ Treasury Bond 1-3yr UCITS ETF',
    },
    {
      address: '0x52d134c6DB5889FaD3542A09eAf7Aa90C0fdf9E4',
      symbol: 'bC3M',
      name: 'Backed C3M € Govt Bond 0-3m',
      decimals: 18,
      estimatedApy: 0.038, // ~3.8% EUR short-term
      underlying: 'Amundi ETF Govies 0-6 Months Euro Investment Grade',
    },
  ],
};
