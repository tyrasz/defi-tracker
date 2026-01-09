import type { Address, PublicClient } from 'viem';
import type { EvmChainId } from '@/types/chain';

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

// Chainlink price feed addresses for common tokens across all EVM chains
const CHAINLINK_FEEDS: Record<string, Partial<Record<EvmChainId, Address>>> = {
  ETH: {
    1: '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419',
    42161: '0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612',
    10: '0x13e3Ee699D1909E989722E753853AE30b17e08c5',
    8453: '0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70',
    137: '0xF9680D99D6C9589e2a93a78A04A279e509205945', // Polygon ETH/USD
    43114: '0x976B3D034E162d8bD72D6b9C989d545b839003b0', // Avalanche ETH/USD
    56: '0x9ef1B8c0E4F7dc8bF5719Ea496883DC6401d5b2e', // BSC ETH/USD
  },
  WETH: {
    1: '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419',
    42161: '0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612',
    10: '0x13e3Ee699D1909E989722E753853AE30b17e08c5',
    8453: '0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70',
    137: '0xF9680D99D6C9589e2a93a78A04A279e509205945',
    43114: '0x976B3D034E162d8bD72D6b9C989d545b839003b0',
    56: '0x9ef1B8c0E4F7dc8bF5719Ea496883DC6401d5b2e',
  },
  USDC: {
    1: '0x8fFfFfd4AfB6115b954Bd326cbe7B4BA576818f6',
    42161: '0x50834F3163758fcC1Df9973b6e91f0F0F0434aD3',
    10: '0x16a9FA2FDa030272Ce99B29CF780dFA30361E0f3',
    8453: '0x7e860098F58bBFC8648a4311b374B1D669a2bc6B',
    137: '0xfE4A8cc5b5B2366C1B58Bea3858e81843581b2F7',
    43114: '0xF096872672F44d6EBA71458D74fe67F9a77a23B9',
    56: '0x51597f405303C4377E36123cBc172b13269EA163',
  },
  USDT: {
    1: '0x3E7d1eAB13ad0104d2750B8863b489D65364e32D',
    42161: '0x3f3f5dF88dC9F13eac63DF89EC16ef6e7E25DdE7',
    10: '0xECef79E109e997bCA29c1c0897ec9d7678E2E0f5',
    137: '0x0A6513e40db6EB1b165753AD52E80663aeA50545',
    43114: '0xEBE676ee90Fe1112671f19b6B7459bC678B67e8a',
    56: '0xB97Ad0E74fa7d920791E90258A6E2085088b4320',
  },
  DAI: {
    1: '0xAed0c38402a5d19df6E4c03F4E2DceD6e29c1ee9',
    42161: '0xc5C8E77B397E531B8EC06BFb0048328B30E9eCfB',
    10: '0x8dBa75e83DA73cc766A7e5a0ee71F656BAa1A5e1',
    137: '0x4746DeC9e833A82EC7C2C1356372CcF2cfcD2F3D',
    43114: '0x51D7180edA2260cc4F6e4EebB82FEF5c3c2B8300',
    56: '0x132d3C0B1D2cEa0BC552588063bdBb210FdeecfA',
  },
  WBTC: {
    1: '0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c',
    42161: '0xd0C7101eACbB49F3deCcCc166d238410D6D46d57',
    10: '0xD702DD976Fb76Fffc2D3963D037dfDae5b04E593',
    137: '0xDE31F8bFBD8c84b5360CFACCa3539B938dd78ae6',
    43114: '0x2779D32d5166BAaa2B2b658333bA7e6Ec0C65743',
    56: '0x264990fbd0A4796A3E3d8E37C4d5F87a3aCa5Ebf',
  },
  stETH: {
    1: '0xCfE54B5cD566aB89272946F602D76Ea879CAb4a8',
  },
  rETH: {
    1: '0x536218f9E9Eb48863970252233c8F271f554C2d0',
  },
  // Native tokens for new chains
  MATIC: {
    1: '0x7bAC85A8a13A4BcD8abb3eB7d6b4d632c5a57676', // MATIC/USD on Ethereum
    137: '0xAB594600376Ec9fD91F8e885dADF0CE036862dE0', // MATIC/USD on Polygon
  },
  AVAX: {
    43114: '0x0A77230d17318075983913bC2145DB16C7366156', // AVAX/USD on Avalanche
  },
  BNB: {
    56: '0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE', // BNB/USD on BSC
    1: '0x14e613AC84a31f709eadbdF89C6CC390fDc9540A', // BNB/USD on Ethereum
  },
  LINK: {
    1: '0x2c1d072e956AFFC0D435Cb7AC38EF18d24d9127c',
    42161: '0x86E53CF1B870786351Da77A57575e79CB55812CB',
    10: '0xCc232dcFAAE6354cE191Bd574108c1aD03f86FeD',
    137: '0xd9FFdb71EbE7496cC440152d43986Aae0AB76665',
    43114: '0x49ccd9ca821EfEab2b98c60dC60F518E765EDa9a',
    56: '0xca236E327F629f9Fc2c30A4E95775EbF0B89fac8',
  },
  AAVE: {
    1: '0x547a514d5e3769680Ce22B2361c10Ea13619e8a9',
    137: '0x72484B12719E23115761D5DA1646945632979bB6',
  },
};

export async function getChainlinkPrice(
  client: PublicClient,
  symbol: string,
  chainId: EvmChainId
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

export function hasChainlinkFeed(symbol: string, chainId: EvmChainId): boolean {
  const normalizedSymbol = symbol.toUpperCase();
  return !!CHAINLINK_FEEDS[normalizedSymbol]?.[chainId];
}
