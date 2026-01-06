import type { Address, PublicClient } from 'viem';
import { formatUnits } from 'viem';
import { BaseProtocolAdapter } from '../../base-adapter';
import type { ProtocolAddresses, YieldRate } from '../../types';
import type { ChainId } from '@/types/chain';
import type { Position } from '@/types/portfolio';
import type { ProtocolInfo } from '@/types/protocol';
import { USTB_ABI } from './abi';
import { SUPERSTATE_TOKENS } from './addresses';

export class SuperstateAdapter extends BaseProtocolAdapter {
  readonly protocol: ProtocolInfo = {
    id: 'superstate',
    name: 'Superstate',
    category: 'rwa',
    website: 'https://superstate.co',
    earnsYield: true,
  };

  readonly supportedChains: ChainId[] = [1];

  protected getAddresses(chainId: ChainId): ProtocolAddresses | null {
    const tokens = SUPERSTATE_TOKENS[chainId];
    return tokens ? ({} as ProtocolAddresses) : null;
  }

  async hasPositions(
    client: PublicClient,
    address: Address,
    chainId: ChainId
  ): Promise<boolean> {
    const tokens = SUPERSTATE_TOKENS[chainId];
    if (!tokens) return false;

    for (const token of tokens) {
      try {
        const balance = await client.readContract({
          address: token.address,
          abi: USTB_ABI,
          functionName: 'balanceOf',
          args: [address],
        });
        if (balance > 0n) return true;
      } catch {
        continue;
      }
    }

    return false;
  }

  async getPositions(
    client: PublicClient,
    address: Address,
    chainId: ChainId
  ): Promise<Position[]> {
    const tokens = SUPERSTATE_TOKENS[chainId];
    if (!tokens) return [];

    const positions: Position[] = [];

    for (const token of tokens) {
      try {
        const balance = await client.readContract({
          address: token.address,
          abi: USTB_ABI,
          functionName: 'balanceOf',
          args: [address],
        });

        if (balance === 0n) continue;

        positions.push({
          id: `superstate-${chainId}-${token.symbol.toLowerCase()}`,
          protocol: this.protocol,
          chainId,
          type: 'rwa',
          tokens: [
            {
              address: token.address,
              symbol: token.symbol,
              decimals: token.decimals,
              balance,
              balanceFormatted: formatUnits(balance, token.decimals),
              priceUsd: 0,
              valueUsd: 0,
            },
          ],
          valueUsd: 0,
          yield: {
            apy: token.estimatedApy,
            apr: token.estimatedApy,
          },
          metadata: {
            tokenName: token.name,
            assetType: 'treasury-fund',
          },
        });
      } catch (error) {
        console.error(`Error fetching Superstate ${token.symbol} position:`, error);
      }
    }

    return positions;
  }

  async getYieldRates(
    _client: PublicClient,
    chainId: ChainId
  ): Promise<YieldRate[]> {
    const tokens = SUPERSTATE_TOKENS[chainId];
    if (!tokens) return [];

    return tokens.map((token) => ({
      protocol: this.protocol.id,
      chainId,
      asset: token.address,
      assetSymbol: token.symbol,
      type: 'rwa',
      apy: token.estimatedApy,
      apr: token.estimatedApy,
      metadata: {
        source: 'US Treasury Securities',
        tokenName: token.name,
      },
    }));
  }
}

export const superstateAdapter = new SuperstateAdapter();
