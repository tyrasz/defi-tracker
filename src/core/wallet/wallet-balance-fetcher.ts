import type { Address, PublicClient } from 'viem';
import { formatUnits } from 'viem';
import type { ChainId, EvmChainId } from '@/types/chain';
import type { TokenBalance } from '@/types/token';
import { chainRegistry } from '@/chains';
import { priceFetcher } from '@/core/pricing';
import { getTokensForChain, getSolanaTokens, type TokenInfo, type SolanaTokenInfo } from '@/core/tokens';

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
   * Fetches ETH and stablecoin balances across all supported EVM chains
   */
  async getBalances(address: Address): Promise<WalletBalances> {
    const chainIds = chainRegistry.getEvmChainIds();
    const balanceResults: WalletBalance[] = [];

    // Fetch balances from all EVM chains in parallel
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
   * Fetches balances for a single EVM chain with automatic failover
   */
  private async getChainBalances(
    address: Address,
    chainId: EvmChainId
  ): Promise<WalletBalance> {
    const chain = chainRegistry.getEvmChain(chainId)!;
    const balances: TokenBalance[] = [];

    // Fetch native token balance with failover
    const nativeBalance = await chainRegistry.withFailover(
      chainId,
      (client) => this.getNativeBalance(client, address, chainId)
    );
    if (nativeBalance && nativeBalance.balance > 0n) {
      balances.push(nativeBalance);
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
   * Fetches native token balance (ETH, MATIC, AVAX, BNB, etc.)
   */
  private async getNativeBalance(
    client: PublicClient,
    address: Address,
    chainId: EvmChainId
  ): Promise<TokenBalance | null> {
    try {
      const balance = await client.getBalance({ address });

      if (balance === 0n) {
        return null;
      }

      const chain = chainRegistry.getEvmChain(chainId)!;
      const nativeCurrency = chain.nativeCurrency;
      const balanceFormatted = formatUnits(balance, nativeCurrency.decimals);

      // Get the symbol to use for price lookup
      const priceSymbol = this.getNativePriceSymbol(chainId);
      const priceData = await priceFetcher.getPrice(
        client,
        '0x0000000000000000000000000000000000000000' as Address,
        priceSymbol,
        chainId
      );

      return {
        address: '0x0000000000000000000000000000000000000000' as Address,
        symbol: nativeCurrency.symbol,
        decimals: nativeCurrency.decimals,
        balance,
        balanceFormatted,
        priceUsd: priceData.priceUsd,
        valueUsd: parseFloat(balanceFormatted) * priceData.priceUsd,
      };
    } catch (error) {
      console.error(`Error fetching native balance on chain ${chainId}:`, error);
      return null;
    }
  }

  /**
   * Maps chain ID to the native token symbol used for price lookup
   */
  private getNativePriceSymbol(chainId: EvmChainId): string {
    switch (chainId) {
      case 137:
        return 'MATIC';
      case 43114:
        return 'AVAX';
      case 56:
        return 'BNB';
      default:
        return 'ETH';
    }
  }

  /**
   * Fetches ERC20 token balances using multicall
   */
  private async getTokenBalances(
    client: PublicClient,
    address: Address,
    chainId: EvmChainId
  ): Promise<TokenBalance[]> {
    const balances: TokenBalance[] = [];
    const tokens = getTokensForChain(chainId);

    if (tokens.length === 0) {
      return balances;
    }

    try {
      // Use multicall to fetch all balances at once (batch in chunks of 50 to avoid RPC limits)
      const BATCH_SIZE = 50;
      const tokenBatches: TokenInfo[][] = [];

      for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
        tokenBatches.push(tokens.slice(i, i + BATCH_SIZE));
      }

      const allResults: { token: TokenInfo; balance: bigint }[] = [];

      for (const batch of tokenBatches) {
        const results = await client.multicall({
          contracts: batch.map((token) => ({
            address: token.address,
            abi: erc20BalanceOfAbi,
            functionName: 'balanceOf',
            args: [address],
          })),
        });

        for (let i = 0; i < results.length; i++) {
          const result = results[i];
          if (result.status === 'success') {
            const balance = result.result as bigint;
            if (balance > 0n) {
              allResults.push({ token: batch[i], balance });
            }
          }
        }
      }

      // Fetch prices for tokens with balances (in parallel)
      const pricePromises = allResults.map(async ({ token, balance }) => {
        const balanceFormatted = formatUnits(balance, token.decimals);
        const priceData = await priceFetcher.getPrice(
          client,
          token.address,
          token.symbol,
          chainId
        );

        return {
          address: token.address,
          symbol: token.symbol,
          decimals: token.decimals,
          balance,
          balanceFormatted,
          priceUsd: priceData.priceUsd,
          valueUsd: parseFloat(balanceFormatted) * priceData.priceUsd,
        } as TokenBalance;
      });

      const tokenBalances = await Promise.all(pricePromises);
      balances.push(...tokenBalances);
    } catch (error) {
      console.error(
        `Error fetching token balances on chain ${chainId}:`,
        error
      );
    }

    // Sort by value descending
    return balances.sort((a, b) => b.valueUsd - a.valueUsd);
  }
}

export const walletBalanceFetcher = new WalletBalanceFetcher();
