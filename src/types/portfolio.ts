import type { Address } from 'viem';
import type { ChainId } from './chain';
import type { ProtocolInfo } from './protocol';
import type { TokenBalance } from './token';

export type PositionType =
  | 'supply'
  | 'borrow'
  | 'liquidity'
  | 'stake'
  | 'vault'
  | 'collateral'
  | 'wallet'
  | 'restake'
  | 'savings'
  | 'farm'
  | 'locked'
  | 'fixed-yield'
  | 'rwa'
  | 'tokenized-stock';

export interface YieldInfo {
  apy: number;
  apr: number;
  rewardTokens?: TokenBalance[];
}

export interface Position {
  id: string;
  protocol: ProtocolInfo;
  chainId: ChainId;
  type: PositionType;
  tokens: TokenBalance[];
  valueUsd: number;
  yield?: YieldInfo;
  healthFactor?: number;
  metadata?: Record<string, unknown>;
}

export interface Portfolio {
  address: Address;
  totalValueUsd: number;
  positions: Position[];
  byChain: Record<ChainId, ChainPortfolio>;
  byProtocol: Record<string, ProtocolPortfolio>;
  byType: Record<string, Position[]>;
  fetchedAt: number;
}

export interface ChainPortfolio {
  chainId: ChainId;
  chainName: string;
  totalValueUsd: number;
  positions: Position[];
}

export interface ProtocolPortfolio {
  protocolId: string;
  protocolName: string;
  totalValueUsd: number;
  positions: Position[];
}
