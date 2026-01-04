import type { Address, PublicClient } from 'viem';
import type { ChainId } from '@/types/chain';
import type { Position } from '@/types/portfolio';
import type { ProtocolInfo } from '@/types/protocol';
import type { IProtocolAdapter, ProtocolAddresses, YieldRate } from './types';

export abstract class BaseProtocolAdapter implements IProtocolAdapter {
  abstract readonly protocol: ProtocolInfo;
  abstract readonly supportedChains: ChainId[];

  protected abstract getAddresses(chainId: ChainId): ProtocolAddresses | null;

  async hasPositions(
    client: PublicClient,
    address: Address,
    chainId: ChainId
  ): Promise<boolean> {
    if (!this.supportedChains.includes(chainId)) {
      return false;
    }

    try {
      const positions = await this.getPositions(client, address, chainId);
      return positions.length > 0;
    } catch {
      return false;
    }
  }

  abstract getPositions(
    client: PublicClient,
    address: Address,
    chainId: ChainId
  ): Promise<Position[]>;

  abstract getYieldRates(
    client: PublicClient,
    chainId: ChainId
  ): Promise<YieldRate[]>;

  protected isChainSupported(chainId: ChainId): boolean {
    return (
      this.supportedChains.includes(chainId) &&
      this.getAddresses(chainId) !== null
    );
  }

  protected async getTokenDecimals(
    client: PublicClient,
    tokenAddress: Address
  ): Promise<number> {
    try {
      const result = await client.readContract({
        address: tokenAddress,
        abi: [
          {
            name: 'decimals',
            type: 'function',
            inputs: [],
            outputs: [{ type: 'uint8' }],
            stateMutability: 'view',
          },
        ],
        functionName: 'decimals',
      });
      return result as number;
    } catch {
      return 18;
    }
  }

  protected async getTokenSymbol(
    client: PublicClient,
    tokenAddress: Address
  ): Promise<string> {
    try {
      const result = await client.readContract({
        address: tokenAddress,
        abi: [
          {
            name: 'symbol',
            type: 'function',
            inputs: [],
            outputs: [{ type: 'string' }],
            stateMutability: 'view',
          },
        ],
        functionName: 'symbol',
      });
      return result as string;
    } catch {
      return 'UNKNOWN';
    }
  }
}
