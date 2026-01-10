import { createPublicClient, http, type Address } from 'viem';
import { mainnet, arbitrum, optimism, base, polygon, avalanche, bsc } from 'viem/chains';
import { cache, CACHE_TTL } from '../cache/memory-cache';
import type { EvmChainId } from './chains';

// ============================================
// CHAINLINK PRICE FEEDS (On-chain, most reliable)
// ============================================

const CHAINLINK_ABI = [
  {
    inputs: [],
    name: 'latestRoundData',
    outputs: [
      { name: 'roundId', type: 'uint80' },
      { name: 'answer', type: 'int256' },
      { name: 'startedAt', type: 'uint256' },
      { name: 'updatedAt', type: 'uint256' },
      { name: 'answeredInRound', type: 'uint80' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// Chainlink price feed addresses per chain
const CHAINLINK_FEEDS: Record<EvmChainId, Record<string, Address>> = {
  1: { // Ethereum
    ETH: '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419',
    BTC: '0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c',
    LINK: '0x2c1d072e956AFFC0D435Cb7AC38EF18d24d9127c',
    AAVE: '0x547a514d5e3769680Ce22B2361c10Ea13619e8a9',
    UNI: '0x553303d460EE0afB37EdFf9bE42922D8FF63220e',
    MATIC: '0x7bAC85A8a13A4BcD8abb3eB7d6b4d632c5a57676',
  },
  42161: { // Arbitrum
    ETH: '0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612',
    BTC: '0x6ce185860a4963106506C203335A2910bc2e3d43',
    LINK: '0x86E53CF1B870786351Da77A57575e79CB55812CB',
    ARB: '0xb2A824043730FE05F3DA2efaFa1CBbe83fa548D6',
  },
  10: { // Optimism
    ETH: '0x13e3Ee699D1909E989722E753853AE30b17e08c5',
    BTC: '0xD702DD976Fb76Fffc2D3963D037dfDae5b04E593',
    LINK: '0xCc232dcFAAE6354cE191Bd574108c1aD03f86ceE',
    OP: '0x0D276FC14719f9292D5C1eA2198673d1f4269246',
  },
  8453: { // Base
    ETH: '0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70',
  },
  137: { // Polygon
    ETH: '0xF9680D99D6C9589e2a93a78A04A279e509205945',
    BTC: '0xc907E116054Ad103354f2D350FD2514433D57F6f',
    MATIC: '0xAB594600376Ec9fD91F8e885dADF0CE036862dE0',
    LINK: '0xd9FFdb71EbE7496cC440152d43986Aae0AB76665',
  },
  43114: { // Avalanche
    ETH: '0x976B3D034E162d8bD72D6b9C989d545b839003b0',
    BTC: '0x2779D32d5166BAaa2B2b658333bA7e6Ec0C65743',
    AVAX: '0x0A77230d17318075983913bC2145DB16C7366156',
    LINK: '0x49ccd9ca821EfEab2b98c60dC60F518E765EDa9a',
  },
  56: { // BSC
    ETH: '0x9ef1B8c0E4F7dc8bF5719Ea496883DC6401d5b2e',
    BTC: '0x264990fbd0A4796A3E3d8E37C4d5F87a3aCa5Ebf',
    BNB: '0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE',
    LINK: '0xca236E327F629f9Fc2c30A4E95775EbF0B89fac8',
  },
};

// Map symbols to Chainlink feed keys
const SYMBOL_TO_FEED: Record<string, string> = {
  ETH: 'ETH', WETH: 'ETH',
  BTC: 'BTC', WBTC: 'BTC', BTCB: 'BTC',
  LINK: 'LINK', 'LINK.E': 'LINK',
  AAVE: 'AAVE', 'AAVE.E': 'AAVE',
  UNI: 'UNI',
  MATIC: 'MATIC', WMATIC: 'MATIC',
  ARB: 'ARB',
  OP: 'OP',
  AVAX: 'AVAX', WAVAX: 'AVAX',
  BNB: 'BNB', WBNB: 'BNB',
};

// Create clients for each chain
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const clients: Record<EvmChainId, any> = {
  1: createPublicClient({ chain: mainnet, transport: http('https://eth.llamarpc.com') }),
  42161: createPublicClient({ chain: arbitrum, transport: http('https://arb1.arbitrum.io/rpc') }),
  10: createPublicClient({ chain: optimism, transport: http('https://mainnet.optimism.io') }),
  8453: createPublicClient({ chain: base, transport: http('https://mainnet.base.org') }),
  137: createPublicClient({ chain: polygon, transport: http('https://polygon-rpc.com') }),
  43114: createPublicClient({ chain: avalanche, transport: http('https://api.avax.network/ext/bc/C/rpc') }),
  56: createPublicClient({ chain: bsc, transport: http('https://bsc-dataseed.binance.org') }),
};

// ============================================
// DEFILLAMA API (Free, good coverage)
// ============================================

const DEFILLAMA_API = 'https://coins.llama.fi';

// Map symbols to DefiLlama token identifiers
const DEFILLAMA_IDS: Record<string, string> = {
  ETH: 'coingecko:ethereum',
  WETH: 'coingecko:weth',
  BTC: 'coingecko:bitcoin',
  WBTC: 'coingecko:wrapped-bitcoin',
  LINK: 'coingecko:chainlink',
  AAVE: 'coingecko:aave',
  UNI: 'coingecko:uniswap',
  ARB: 'coingecko:arbitrum',
  OP: 'coingecko:optimism',
  MATIC: 'coingecko:matic-network',
  AVAX: 'coingecko:avalanche-2',
  BNB: 'coingecko:binancecoin',
  SOL: 'coingecko:solana',
  MSOL: 'coingecko:msol',
  JITOSOL: 'coingecko:jito-staked-sol',
  JUP: 'coingecko:jupiter-exchange-solana',
  BONK: 'coingecko:bonk',
  PYTH: 'coingecko:pyth-network',
  ORCA: 'coingecko:orca',
  STETH: 'coingecko:staked-ether',
  WSTETH: 'coingecko:wrapped-steth',
  RETH: 'coingecko:rocket-pool-eth',
  CBETH: 'coingecko:coinbase-wrapped-staked-eth',
  CRV: 'coingecko:curve-dao-token',
  MKR: 'coingecko:maker',
  LDO: 'coingecko:lido-dao',
  SNX: 'coingecko:havven',
  COMP: 'coingecko:compound-governance-token',
  SUSHI: 'coingecko:sushi',
  YFI: 'coingecko:yearn-finance',
  '1INCH': 'coingecko:1inch',
  BAL: 'coingecko:balancer',
  GMX: 'coingecko:gmx',
  PENDLE: 'coingecko:pendle',
  STG: 'coingecko:stargate-finance',
};

// ============================================
// COINGECKO API (Backup)
// ============================================

const COINGECKO_API = 'https://api.coingecko.com/api/v3';

const COINGECKO_IDS: Record<string, string> = {
  ETH: 'ethereum',
  WETH: 'weth',
  STETH: 'staked-ether',
  WSTETH: 'wrapped-steth',
  RETH: 'rocket-pool-eth',
  CBETH: 'coinbase-wrapped-staked-eth',
  BTC: 'bitcoin',
  WBTC: 'wrapped-bitcoin',
  LINK: 'chainlink',
  AAVE: 'aave',
  UNI: 'uniswap',
  ARB: 'arbitrum',
  OP: 'optimism',
  MATIC: 'matic-network',
  AVAX: 'avalanche-2',
  BNB: 'binancecoin',
  SOL: 'solana',
  MSOL: 'msol',
  JITOSOL: 'jito-staked-sol',
  JUP: 'jupiter-exchange-solana',
  BONK: 'bonk',
  PYTH: 'pyth-network',
  ORCA: 'orca',
};

// Rate limiter for external APIs
class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly maxTokens: number;
  private readonly refillRate: number;

  constructor(maxTokens = 10, refillRate = 0.5) {
    this.tokens = maxTokens;
    this.lastRefill = Date.now();
    this.maxTokens = maxTokens;
    this.refillRate = refillRate;
  }

  async acquire(): Promise<void> {
    this.refill();
    if (this.tokens < 1) {
      const waitTime = ((1 - this.tokens) / this.refillRate) * 1000;
      await new Promise((resolve) => setTimeout(resolve, Math.min(waitTime, 2000)));
      this.refill();
    }
    this.tokens -= 1;
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.maxTokens, this.tokens + elapsed * this.refillRate);
    this.lastRefill = now;
  }
}

// ============================================
// PRICING SERVICE
// ============================================

class PricingService {
  private defillamaLimiter = new RateLimiter(30, 1); // DefiLlama is generous
  private coingeckoLimiter = new RateLimiter(10, 0.5); // CoinGecko is strict

  /**
   * Get price using fallback order: Chainlink → DefiLlama → CoinGecko → Stablecoin
   */
  async getPrice(symbol: string, chainId?: EvmChainId): Promise<number | null> {
    const upperSymbol = symbol.toUpperCase();
    const cacheKey = `price:${upperSymbol}`;

    // Check cache first
    const cached = cache.get<number>(cacheKey);
    if (cached !== null) return cached;

    // 1. Stablecoins - hardcoded
    if (this.isStablecoin(upperSymbol)) {
      const price = this.getStablecoinPrice(upperSymbol);
      cache.set(cacheKey, price, CACHE_TTL.PRICE);
      return price;
    }

    // 2. Try Chainlink (on-chain)
    if (chainId) {
      const chainlinkPrice = await this.getChainlinkPrice(upperSymbol, chainId);
      if (chainlinkPrice !== null) {
        cache.set(cacheKey, chainlinkPrice, CACHE_TTL.PRICE);
        console.log(`[Chainlink] ${upperSymbol}: $${chainlinkPrice}`);
        return chainlinkPrice;
      }
    }

    // 3. Try DefiLlama
    const defillamaPrice = await this.getDefiLlamaPrice(upperSymbol);
    if (defillamaPrice !== null) {
      cache.set(cacheKey, defillamaPrice, CACHE_TTL.PRICE);
      console.log(`[DefiLlama] ${upperSymbol}: $${defillamaPrice}`);
      return defillamaPrice;
    }

    // 4. Try CoinGecko (backup)
    const coingeckoPrice = await this.getCoinGeckoPrice(upperSymbol);
    if (coingeckoPrice !== null) {
      cache.set(cacheKey, coingeckoPrice, CACHE_TTL.PRICE);
      console.log(`[CoinGecko] ${upperSymbol}: $${coingeckoPrice}`);
      return coingeckoPrice;
    }

    console.warn(`[Pricing] No price found for ${upperSymbol}`);
    return null;
  }

  /**
   * Get price from Chainlink on-chain oracle
   */
  private async getChainlinkPrice(symbol: string, chainId: EvmChainId): Promise<number | null> {
    const feedKey = SYMBOL_TO_FEED[symbol];
    if (!feedKey) return null;

    const feeds = CHAINLINK_FEEDS[chainId];
    if (!feeds) return null;

    const feedAddress = feeds[feedKey];
    if (!feedAddress) return null;

    const client = clients[chainId];
    if (!client) return null;

    try {
      const [roundData, decimals] = await Promise.all([
        client.readContract({
          address: feedAddress,
          abi: CHAINLINK_ABI,
          functionName: 'latestRoundData',
        }),
        client.readContract({
          address: feedAddress,
          abi: CHAINLINK_ABI,
          functionName: 'decimals',
        }),
      ]);

      const answer = roundData[1];
      const price = Number(answer) / 10 ** decimals;
      return price;
    } catch (error) {
      console.error(`[Chainlink] Error fetching ${symbol} on chain ${chainId}:`, error);
      return null;
    }
  }

  /**
   * Get price from DefiLlama API
   */
  private async getDefiLlamaPrice(symbol: string): Promise<number | null> {
    const tokenId = DEFILLAMA_IDS[symbol];
    if (!tokenId) return null;

    try {
      await this.defillamaLimiter.acquire();

      const response = await fetch(`${DEFILLAMA_API}/prices/current/${tokenId}`, {
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json() as { coins: Record<string, { price: number }> };
      const price = data.coins?.[tokenId]?.price;

      return price ?? null;
    } catch (error) {
      console.error(`[DefiLlama] Error fetching ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Get price from CoinGecko API (backup)
   */
  private async getCoinGeckoPrice(symbol: string): Promise<number | null> {
    const coingeckoId = COINGECKO_IDS[symbol];
    if (!coingeckoId) return null;

    try {
      await this.coingeckoLimiter.acquire();

      const response = await fetch(
        `${COINGECKO_API}/simple/price?ids=${coingeckoId}&vs_currencies=usd`,
        { signal: AbortSignal.timeout(5000) }
      );

      if (!response.ok) {
        if (response.status === 429) {
          console.warn('[CoinGecko] Rate limit hit');
        }
        return null;
      }

      const data = await response.json() as Record<string, { usd?: number }>;
      return data[coingeckoId]?.usd ?? null;
    } catch (error) {
      console.error(`[CoinGecko] Error fetching ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Get prices for multiple symbols (batch)
   */
  async getBatchPrices(symbols: string[], chainId?: EvmChainId): Promise<Record<string, number>> {
    const results: Record<string, number> = {};

    // Process in parallel with concurrency limit
    const chunks = this.chunkArray(symbols, 5);
    for (const chunk of chunks) {
      const promises = chunk.map(async (symbol) => {
        const price = await this.getPrice(symbol, chainId);
        if (price !== null) {
          results[symbol] = price;
        }
      });
      await Promise.all(promises);
    }

    return results;
  }

  /**
   * Get native token price for a chain
   */
  async getNativeTokenPrice(symbol: string, chainId?: EvmChainId): Promise<number | null> {
    return this.getPrice(symbol, chainId);
  }

  /**
   * Check if symbol is a stablecoin
   */
  isStablecoin(symbol: string): boolean {
    const stables = [
      'USDC', 'USDT', 'DAI', 'FRAX', 'LUSD', 'BUSD', 'USDS', 'USDE',
      'TUSD', 'USDP', 'USDC.E', 'USDBC', 'SUSD', 'SUSDE', 'USDY',
      'USDM', 'PYUSD', 'GUSD', 'HUSD', 'UST', 'MIM', 'DOLA',
    ];
    return stables.includes(symbol.toUpperCase());
  }

  /**
   * Get stablecoin price (hardcoded)
   */
  getStablecoinPrice(symbol: string): number {
    const upper = symbol.toUpperCase();
    if (upper === 'EURC' || upper === 'EURS') return 1.08; // EUR stables
    return 1.0;
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}

export const pricingService = new PricingService();
