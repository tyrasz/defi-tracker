import type { Address } from 'viem';
import type { ChainId } from '@/types/chain';
import type { WalletBalances, WalletBalance } from '@/core/wallet/wallet-balance-fetcher';
import type {
  PortfolioSnapshot,
  TokenSnapshot,
  PortfolioHistory,
  HistoricalValue,
} from '@/types/history';
import { historyStore } from './history-store';
import { walletBalanceFetcher } from '@/core/wallet/wallet-balance-fetcher';

class SnapshotService {
  /**
   * Take a snapshot of the current portfolio state
   */
  async takeSnapshot(address: Address): Promise<PortfolioSnapshot> {
    // Fetch current balances
    const balances = await walletBalanceFetcher.getBalances(address);

    // Convert to snapshot format
    const tokenHoldings: TokenSnapshot[] = [];
    const chainBreakdown: Record<ChainId, number> = {} as Record<ChainId, number>;

    for (const chainBalance of balances.balances) {
      chainBreakdown[chainBalance.chainId] = chainBalance.totalValueUsd;

      for (const token of chainBalance.balances) {
        tokenHoldings.push({
          chainId: chainBalance.chainId,
          address: token.address,
          symbol: token.symbol,
          balance: token.balance.toString(),
          priceUsd: token.priceUsd,
          valueUsd: token.valueUsd,
        });
      }
    }

    const snapshot = await historyStore.saveSnapshot({
      address,
      timestamp: Date.now(),
      totalValueUsd: balances.totalValueUsd,
      chainBreakdown,
      tokenHoldings,
    });

    return snapshot;
  }

  /**
   * Get portfolio history over a time period
   */
  async getHistory(
    address: Address,
    days: number = 30
  ): Promise<PortfolioHistory> {
    return historyStore.getHistory(address, days);
  }

  /**
   * Get value change over a time period
   */
  async getValueChange(
    address: Address,
    days: number = 7
  ): Promise<{
    startValue: number;
    endValue: number;
    absoluteChange: number;
    percentChange: number;
    highValue: number;
    lowValue: number;
  }> {
    const history = await this.getHistory(address, days);

    if (history.valueHistory.length === 0) {
      return {
        startValue: 0,
        endValue: 0,
        absoluteChange: 0,
        percentChange: 0,
        highValue: 0,
        lowValue: 0,
      };
    }

    const values = history.valueHistory.map((h) => h.valueUsd);
    const startValue = values[0];
    const endValue = values[values.length - 1];
    const absoluteChange = endValue - startValue;
    const percentChange = startValue > 0 ? (absoluteChange / startValue) * 100 : 0;
    const highValue = Math.max(...values);
    const lowValue = Math.min(...values);

    return {
      startValue,
      endValue,
      absoluteChange,
      percentChange,
      highValue,
      lowValue,
    };
  }

  /**
   * Get snapshots for a specific time range
   */
  async getSnapshots(
    address: Address,
    startTime?: number,
    endTime?: number
  ): Promise<PortfolioSnapshot[]> {
    return historyStore.getSnapshots(address, startTime, endTime);
  }

  /**
   * Get the most recent snapshot
   */
  async getLatestSnapshot(address: Address): Promise<PortfolioSnapshot | null> {
    return historyStore.getLatestSnapshot(address);
  }

  /**
   * Calculate daily returns from snapshots
   */
  async getDailyReturns(
    address: Address,
    days: number = 30
  ): Promise<{ date: string; return: number }[]> {
    const history = await this.getHistory(address, days);
    const dailyReturns: { date: string; return: number }[] = [];

    for (let i = 1; i < history.valueHistory.length; i++) {
      const prevValue = history.valueHistory[i - 1].valueUsd;
      const currValue = history.valueHistory[i].valueUsd;
      const dailyReturn = prevValue > 0
        ? ((currValue - prevValue) / prevValue) * 100
        : 0;

      dailyReturns.push({
        date: new Date(history.valueHistory[i].timestamp).toISOString().split('T')[0],
        return: dailyReturn,
      });
    }

    return dailyReturns;
  }

  /**
   * Compare current portfolio to a past snapshot
   */
  async compareToSnapshot(
    address: Address,
    snapshotId: string
  ): Promise<{
    currentValue: number;
    snapshotValue: number;
    absoluteChange: number;
    percentChange: number;
    tokenChanges: {
      symbol: string;
      chainId: ChainId;
      previousValue: number;
      currentValue: number;
      change: number;
    }[];
  } | null> {
    const snapshots = await this.getSnapshots(address);
    const targetSnapshot = snapshots.find((s) => s.id === snapshotId);

    if (!targetSnapshot) {
      return null;
    }

    const currentBalances = await walletBalanceFetcher.getBalances(address);
    const currentValue = currentBalances.totalValueUsd;
    const snapshotValue = targetSnapshot.totalValueUsd;

    // Build map of current holdings
    const currentHoldings = new Map<string, number>();
    for (const chain of currentBalances.balances) {
      for (const token of chain.balances) {
        const key = `${chain.chainId}-${token.symbol}`;
        currentHoldings.set(key, token.valueUsd);
      }
    }

    // Calculate token changes
    const tokenChanges: {
      symbol: string;
      chainId: ChainId;
      previousValue: number;
      currentValue: number;
      change: number;
    }[] = [];

    for (const token of targetSnapshot.tokenHoldings) {
      const key = `${token.chainId}-${token.symbol}`;
      const currVal = currentHoldings.get(key) || 0;
      tokenChanges.push({
        symbol: token.symbol,
        chainId: token.chainId,
        previousValue: token.valueUsd,
        currentValue: currVal,
        change: currVal - token.valueUsd,
      });
      currentHoldings.delete(key);
    }

    // Add new holdings not in snapshot
    for (const [key, value] of currentHoldings) {
      const [chainId, symbol] = key.split('-');
      tokenChanges.push({
        symbol,
        chainId: parseInt(chainId) as ChainId,
        previousValue: 0,
        currentValue: value,
        change: value,
      });
    }

    return {
      currentValue,
      snapshotValue,
      absoluteChange: currentValue - snapshotValue,
      percentChange: snapshotValue > 0
        ? ((currentValue - snapshotValue) / snapshotValue) * 100
        : 0,
      tokenChanges: tokenChanges.sort((a, b) => Math.abs(b.change) - Math.abs(a.change)),
    };
  }
}

export const snapshotService = new SnapshotService();
