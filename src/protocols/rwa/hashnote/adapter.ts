import type { Address, PublicClient } from 'viem';
import { formatUnits } from 'viem';
import { BaseProtocolAdapter } from '../../base-adapter';
import type { ProtocolAddresses, YieldRate } from '../../types';
import type { ChainId } from '@/types/chain';
import type { Position } from '@/types/portfolio';
import type { ProtocolInfo } from '@/types/protocol';
import { USYC_ABI } from './abi';
import { HASHNOTE_TOKENS } from './addresses';

export class HashnoteAdapter extends BaseProtocolAdapter {
  readonly protocol: ProtocolInfo = {
    id: 'hashnote',
    name: 'Hashnote',
    category: 'rwa',
    website: 'https://hashnote.com',
    earnsYield: true,
  };

  readonly supportedChains: ChainId[] = [1];

  protected getAddresses(chainId: ChainId): ProtocolAddresses | null {
    const tokens = HASHNOTE_TOKENS[chainId];
    return tokens ? ({} as ProtocolAddresses) : null;
  }

  async hasPositions(
    client: PublicClient,
    address: Address,
    chainId: ChainId
  ): Promise<boolean> {
    const tokens = HASHNOTE_TOKENS[chainId];
    if (!tokens) return false;

    for (const token of tokens) {
      try {
        const balance = await client.readContract({
          address: token.address,
          abi: USYC_ABI,
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
    const tokens = HASHNOTE_TOKENS[chainId];
    if (!tokens) return [];

    const positions: Position[] = [];

    for (const token of tokens) {
      try {
        const balance = await client.readContract({
          address: token.address,
          abi: USYC_ABI,
          functionName: 'balanceOf',
          args: [address],
        });

        if (balance === 0n) continue;

        positions.push({
          id: `hashnote-${chainId}-${token.symbol.toLowerCase()}`,
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
            assetType: 'treasury-backed',
          },
        });
      } catch (error) {
        console.error(`Error fetching Hashnote ${token.symbol} position:`, error);
      }
    }

    return positions;
  }

  async getYieldRates(
    _client: PublicClient,
    chainId: ChainId
  ): Promise<YieldRate[]> {
    const tokens = HASHNOTE_TOKENS[chainId];
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
        source: 'US Treasury Bills',
        tokenName: token.name,
      },
    }));
  }
}

export const hashnoteAdapter = new HashnoteAdapter();
