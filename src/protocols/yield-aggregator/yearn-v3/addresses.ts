import type { Address } from 'viem';
import type { ChainId } from '@/types/chain';

interface YearnVault {
  vault: Address;
  asset: Address;
  assetSymbol: string;
  name: string;
  estimatedApy?: number;
}

// Popular Yearn V3 vaults to check
export const YEARN_V3_VAULTS: Partial<Record<ChainId, YearnVault[]>> = {
  1: [
    {
      vault: '0xa354F35829Ae975e850e23e9615b11Da1B3dC4DE',
      asset: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      assetSymbol: 'USDC',
      name: 'USDC yVault',
      estimatedApy: 0.045,
    },
    {
      vault: '0xdA816459F1AB5631232FE5e97a05BBBb94970c95',
      asset: '0x6B175474E89094C44Da98b954EescdecB5816F4',
      assetSymbol: 'DAI',
      name: 'DAI yVault',
      estimatedApy: 0.04,
    },
    {
      vault: '0xa258C4606Ca8206D8aA700cE2143D7db854D168c',
      asset: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      assetSymbol: 'WETH',
      name: 'WETH yVault',
      estimatedApy: 0.025,
    },
  ],
  42161: [
    {
      vault: '0xc9B9086FddD0A9ca046798eEe96E7D9A9d7C3838',
      asset: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      assetSymbol: 'USDC',
      name: 'USDC yVault',
      estimatedApy: 0.05,
    },
  ],
};
