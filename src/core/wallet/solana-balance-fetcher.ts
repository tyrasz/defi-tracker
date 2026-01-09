import { chainRegistry } from '@/chains';
import { getSolanaTokens, type SolanaTokenInfo } from '@/core/tokens';
import { coinGeckoPriceFetcher } from '@/core/pricing/coingecko';

export interface SolanaTokenBalance {
  address: string;
  symbol: string;
  decimals: number;
  balance: bigint;
  balanceFormatted: string;
  priceUsd: number;
  valueUsd: number;
}

export interface SolanaWalletBalance {
  chainId: 'solana';
  chainName: string;
  balances: SolanaTokenBalance[];
  totalValueUsd: number;
}

export interface SolanaBalances {
  address: string;
  balances: SolanaWalletBalance;
  totalValueUsd: number;
  fetchedAt: number;
}

class SolanaBalanceFetcher {
  /**
   * Fetches SOL and SPL token balances for a Solana address
   */
  async getBalances(address: string): Promise<SolanaBalances> {
    const rpcUrl = chainRegistry.getSolanaRpcUrl();
    const balances: SolanaTokenBalance[] = [];

    try {
      // Fetch native SOL balance
      const solBalance = await this.getSolBalance(rpcUrl, address);
      if (solBalance && solBalance.balance > 0n) {
        balances.push(solBalance);
      }

      // Fetch SPL token balances
      const tokenBalances = await this.getSplTokenBalances(rpcUrl, address);
      balances.push(...tokenBalances.filter((b) => b.balance > 0n));
    } catch (error) {
      console.error('Error fetching Solana balances:', error);
    }

    const totalValueUsd = balances.reduce((sum, b) => sum + b.valueUsd, 0);

    return {
      address,
      balances: {
        chainId: 'solana',
        chainName: 'Solana',
        balances,
        totalValueUsd,
      },
      totalValueUsd,
      fetchedAt: Date.now(),
    };
  }

  /**
   * Fetches native SOL balance
   */
  private async getSolBalance(
    rpcUrl: string,
    address: string
  ): Promise<SolanaTokenBalance | null> {
    try {
      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getBalance',
          params: [address],
        }),
      });

      const data = await response.json();
      if (data.error) {
        console.error('Solana RPC error:', data.error);
        return null;
      }

      const lamports = BigInt(data.result.value);
      if (lamports === 0n) {
        return null;
      }

      const decimals = 9;
      const balanceFormatted = (Number(lamports) / 10 ** decimals).toString();

      // Get SOL price from CoinGecko
      const priceUsd = await coinGeckoPriceFetcher.getNativeTokenPrice('SOL') ?? 0;

      return {
        address: 'So11111111111111111111111111111111111111112',
        symbol: 'SOL',
        decimals,
        balance: lamports,
        balanceFormatted,
        priceUsd,
        valueUsd: parseFloat(balanceFormatted) * priceUsd,
      };
    } catch (error) {
      console.error('Error fetching SOL balance:', error);
      return null;
    }
  }

  /**
   * Fetches SPL token balances using getTokenAccountsByOwner
   */
  private async getSplTokenBalances(
    rpcUrl: string,
    address: string
  ): Promise<SolanaTokenBalance[]> {
    const balances: SolanaTokenBalance[] = [];
    const knownTokens = getSolanaTokens();
    const tokenMap = new Map(knownTokens.map((t) => [t.address, t]));

    try {
      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getTokenAccountsByOwner',
          params: [
            address,
            { programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' },
            { encoding: 'jsonParsed' },
          ],
        }),
      });

      const data = await response.json();
      if (data.error) {
        console.error('Solana RPC error:', data.error);
        return balances;
      }

      const accounts = data.result?.value || [];

      for (const account of accounts) {
        const parsedInfo = account.account?.data?.parsed?.info;
        if (!parsedInfo) continue;

        const mint = parsedInfo.mint;
        const tokenAmount = parsedInfo.tokenAmount;
        const amount = BigInt(tokenAmount.amount);

        if (amount === 0n) continue;

        const tokenInfo = tokenMap.get(mint);
        if (!tokenInfo) continue; // Skip unknown tokens

        const balanceFormatted = tokenAmount.uiAmountString || '0';

        // Get price from CoinGecko using coingeckoId if available
        let priceUsd = 0;
        if (tokenInfo.coingeckoId) {
          priceUsd = await coinGeckoPriceFetcher.getPriceById(tokenInfo.coingeckoId) ?? 0;
        }

        balances.push({
          address: mint,
          symbol: tokenInfo.symbol,
          decimals: tokenInfo.decimals,
          balance: amount,
          balanceFormatted,
          priceUsd,
          valueUsd: parseFloat(balanceFormatted) * priceUsd,
        });
      }
    } catch (error) {
      console.error('Error fetching SPL token balances:', error);
    }

    return balances.sort((a, b) => b.valueUsd - a.valueUsd);
  }
}

export const solanaBalanceFetcher = new SolanaBalanceFetcher();
