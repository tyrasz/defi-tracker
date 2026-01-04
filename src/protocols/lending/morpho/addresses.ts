import type { ChainId } from '@/types/chain';

export const MORPHO_ADDRESSES: Partial<Record<ChainId, {
  morphoBlue: `0x${string}`;
  metaMorphoFactory: `0x${string}`;
  // Popular MetaMorpho vaults
  vaults: {
    address: `0x${string}`;
    name: string;
    symbol: string;
    asset: `0x${string}`;
  }[];
}>> = {
  1: {
    morphoBlue: '0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb',
    metaMorphoFactory: '0xA9c3D3a366466Fa809d1Ae982Fb2c46E5fC41101',
    vaults: [
      {
        address: '0x78Fc2c2eD1A4cDb5402365934aE5648aDAd094d0',
        name: 'Morpho Steakhouse USDC',
        symbol: 'steakUSDC',
        asset: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
      },
      {
        address: '0xBEEF01735c132Ada46AA9aA4c54623cAA92A64CB',
        name: 'Morpho Steakhouse ETH',
        symbol: 'steakETH',
        asset: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
      },
      {
        address: '0xd63070114470f685b75B74D60EEc7c1113d33a3D',
        name: 'Gauntlet USDC Prime',
        symbol: 'gtUSDC',
        asset: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
      },
      {
        address: '0x4881Ef0BF6d2365D3dd6499ccd7532bcdBCE0658',
        name: 'Gauntlet WETH Prime',
        symbol: 'gtWETH',
        asset: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
      },
      {
        address: '0x8eB67A509616cd6A7c1B3c8C21D48FF57df3d458',
        name: 'Usual Boosted USDC',
        symbol: 'bbUSDC',
        asset: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
      },
    ],
  },
  8453: {
    morphoBlue: '0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb',
    metaMorphoFactory: '0xA9c3D3a366466Fa809d1Ae982Fb2c46E5fC41101',
    vaults: [
      {
        address: '0xc1256Ae5FF1cf2719D4937adb3bbCCab2E00A2Ca',
        name: 'Moonwell Flagship USDC',
        symbol: 'mwUSDC',
        asset: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC on Base
      },
      {
        address: '0xa0E430870c4604CcfC7B38Ca7845B1FF653D0ff1',
        name: 'Moonwell Flagship ETH',
        symbol: 'mwETH',
        asset: '0x4200000000000000000000000000000000000006', // WETH on Base
      },
    ],
  },
};
