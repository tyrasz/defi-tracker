import type { Address } from 'viem';
import type { ChainId } from '@/types/chain';

interface RocketPoolAddresses {
  rETH: Address;
}

export const ROCKET_POOL_ADDRESSES: Partial<Record<ChainId, RocketPoolAddresses>> = {
  1: {
    rETH: '0xae78736Cd615f374D3085123A210448E74Fc6393',
  },
  42161: {
    rETH: '0xEC70Dcb4A1EFa46b8F2D97C310C9c4790ba5ffA8',
  },
  10: {
    rETH: '0x9Bcef72be871e61ED4fBbc7630889beE758eb81D',
  },
  8453: {
    rETH: '0xB6fe221Fe9EeF5aBa221c348bA20A1Bf5e73624c',
  },
};

// Current Rocket Pool staking APR estimate
export const ROCKET_POOL_ESTIMATED_APR = 0.032; // ~3.2%
