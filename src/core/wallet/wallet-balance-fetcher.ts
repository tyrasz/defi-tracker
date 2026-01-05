import type { Address, PublicClient } from 'viem';
import { formatUnits } from 'viem';
import type { ChainId } from '@/types/chain';
import type { TokenBalance } from '@/types/token';
import { chainRegistry } from '@/chains';
import { priceFetcher } from '@/core/pricing';

// ERC20 balanceOf ABI
const erc20BalanceOfAbi = [
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// Token metadata for our tracked tokens
interface TrackedToken {
  symbol: string;
  decimals: number;
  contractKey: 'usdc' | 'usdt' | 'dai' | 'usds' | 'usde';
}

const TRACKED_TOKENS: TrackedToken[] = [
  { symbol: 'USDC', decimals: 6, contractKey: 'usdc' },
  { symbol: 'USDT', decimals: 6, contractKey: 'usdt' },
  { symbol: 'DAI', decimals: 18, contractKey: 'dai' },
  { symbol: 'USDS', decimals: 18, contractKey: 'usds' },
  { symbol: 'USDe', decimals: 18, contractKey: 'usde' },
];

export interface WalletBalance {
  chainId: ChainId;
  chainName: string;
  balances: TokenBalance[];
  totalValueUsd: number;
}

export interface WalletBalances {
  address: Address;
  balances: WalletBalance[];
  totalValueUsd: number;
  fetchedAt: number;
}

class WalletBalanceFetcher {
  /**
   * Fetches ETH and stablecoin balances across all supported chains
   */
  async getBalances(address: Address): Promise<WalletBalances> {
    const chainIds = chainRegistry.getSupportedChainIds();
    const balanceResults: WalletBalance[] = [];

    // Fetch balances from all chains in parallel
    const chainPromises = chainIds.map((chainId) =>
      this.getChainBalances(address, chainId)
    );

    const results = await Promise.allSettled(chainPromises);

    for (const result of results) {
      if (result.status === 'fulfilled' && result.value.balances.length > 0) {
        balanceResults.push(result.value);
      }
    }

    const totalValueUsd = balanceResults.reduce(
      (sum, chain) => sum + chain.totalValueUsd,
      0
    );

    return {
      address,
      balances: balanceResults,
      totalValueUsd,
      fetchedAt: Date.now(),
    };
  }

  /**
   * Fetches balances for a single chain with automatic failover
   */
  private async getChainBalances(
    address: Address,
    chainId: ChainId
  ): Promise<WalletBalance> {
    const chain = chainRegistry.getChain(chainId)!;
    const balances: TokenBalance[] = [];

    // Fetch ETH balance with failover
    const ethBalance = await chainRegistry.withFailover(
      chainId,
      (client) => this.getEthBalance(client, address, chainId)
    );
    if (ethBalance && ethBalance.balance > 0n) {
      balances.push(ethBalance);
    }

    // Fetch ERC20 token balances with failover
    const tokenBalances = await chainRegistry.withFailover(
      chainId,
      (client) => this.getTokenBalances(client, address, chainId)
    );
    balances.push(...tokenBalances.filter((b) => b.balance > 0n));

    const totalValueUsd = balances.reduce((sum, b) => sum + b.valueUsd, 0);

    return {
      chainId,
      chainName: chain.name,
      balances,
      totalValueUsd,
    };
  }

  /**
   * Fetches native ETH balance
   */
  private async getEthBalance(
    client: PublicClient,
    address: Address,
    chainId: ChainId
  ): Promise<TokenBalance | null> {
    try {
      const balance = await client.getBalance({ address });

      if (balance === 0n) {
        return null;
      }

      const balanceFormatted = formatUnits(balance, 18);
      const priceData = await priceFetcher.getPrice(
        client,
        '0x0000000000000000000000000000000000000000' as Address,
        'ETH',
        chainId
      );

      return {
        address: '0x0000000000000000000000000000000000000000' as Address,
        symbol: 'ETH',
        decimals: 18,
        balance,
        balanceFormatted,
        priceUsd: priceData.priceUsd,
        valueUsd: parseFloat(balanceFormatted) * priceData.priceUsd,
      };
    } catch (error) {
      console.error(`Error fetching ETH balance on chain ${chainId}:`, error);
      return null;
    }
  }

  /**
   * Fetches ERC20 token balances using multicall
   */
  private async getTokenBalances(
    client: PublicClient,
    address: Address,
    chainId: ChainId
  ): Promise<TokenBalance[]> {
    const chain = chainRegistry.getChain(chainId)!;
    const balances: TokenBalance[] = [];

    // Build multicall for all available tokens on this chain
    const calls: {
      token: TrackedToken;
      tokenAddress: Address;
    }[] = [];

    for (const token of TRACKED_TOKENS) {
      const tokenAddress = chain.contracts[token.contractKey];
      if (tokenAddress) {
        calls.push({ token, tokenAddress });
      }
    }

    if (calls.length === 0) {
      return balances;
    }

    try {
      // Use multicall to fetch all balances at once
      const results = await client.multicall({
        contracts: calls.map(({ tokenAddress }) => ({
          address: tokenAddress,
          abi: erc20BalanceOfAbi,
          functionName: 'balanceOf',
          args: [address],
        })),
      });

      // Process results and fetch prices
      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const { token, tokenAddress } = calls[i];

        if (result.status === 'success') {
          const balance = result.result as bigint;

          if (balance > 0n) {
            const balanceFormatted = formatUnits(balance, token.decimals);
            const priceData = await priceFetcher.getPrice(
              client,
              tokenAddress,
              token.symbol,
              chainId
            );

            balances.push({
              address: tokenAddress,
              symbol: token.symbol,
              decimals: token.decimals,
              balance,
              balanceFormatted,
              priceUsd: priceData.priceUsd,
              valueUsd: parseFloat(balanceFormatted) * priceData.priceUsd,
            });
          }
        }
      }
    } catch (error) {
      console.error(
        `Error fetching token balances on chain ${chainId}:`,
        error
      );
    }

    return balances;
  }
}

export const walletBalanceFetcher = new WalletBalanceFetcher();
