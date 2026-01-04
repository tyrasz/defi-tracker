import type { Address, PublicClient } from 'viem';
import type { ChainId } from '@/types/chain';
import type { Position, PositionType } from '@/types/portfolio';
import type { ProtocolInfo } from '@/types/protocol';

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

export interface IProtocolAdapter {
  readonly protocol: ProtocolInfo;
  readonly supportedChains: ChainId[];

  hasPositions(
    client: PublicClient,
    address: Address,
    chainId: ChainId
  ): Promise<boolean>;

  getPositions(
    client: PublicClient,
    address: Address,
    chainId: ChainId
  ): Promise<Position[]>;

  getYieldRates(client: PublicClient, chainId: ChainId): Promise<YieldRate[]>;
}

export interface ProtocolAddresses {
  [key: string]: Address | unknown;
}
