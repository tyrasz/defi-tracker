import type { Address } from 'viem';
import type { ChainId } from './chain';
import type { Position, PositionType } from './portfolio';

export interface YieldRate {
  protocol: string;
  chainId: ChainId;
  asset: Address;
  assetSymbol: string;
  type: PositionType;
  apy: number;
  apr: number;
  tvl?: number;
}

export type RiskLevel = 'low' | 'medium' | 'high';

export interface YieldAlternative {
  protocol: string;
  protocolName: string;
  chainId: ChainId;
  asset: Address;
  apy: number;
  apyImprovement: number;
  annualGainUsd: number;
  risk: RiskLevel;
}

export interface YieldOpportunity {
  currentPosition: Position;
  betterAlternatives: YieldAlternative[];
  potentialGainApy: number;
  potentialGainUsd: number;
}

export interface IdleAsset {
  token: Address;
  symbol: string;
  balance: bigint;
  valueUsd: number;
  chainId: ChainId;
  bestYieldOpportunities: YieldAlternative[];
}

export interface YieldAnalysis {
  address: Address;
  totalCurrentYield: number;
  totalPotentialYield: number;
  opportunities: YieldOpportunity[];
  idleAssets: IdleAsset[];
  analyzedAt: number;
}
