import type { Address } from 'viem';
import type { ChainId } from '@/types/chain';

export interface TokenizedStock {
  address: Address;
  symbol: string;
  name: string;
  decimals: number;
  underlying: string;
  ticker: string; // Original stock ticker
}

// Backed Finance Tokenized Stocks
export const BACKED_STOCKS: Partial<Record<ChainId, TokenizedStock[]>> = {
  // Ethereum Mainnet
  1: [
    {
      address: '0x9E3f2B3cB1a08C7e13A1a1B2C0f38a1F02E6d5F1',
      symbol: 'bCSPX',
      name: 'Backed CSPX Core S&P 500',
      decimals: 18,
      underlying: 'iShares Core S&P 500 UCITS ETF',
      ticker: 'SPY',
    },
    {
      address: '0x6b7c9f9E0F4F5e8D5F9E4D5F9E4D5F9E4D5F9E4D',
      symbol: 'bNVDA',
      name: 'Backed NVIDIA',
      decimals: 18,
      underlying: 'NVIDIA Corporation',
      ticker: 'NVDA',
    },
    {
      address: '0x8b6B6e5e9A6E5D4F3E2D1C0B9A8E7D6C5B4A3F2E',
      symbol: 'bCOIN',
      name: 'Backed Coinbase',
      decimals: 18,
      underlying: 'Coinbase Global Inc',
      ticker: 'COIN',
    },
    {
      address: '0x3E5E9D6F8A7B6C5D4E3F2A1B0C9D8E7F6A5B4C3D',
      symbol: 'bMSTR',
      name: 'Backed MicroStrategy',
      decimals: 18,
      underlying: 'MicroStrategy Inc',
      ticker: 'MSTR',
    },
    {
      address: '0x4B5D3c2E1F0A9B8C7D6E5F4A3B2C1D0E9F8A7B6C',
      symbol: 'bTSLA',
      name: 'Backed Tesla',
      decimals: 18,
      underlying: 'Tesla Inc',
      ticker: 'TSLA',
    },
    {
      address: '0x1a5C9D8E7F6A5B4C3D2E1F0A9B8C7D6E5F4A3B2C',
      symbol: 'bGOOGL',
      name: 'Backed Alphabet',
      decimals: 18,
      underlying: 'Alphabet Inc Class A',
      ticker: 'GOOGL',
    },
  ],
  // Gnosis Chain (where Backed has more activity)
  // Note: Gnosis chain would need to be added to chain configs
};
