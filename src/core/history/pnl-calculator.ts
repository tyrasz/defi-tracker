import type { Address } from 'viem';
import type { ChainId } from '@/types/chain';
import type { TokenBalance } from '@/types/token';
import type {
  CostBasis,
  PnLSummary,
  PositionPnL,
} from '@/types/history';
import { historyStore } from './history-store';

export interface TokenPosition {
  chainId: ChainId;
  address: Address | string;
  symbol: string;
  balance: bigint;
  valueUsd: number;
  priceUsd: number;
}

class PnLCalculator {
  /**
   * Calculate unrealized P&L for all positions
   */
  async calculatePnL(
    walletAddress: Address,
    positions: TokenPosition[]
  ): Promise<PnLSummary> {
    const costBases = await historyStore.getAllCostBases(walletAddress);
    const costBasisMap = new Map<string, CostBasis>();

    // Index cost bases by key
    for (const cb of costBases) {
      const key = this.getPositionKey(cb.chainId, cb.tokenAddress);
      costBasisMap.set(key, cb);
    }

    const positionPnLs: PositionPnL[] = [];
    let totalUnrealizedPnL = 0;
    let totalRealizedPnL = 0;

    for (const position of positions) {
      const key = this.getPositionKey(position.chainId, position.address);
      const costBasis = costBasisMap.get(key);

      if (costBasis && costBasis.totalCost > 0) {
        const unrealizedPnL = position.valueUsd - costBasis.totalCost;
        const unrealizedPnLPercent = costBasis.totalCost > 0
          ? (unrealizedPnL / costBasis.totalCost) * 100
          : 0;

        positionPnLs.push({
          chainId: position.chainId,
          tokenAddress: position.address,
          symbol: position.symbol,
          costBasis: costBasis.totalCost,
          currentValue: position.valueUsd,
          unrealizedPnL,
          unrealizedPnLPercent,
          realizedPnL: 0, // Would need transaction history for this
        });

        totalUnrealizedPnL += unrealizedPnL;
      } else {
        // No cost basis recorded - can't calculate P&L
        positionPnLs.push({
          chainId: position.chainId,
          tokenAddress: position.address,
          symbol: position.symbol,
          costBasis: 0,
          currentValue: position.valueUsd,
          unrealizedPnL: 0,
          unrealizedPnLPercent: 0,
          realizedPnL: 0,
        });
      }
    }

    return {
      address: walletAddress,
      totalRealizedPnL,
      totalUnrealizedPnL,
      positions: positionPnLs.sort((a, b) =>
        Math.abs(b.unrealizedPnL) - Math.abs(a.unrealizedPnL)
      ),
      calculatedAt: Date.now(),
    };
  }

  /**
   * Record a token purchase/acquisition
   */
  async recordAcquisition(
    walletAddress: Address,
    chainId: ChainId,
    tokenAddress: Address | string,
    symbol: string,
    quantity: bigint,
    totalCostUsd: number,
    txHash?: string
  ): Promise<CostBasis> {
    const pricePerUnit = Number(quantity) > 0
      ? totalCostUsd / Number(quantity)
      : 0;

    return historyStore.addAcquisition(
      walletAddress,
      chainId,
      tokenAddress,
      symbol,
      {
        timestamp: Date.now(),
        quantity: quantity.toString(),
        costUsd: totalCostUsd,
        pricePerUnit,
        txHash,
        source: 'manual',
      }
    );
  }

  /**
   * Manually set cost basis for a position
   */
  async setCostBasis(
    walletAddress: Address,
    chainId: ChainId,
    tokenAddress: Address | string,
    symbol: string,
    totalQuantity: bigint,
    totalCostUsd: number
  ): Promise<CostBasis> {
    const costBasis: CostBasis = {
      address: walletAddress,
      tokenAddress,
      chainId,
      symbol,
      totalCost: totalCostUsd,
      totalQuantity: totalQuantity.toString(),
      averageCostPerUnit: Number(totalQuantity) > 0
        ? totalCostUsd / Number(totalQuantity)
        : 0,
      acquisitions: [{
        timestamp: Date.now(),
        quantity: totalQuantity.toString(),
        costUsd: totalCostUsd,
        pricePerUnit: Number(totalQuantity) > 0
          ? totalCostUsd / Number(totalQuantity)
          : 0,
        source: 'manual',
      }],
    };

    await historyStore.setCostBasis(costBasis);
    return costBasis;
  }

  /**
   * Get cost basis for a specific position
   */
  async getCostBasis(
    walletAddress: Address,
    chainId: ChainId,
    tokenAddress: Address | string
  ): Promise<CostBasis | null> {
    return historyStore.getCostBasis(walletAddress, chainId, tokenAddress);
  }

  /**
   * Calculate return on investment percentage
   */
  calculateROI(costBasis: number, currentValue: number): number {
    if (costBasis <= 0) return 0;
    return ((currentValue - costBasis) / costBasis) * 100;
  }

  private getPositionKey(chainId: ChainId, tokenAddress: Address | string): string {
    const addr = String(tokenAddress).toLowerCase();
    return `${chainId}-${addr}`;
  }
}

export const pnlCalculator = new PnLCalculator();
