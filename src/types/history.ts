import type { Address } from 'viem';
import type { ChainId } from './chain';

export interface PortfolioSnapshot {
  id: string;
  address: Address;
  timestamp: number;
  totalValueUsd: number;
  chainBreakdown: Record<ChainId, number>;
  tokenHoldings: TokenSnapshot[];
}

export interface TokenSnapshot {
  chainId: ChainId;
  address: Address | string; // string for Solana
  symbol: string;
  balance: string; // stringified bigint
  priceUsd: number;
  valueUsd: number;
}

export interface CostBasis {
  address: Address;
  tokenAddress: Address | string;
  chainId: ChainId;
  symbol: string;
  totalCost: number;
  totalQuantity: string; // stringified bigint
  averageCostPerUnit: number;
  acquisitions: Acquisition[];
}

export interface Acquisition {
  timestamp: number;
  quantity: string; // stringified bigint
  costUsd: number;
  pricePerUnit: number;
  txHash?: string;
  source: 'manual' | 'import' | 'detected';
}

export interface PnLSummary {
  address: Address;
  totalRealizedPnL: number;
  totalUnrealizedPnL: number;
  positions: PositionPnL[];
  calculatedAt: number;
}

export interface PositionPnL {
  chainId: ChainId;
  tokenAddress: Address | string;
  symbol: string;
  costBasis: number;
  currentValue: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  realizedPnL: number;
}

export interface HistoricalValue {
  timestamp: number;
  valueUsd: number;
}

export interface PortfolioHistory {
  address: Address;
  snapshots: PortfolioSnapshot[];
  valueHistory: HistoricalValue[];
  startDate: number;
  endDate: number;
}
