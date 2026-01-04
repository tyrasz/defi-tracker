import type { Address } from 'viem';
import type { ChainId } from '@/types/chain';

interface LidoAddresses {
  stETH: Address;
  wstETH: Address;
}

export const LIDO_ADDRESSES: Partial<Record<ChainId, LidoAddresses>> = {
  1: {
    stETH: '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84',
    wstETH: '0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0',
  },
  42161: {
    stETH: '0x0000000000000000000000000000000000000000', // Not on Arbitrum
    wstETH: '0x5979D7b546E38E414F7E9822514be443A4800529',
  },
  10: {
    stETH: '0x0000000000000000000000000000000000000000', // Not on Optimism
    wstETH: '0x1F32b1c2345538c0c6f582fCB022739c4A194Ebb',
  },
  8453: {
    stETH: '0x0000000000000000000000000000000000000000', // Not on Base
    wstETH: '0xc1CBa3fCea344f92D9239c08C0568f6F2F0ee452',
  },
};

// Current Lido staking APR (fetched from API or calculated from oracle)
// This is a fallback estimate, actual rate should be fetched on-chain
export const LIDO_ESTIMATED_APR = 0.034; // ~3.4%
