import type { Address, PublicClient } from 'viem';
import { formatUnits } from 'viem';
import { BaseProtocolAdapter } from '../../base-adapter';
import type { ProtocolAddresses, YieldRate } from '../../types';
import type { ChainId } from '@/types/chain';
import type { Position } from '@/types/portfolio';
import type { ProtocolInfo } from '@/types/protocol';
import { BACKED_TOKEN_ABI } from './abi';
import { BACKED_RWA_TOKENS } from './addresses';

export class BackedRwaAdapter extends BaseProtocolAdapter {
  readonly protocol: ProtocolInfo = {
    id: 'backed-rwa',
    name: 'Backed Finance (RWA)',
    category: 'rwa',
    website: 'https://backed.fi',
    earnsYield: true,
  };

  readonly supportedChains: ChainId[] = [1];

  protected getAddresses(chainId: ChainId): ProtocolAddresses | null {
    const tokens = BACKED_RWA_TOKENS[chainId];
    return tokens ? ({} as ProtocolAddresses) : null;
  }

  async hasPositions(
    client: PublicClient,
    address: Address,
    chainId: ChainId
  ): Promise<boolean> {
    const tokens = BACKED_RWA_TOKENS[chainId];
    if (!tokens) return false;

    for (const token of tokens) {
      try {
        const balance = await client.readContract({
          address: token.address,
          abi: BACKED_TOKEN_ABI,
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
    const tokens = BACKED_RWA_TOKENS[chainId];
    if (!tokens) return [];

    const positions: Position[] = [];

    const balanceCalls = tokens.map((token) => ({
      address: token.address,
      abi: BACKED_TOKEN_ABI,
      functionName: 'balanceOf' as const,
      args: [address] as const,
    }));

    try {
      const results = await client.multicall({ contracts: balanceCalls });

      for (let i = 0; i < tokens.length; i++) {
        const result = results[i];
        const token = tokens[i];

        if (result.status !== 'success') continue;
        const balance = result.result as bigint;
        if (balance === 0n) continue;

        positions.push({
          id: `backed-rwa-${chainId}-${token.symbol.toLowerCase()}`,
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
            underlying: token.underlying,
            assetType: 'tokenized-etf',
          },
        });
      }
    } catch (error) {
      console.error('Error fetching Backed RWA positions:', error);
    }

    return positions;
  }

  async getYieldRates(
    _client: PublicClient,
    chainId: ChainId
  ): Promise<YieldRate[]> {
    const tokens = BACKED_RWA_TOKENS[chainId];
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
        underlying: token.underlying,
        tokenName: token.name,
      },
    }));
  }
}

export const backedRwaAdapter = new BackedRwaAdapter();
