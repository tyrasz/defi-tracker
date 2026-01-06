import type { Address } from 'viem';
import type { ChainId } from '@/types/chain';

interface PendleAddresses {
  router: Address;
  routerStatic: Address;
  marketFactory: Address;
}

// Popular Pendle markets to track
interface PendleMarket {
  address: Address;
  name: string;
  underlying: string;
  maturity: string; // ISO date string
  pt: Address;
  yt: Address;
}

export const PENDLE_ADDRESSES: Partial<Record<ChainId, PendleAddresses>> = {
  // Ethereum Mainnet
  1: {
    router: '0x00000000005BBB0EF59571E58418F9a4357b68A0',
    routerStatic: '0x263833d47eA3fA4a30f269323aba6a107f9eB14C',
    marketFactory: '0x27b1dAcD74688aF24a64BD3c9C1b143118740784',
  },
  // Arbitrum
  42161: {
    router: '0x00000000005BBB0EF59571E58418F9a4357b68A0',
    routerStatic: '0xAdB09F65bd90d19e3148D9ccb693F3161C6DB3E8',
    marketFactory: '0x2FCb47B58350cD377f94d3821e7373Df60bD9Ced',
  },
};

// Popular markets to check for positions
export const PENDLE_MARKETS: Partial<Record<ChainId, PendleMarket[]>> = {
  // Ethereum Mainnet
  1: [
    {
      address: '0xD0354D4e7bCf345fB117cabe41aCaDb724eccCa2',
      name: 'PT-sUSDe-26DEC2024',
      underlying: 'sUSDe',
      maturity: '2024-12-26',
      pt: '0x6c9f097e044506712B58EAC670c9a5fd4BCceF13',
      yt: '0x4815AA2fd184e7Dd63d0c53B7A3B7D5A6F27bE19',
    },
    {
      address: '0xcDd26Eb5EB2Ce0f203a84553853667Fb73FAB908',
      name: 'PT-eETH-26DEC2024',
      underlying: 'weETH',
      maturity: '2024-12-26',
      pt: '0x6ee2b5E19ECBa773a352E5B21415Dc419A700d1d',
      yt: '0x129e6B5DBC0Ecc12F9e486C5BC9cDF1a6A80bc49',
    },
    {
      address: '0x7d372819240D14fB477f17b964f95F33BeB4c704',
      name: 'PT-rsETH-26DEC2024',
      underlying: 'rsETH',
      maturity: '2024-12-26',
      pt: '0xB05cABCd99cf9a73B19805edefC5f67CA5d1895E',
      yt: '0x94A47b1b67088C5A65e3aE0D56E94e8b6C0fFfe7',
    },
  ],
  // Arbitrum
  42161: [
    {
      address: '0x952083cde7aaa11AB8449057F7de23A970AA8472',
      name: 'PT-GLP-28MAR2024',
      underlying: 'GLP',
      maturity: '2024-03-28',
      pt: '0x96015D0Fb97139567a9ba675951816a0Bb719E3c',
      yt: '0x56051f8e46b67b4d286454995dBC6F5f3C433E34',
    },
  ],
};
