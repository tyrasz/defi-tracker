import type { Address } from 'viem';
import type { ChainId } from '@/types/chain';

interface UniswapV3Addresses {
  nftPositionManager: Address;
  factory: Address;
}

export const UNISWAP_V3_ADDRESSES: Partial<Record<ChainId, UniswapV3Addresses>> = {
  1: {
    nftPositionManager: '0xC36442b4a4522E871399CD717aBDD847Ab11FE88',
    factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
  },
  42161: {
    nftPositionManager: '0xC36442b4a4522E871399CD717aBDD847Ab11FE88',
    factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
  },
  10: {
    nftPositionManager: '0xC36442b4a4522E871399CD717aBDD847Ab11FE88',
    factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
  },
  8453: {
    nftPositionManager: '0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1',
    factory: '0x33128a8fC17869897dcE68Ed026d694621f6FDfD',
  },
};
