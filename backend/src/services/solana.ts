import { pricingService } from './pricing';
import { cache, CACHE_TTL } from '../cache/memory-cache';

const SOLANA_RPC = 'https://api.mainnet-beta.solana.com';

interface SolanaTokenInfo {
  address: string;
  symbol: string;
  decimals: number;
  coingeckoId?: string;
}

const SOLANA_TOKENS: SolanaTokenInfo[] = [
  { address: 'So11111111111111111111111111111111111111112', symbol: 'SOL', decimals: 9, coingeckoId: 'solana' },
  { address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', symbol: 'USDC', decimals: 6, coingeckoId: 'usd-coin' },
  { address: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', symbol: 'USDT', decimals: 6, coingeckoId: 'tether' },
  { address: 'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So', symbol: 'mSOL', decimals: 9, coingeckoId: 'msol' },
  { address: 'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn', symbol: 'JitoSOL', decimals: 9, coingeckoId: 'jito-staked-sol' },
  { address: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN', symbol: 'JUP', decimals: 6, coingeckoId: 'jupiter-exchange-solana' },
  { address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', symbol: 'BONK', decimals: 5, coingeckoId: 'bonk' },
  { address: 'HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3', symbol: 'PYTH', decimals: 6, coingeckoId: 'pyth-network' },
  { address: 'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE', symbol: 'ORCA', decimals: 6, coingeckoId: 'orca' },
];

export interface SolanaTokenBalance {
  address: string;
  symbol: string;
  decimals: number;
  balance: string;
  balanceFormatted: string;
  priceUsd: number;
  valueUsd: number;
}

export interface SolanaBalances {
  address: string;
  chainId: 'solana';
  chainName: string;
  balances: SolanaTokenBalance[];
  totalValueUsd: number;
  fetchedAt: number;
}

class SolanaService {
  private tokenMap = new Map(SOLANA_TOKENS.map((t) => [t.address, t]));

  async getBalances(address: string): Promise<SolanaBalances> {
    const cacheKey = `solana:${address}`;
    const cached = cache.get<SolanaBalances>(cacheKey);
    if (cached) return cached;

    const balances: SolanaTokenBalance[] = [];

    try {
      // Get SOL balance
      const solBalance = await this.getSolBalance(address);
      if (solBalance && parseFloat(solBalance.balanceFormatted) > 0) {
        balances.push(solBalance);
      }

      // Get SPL token balances
      const tokenBalances = await this.getSplTokenBalances(address);
      balances.push(...tokenBalances.filter((b) => parseFloat(b.balanceFormatted) > 0));
    } catch (error) {
      console.error('Error fetching Solana balances:', error);
    }

    // Aggregate balances by token mint address (wallets can have multiple token accounts)
    const aggregatedBalances = this.aggregateBalances(balances);

    const totalValueUsd = aggregatedBalances.reduce((sum, b) => sum + b.valueUsd, 0);

    const result: SolanaBalances = {
      address,
      chainId: 'solana',
      chainName: 'Solana',
      balances: aggregatedBalances.sort((a, b) => b.valueUsd - a.valueUsd),
      totalValueUsd,
      fetchedAt: Date.now(),
    };

    cache.set(cacheKey, result, CACHE_TTL.BALANCE);
    return result;
  }

  /**
   * Aggregate multiple token accounts for the same mint into a single balance
   */
  private aggregateBalances(balances: SolanaTokenBalance[]): SolanaTokenBalance[] {
    const aggregated = new Map<string, SolanaTokenBalance>();

    for (const balance of balances) {
      const existing = aggregated.get(balance.address);
      if (existing) {
        // Add to existing balance
        const newBalance = BigInt(existing.balance) + BigInt(balance.balance);
        const newBalanceFormatted = (Number(newBalance) / Math.pow(10, balance.decimals)).toString();
        existing.balance = newBalance.toString();
        existing.balanceFormatted = newBalanceFormatted;
        existing.valueUsd = parseFloat(newBalanceFormatted) * existing.priceUsd;
      } else {
        // First occurrence - clone the object
        aggregated.set(balance.address, { ...balance });
      }
    }

    return Array.from(aggregated.values());
  }

  private async getSolBalance(address: string): Promise<SolanaTokenBalance | null> {
    try {
      const response = await fetch(SOLANA_RPC, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getBalance',
          params: [address],
        }),
      });

      const data = await response.json() as { error?: unknown; result: { value: number } };
      if (data.error) {
        console.error('Solana RPC error:', data.error);
        return null;
      }

      const lamports = BigInt(data.result.value);
      if (lamports === 0n) return null;

      const balanceFormatted = (Number(lamports) / 1e9).toString();
      const priceUsd = await pricingService.getPrice('SOL') || 0;

      return {
        address: 'So11111111111111111111111111111111111111112',
        symbol: 'SOL',
        decimals: 9,
        balance: lamports.toString(),
        balanceFormatted,
        priceUsd,
        valueUsd: parseFloat(balanceFormatted) * priceUsd,
      };
    } catch (error) {
      console.error('Error fetching SOL balance:', error);
      return null;
    }
  }

  private async getSplTokenBalances(address: string): Promise<SolanaTokenBalance[]> {
    const balances: SolanaTokenBalance[] = [];

    try {
      const response = await fetch(SOLANA_RPC, {
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

      interface TokenAccount {
        account: {
          data: {
            parsed: {
              info: {
                mint: string;
                tokenAmount: { amount: string; uiAmountString: string };
              };
            };
          };
        };
      }
      const data = await response.json() as { error?: unknown; result?: { value: TokenAccount[] } };
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

        const tokenInfo = this.tokenMap.get(mint);
        if (!tokenInfo) continue;

        const balanceFormatted = tokenAmount.uiAmountString || '0';

        const priceUsd = await pricingService.getPrice(tokenInfo.symbol) || 0;

        balances.push({
          address: mint,
          symbol: tokenInfo.symbol,
          decimals: tokenInfo.decimals,
          balance: amount.toString(),
          balanceFormatted,
          priceUsd,
          valueUsd: parseFloat(balanceFormatted) * priceUsd,
        });
      }
    } catch (error) {
      console.error('Error fetching SPL token balances:', error);
    }

    return balances;
  }

  isSolanaAddress(input: string): boolean {
    const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
    return base58Regex.test(input);
  }
}

export const solanaService = new SolanaService();
