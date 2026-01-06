import type { Address, PublicClient } from 'viem';
import { formatUnits } from 'viem';
import { BaseProtocolAdapter } from '../../base-adapter';
import type { ProtocolAddresses, YieldRate } from '../../types';
import type { ChainId } from '@/types/chain';
import type { Position } from '@/types/portfolio';
import type { ProtocolInfo } from '@/types/protocol';
import { USDM_ABI } from './abi';
import { MOUNTAIN_TOKENS } from './addresses';

export class MountainAdapter extends BaseProtocolAdapter {
  readonly protocol: ProtocolInfo = {
    id: 'mountain',
    name: 'Mountain Protocol',
    category: 'rwa',
    website: 'https://mountainprotocol.com',
    earnsYield: true,
  };

  readonly supportedChains: ChainId[] = [1, 42161, 10, 8453];

  protected getAddresses(chainId: ChainId): ProtocolAddresses | null {
    const tokens = MOUNTAIN_TOKENS[chainId];
    return tokens ? ({} as ProtocolAddresses) : null;
  }

  async hasPositions(
    client: PublicClient,
    address: Address,
    chainId: ChainId
  ): Promise<boolean> {
    const tokens = MOUNTAIN_TOKENS[chainId];
    if (!tokens) return false;

    for (const token of tokens) {
      try {
        const balance = await client.readContract({
          address: token.address,
          abi: USDM_ABI,
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
    const tokens = MOUNTAIN_TOKENS[chainId];
    if (!tokens) return [];

    const positions: Position[] = [];

    for (const token of tokens) {
      try {
        const balance = await client.readContract({
          address: token.address,
          abi: USDM_ABI,
          functionName: 'balanceOf',
          args: [address],
        });

        if (balance === 0n) continue;

        positions.push({
          id: `mountain-${chainId}-${token.symbol.toLowerCase()}`,
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
              priceUsd: 1, // USDM is pegged to $1
              valueUsd: Number(formatUnits(balance, token.decimals)),
            },
          ],
          valueUsd: Number(formatUnits(balance, token.decimals)),
          yield: {
            apy: token.estimatedApy,
            apr: token.estimatedApy,
          },
          metadata: {
            tokenName: token.name,
            assetType: 'treasury-backed',
            rebasingToken: true,
          },
        });
      } catch (error) {
        console.error(`Error fetching Mountain ${token.symbol} position:`, error);
      }
    }

    return positions;
  }

  async getYieldRates(
    _client: PublicClient,
    chainId: ChainId
  ): Promise<YieldRate[]> {
    const tokens = MOUNTAIN_TOKENS[chainId];
    if (!tokens) return [];

    // Mountain yields are based on underlying T-bill rates
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

export const mountainAdapter = new MountainAdapter();
