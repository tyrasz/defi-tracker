import { formatUnits, type Address, type PublicClient } from 'viem';
import { chainService, type EvmChainId } from './chains';
import { pricingService } from './pricing';
import { cache, CACHE_TTL } from '../cache/memory-cache';

// ERC20 ABI for balanceOf
const erc20Abi = [
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// Token lists per chain (major tokens only for speed)
interface TokenInfo {
  address: Address;
  symbol: string;
  decimals: number;
  coingeckoId?: string;
}

const TOKEN_LISTS: Record<EvmChainId, TokenInfo[]> = {
  1: [
    { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', symbol: 'USDC', decimals: 6, coingeckoId: 'usd-coin' },
    { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', symbol: 'USDT', decimals: 6, coingeckoId: 'tether' },
    { address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', symbol: 'DAI', decimals: 18, coingeckoId: 'dai' },
    { address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', symbol: 'WETH', decimals: 18, coingeckoId: 'weth' },
    { address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', symbol: 'WBTC', decimals: 8, coingeckoId: 'wrapped-bitcoin' },
    { address: '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84', symbol: 'stETH', decimals: 18, coingeckoId: 'staked-ether' },
  ],
  42161: [
    { address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', symbol: 'USDC', decimals: 6, coingeckoId: 'usd-coin' },
    { address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', symbol: 'USDT', decimals: 6, coingeckoId: 'tether' },
    { address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', symbol: 'WETH', decimals: 18, coingeckoId: 'weth' },
    { address: '0x912CE59144191C1204E64559FE8253a0e49E6548', symbol: 'ARB', decimals: 18, coingeckoId: 'arbitrum' },
  ],
  10: [
    { address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', symbol: 'USDC', decimals: 6, coingeckoId: 'usd-coin' },
    { address: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58', symbol: 'USDT', decimals: 6, coingeckoId: 'tether' },
    { address: '0x4200000000000000000000000000000000000006', symbol: 'WETH', decimals: 18, coingeckoId: 'weth' },
    { address: '0x4200000000000000000000000000000000000042', symbol: 'OP', decimals: 18, coingeckoId: 'optimism' },
  ],
  8453: [
    { address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', symbol: 'USDC', decimals: 6, coingeckoId: 'usd-coin' },
    { address: '0x4200000000000000000000000000000000000006', symbol: 'WETH', decimals: 18, coingeckoId: 'weth' },
  ],
  137: [
    { address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', symbol: 'USDC', decimals: 6, coingeckoId: 'usd-coin' },
    { address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', symbol: 'USDT', decimals: 6, coingeckoId: 'tether' },
    { address: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', symbol: 'WMATIC', decimals: 18, coingeckoId: 'wmatic' },
  ],
  43114: [
    { address: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E', symbol: 'USDC', decimals: 6, coingeckoId: 'usd-coin' },
    { address: '0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7', symbol: 'USDT', decimals: 6, coingeckoId: 'tether' },
    { address: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7', symbol: 'WAVAX', decimals: 18, coingeckoId: 'wrapped-avax' },
  ],
  56: [
    { address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', symbol: 'USDC', decimals: 18, coingeckoId: 'usd-coin' },
    { address: '0x55d398326f99059fF775485246999027B3197955', symbol: 'USDT', decimals: 18, coingeckoId: 'tether' },
    { address: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', symbol: 'WBNB', decimals: 18, coingeckoId: 'wbnb' },
  ],
};

export interface TokenBalance {
  address: string;
  symbol: string;
  decimals: number;
  balance: string;
  balanceFormatted: string;
  priceUsd: number;
  valueUsd: number;
}

export interface ChainBalance {
  chainId: EvmChainId;
  chainName: string;
  balances: TokenBalance[];
  totalValueUsd: number;
}

export interface WalletBalances {
  address: string;
  balances: ChainBalance[];
  totalValueUsd: number;
  fetchedAt: number;
}

class BalanceService {
  async getBalances(address: Address, chainIds?: EvmChainId[]): Promise<WalletBalances> {
    const cacheKey = `balances:${address}:${chainIds?.join(',') || 'all'}`;
    const cached = cache.get<WalletBalances>(cacheKey);
    if (cached) return cached;

    const chains = chainIds || chainService.getAllChainIds();
    const balancePromises = chains.map((chainId) =>
      this.getChainBalances(address, chainId).catch((error) => {
        console.error(`Error fetching balances for chain ${chainId}:`, error);
        return null;
      })
    );

    const results = await Promise.all(balancePromises);
    const balances = results.filter((b): b is ChainBalance => b !== null && b.balances.length > 0);
    const totalValueUsd = balances.reduce((sum, b) => sum + b.totalValueUsd, 0);

    const walletBalances: WalletBalances = {
      address,
      balances,
      totalValueUsd,
      fetchedAt: Date.now(),
    };

    cache.set(cacheKey, walletBalances, CACHE_TTL.BALANCE);
    return walletBalances;
  }

  private async getChainBalances(address: Address, chainId: EvmChainId): Promise<ChainBalance> {
    const config = chainService.getConfig(chainId);
    const balances: TokenBalance[] = [];

    // Get native balance
    const nativeBalance = await this.getNativeBalance(address, chainId);
    if (nativeBalance && parseFloat(nativeBalance.balanceFormatted) > 0) {
      balances.push(nativeBalance);
    }

    // Get token balances
    const tokenBalances = await this.getTokenBalances(address, chainId);
    balances.push(...tokenBalances.filter((b) => parseFloat(b.balanceFormatted) > 0));

    const totalValueUsd = balances.reduce((sum, b) => sum + b.valueUsd, 0);

    return {
      chainId,
      chainName: config.name,
      balances: balances.sort((a, b) => b.valueUsd - a.valueUsd),
      totalValueUsd,
    };
  }

  private async getNativeBalance(address: Address, chainId: EvmChainId): Promise<TokenBalance | null> {
    try {
      const client = chainService.getClient(chainId);
      const config = chainService.getConfig(chainId);
      const balance = await client.getBalance({ address });

      if (balance === 0n) return null;

      const balanceFormatted = formatUnits(balance, 18);
      const priceUsd = await pricingService.getNativeTokenPrice(config.nativeSymbol) || 0;

      return {
        address: '0x0000000000000000000000000000000000000000',
        symbol: config.nativeSymbol,
        decimals: 18,
        balance: balance.toString(),
        balanceFormatted,
        priceUsd,
        valueUsd: parseFloat(balanceFormatted) * priceUsd,
      };
    } catch (error) {
      console.error(`Error fetching native balance on ${chainId}:`, error);
      return null;
    }
  }

  private async getTokenBalances(address: Address, chainId: EvmChainId): Promise<TokenBalance[]> {
    const tokens = TOKEN_LISTS[chainId] || [];
    if (tokens.length === 0) return [];

    const balances: TokenBalance[] = [];

    try {
      const client = chainService.getClient(chainId);

      // Batch fetch balances using multicall
      const results = await client.multicall({
        contracts: tokens.map((token) => ({
          address: token.address,
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [address],
        })),
      });

      // Process results
      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const token = tokens[i];

        if (result.status === 'success') {
          const balance = result.result as bigint;
          if (balance > 0n) {
            const balanceFormatted = formatUnits(balance, token.decimals);

            // Get price
            let priceUsd = 0;
            if (pricingService.isStablecoin(token.symbol)) {
              priceUsd = pricingService.getStablecoinPrice(token.symbol);
            } else if (token.coingeckoId) {
              priceUsd = await pricingService.getPriceById(token.coingeckoId) || 0;
            }

            balances.push({
              address: token.address,
              symbol: token.symbol,
              decimals: token.decimals,
              balance: balance.toString(),
              balanceFormatted,
              priceUsd,
              valueUsd: parseFloat(balanceFormatted) * priceUsd,
            });
          }
        }
      }
    } catch (error) {
      console.error(`Error fetching token balances on ${chainId}:`, error);
    }

    return balances;
  }
}

export const balanceService = new BalanceService();
