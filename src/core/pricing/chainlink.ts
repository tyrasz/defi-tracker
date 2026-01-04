import type { Address, PublicClient } from 'viem';
import type { ChainId } from '@/types/chain';

const CHAINLINK_AGGREGATOR_ABI = [
  {
    name: 'latestRoundData',
    type: 'function',
    inputs: [],
    outputs: [
      { name: 'roundId', type: 'uint80' },
      { name: 'answer', type: 'int256' },
      { name: 'startedAt', type: 'uint256' },
      { name: 'updatedAt', type: 'uint256' },
      { name: 'answeredInRound', type: 'uint80' },
    ],
    stateMutability: 'view',
  },
  {
    name: 'decimals',
    type: 'function',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
  },
] as const;

// Chainlink price feed addresses for common tokens (ETH mainnet)
const CHAINLINK_FEEDS: Record<string, Partial<Record<ChainId, Address>>> = {
  ETH: {
    1: '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419',
    42161: '0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612',
    10: '0x13e3Ee699D1909E989722E753853AE30b17e08c5',
    8453: '0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70',
  },
  WETH: {
    1: '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419',
    42161: '0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612',
    10: '0x13e3Ee699D1909E989722E753853AE30b17e08c5',
    8453: '0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70',
  },
  USDC: {
    1: '0x8fFfFfd4AfB6115b954Bd326cbe7B4BA576818f6',
    42161: '0x50834F3163758fcC1Df9973b6e91f0F0F0434aD3',
    10: '0x16a9FA2FDa030272Ce99B29CF780dFA30361E0f3',
    8453: '0x7e860098F58bBFC8648a4311b374B1D669a2bc6B',
  },
  USDT: {
    1: '0x3E7d1eAB13ad0104d2750B8863b489D65364e32D',
    42161: '0x3f3f5dF88dC9F13eac63DF89EC16ef6e7E25DdE7',
    10: '0xECef79E109e997bCA29c1c0897ec9d7678E2E0f5',
  },
  DAI: {
    1: '0xAed0c38402a5d19df6E4c03F4E2DceD6e29c1ee9',
    42161: '0xc5C8E77B397E531B8EC06BFb0048328B30E9eCfB',
    10: '0x8dBa75e83DA73cc766A7e5a0ee71F656BAa1A5e1',
  },
  WBTC: {
    1: '0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c',
    42161: '0xd0C7101eACbB49F3deCcCc166d238410D6D46d57',
    10: '0xD702DD976Fb76Fffc2D3963D037dfDae5b04E593',
  },
  stETH: {
    1: '0xCfE54B5cD566aB89272946F602D76Ea879CAb4a8',
  },
  rETH: {
    1: '0x536218f9E9Eb48863970252233c8F271f554C2d0',
  },
};

export async function getChainlinkPrice(
  client: PublicClient,
  symbol: string,
  chainId: ChainId
): Promise<number | null> {
  const normalizedSymbol = symbol.toUpperCase();
  const feedAddress = CHAINLINK_FEEDS[normalizedSymbol]?.[chainId];

  if (!feedAddress) {
    return null;
  }

  try {
    const [roundData, decimals] = await Promise.all([
      client.readContract({
        address: feedAddress,
        abi: CHAINLINK_AGGREGATOR_ABI,
        functionName: 'latestRoundData',
      }),
      client.readContract({
        address: feedAddress,
        abi: CHAINLINK_AGGREGATOR_ABI,
        functionName: 'decimals',
      }),
    ]);

    const price = Number(roundData[1]) / Math.pow(10, decimals);
    return price;
  } catch (error) {
    console.error(`Error fetching Chainlink price for ${symbol}:`, error);
    return null;
  }
}

export function hasChainlinkFeed(symbol: string, chainId: ChainId): boolean {
  const normalizedSymbol = symbol.toUpperCase();
  return !!CHAINLINK_FEEDS[normalizedSymbol]?.[chainId];
}
