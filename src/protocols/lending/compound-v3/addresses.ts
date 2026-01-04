import type { Address } from 'viem';
import type { ChainId } from '@/types/chain';

interface CompoundV3Market {
  comet: Address;
  baseToken: Address;
  baseSymbol: string;
}

export const COMPOUND_V3_MARKETS: Partial<Record<ChainId, CompoundV3Market[]>> = {
  1: [
    {
      comet: '0xc3d688B66703497DAA19211EEdff47f25384cdc3',
      baseToken: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      baseSymbol: 'USDC',
    },
    {
      comet: '0xA17581A9E3356d9A858b789D68B4d866e593aE94',
      baseToken: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      baseSymbol: 'WETH',
    },
  ],
  42161: [
    {
      comet: '0xA5EDBDD9646f8dFF606d7448e414884C7d905dCA',
      baseToken: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      baseSymbol: 'USDC',
    },
  ],
  10: [
    {
      comet: '0x2e44e174f7D53F0212823acC11C01A11d58c5bCB',
      baseToken: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      baseSymbol: 'USDC',
    },
  ],
  8453: [
    {
      comet: '0xb125E6687d4313864e53df431d5425969c15Eb2F',
      baseToken: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      baseSymbol: 'USDC',
    },
    {
      comet: '0x46e6b214b524310239732D51387075E0e70970bf',
      baseToken: '0x4200000000000000000000000000000000000006',
      baseSymbol: 'WETH',
    },
  ],
};
