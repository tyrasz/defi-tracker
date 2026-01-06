import type { Address, PublicClient } from 'viem';
import { formatUnits } from 'viem';
import { BaseProtocolAdapter } from '../../base-adapter';
import type { ProtocolAddresses, YieldRate } from '../../types';
import type { ChainId } from '@/types/chain';
import type { Position } from '@/types/portfolio';
import type { ProtocolInfo } from '@/types/protocol';
import { ONDO_TOKEN_ABI } from './abi';
import { ONDO_TOKENS } from './addresses';

export class OndoAdapter extends BaseProtocolAdapter {
  readonly protocol: ProtocolInfo = {
    id: 'ondo',
    name: 'Ondo Finance',
    category: 'rwa',
    website: 'https://ondo.finance',
    earnsYield: true,
  };

  readonly supportedChains: ChainId[] = [1, 42161];

  protected getAddresses(chainId: ChainId): ProtocolAddresses | null {
    const tokens = ONDO_TOKENS[chainId];
    return tokens ? ({} as ProtocolAddresses) : null;
  }

  async hasPositions(
    client: PublicClient,
    address: Address,
    chainId: ChainId
  ): Promise<boolean> {
    const tokens = ONDO_TOKENS[chainId];
    if (!tokens) return false;

    for (const token of tokens) {
      try {
        const balance = await client.readContract({
          address: token.address,
          abi: ONDO_TOKEN_ABI,
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
    const tokens = ONDO_TOKENS[chainId];
    if (!tokens) return [];

    const positions: Position[] = [];

    // Batch all balance calls
    const balanceCalls = tokens.map((token) => ({
      address: token.address,
      abi: ONDO_TOKEN_ABI,
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
          id: `ondo-${chainId}-${token.symbol.toLowerCase()}`,
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
      }
    } catch (error) {
      console.error('Error fetching Ondo positions:', error);
    }

    return positions;
  }

  async getYieldRates(
    _client: PublicClient,
    chainId: ChainId
  ): Promise<YieldRate[]> {
    const tokens = ONDO_TOKENS[chainId];
    if (!tokens) return [];

    // Ondo yields are based on underlying T-bill rates
    // These are relatively stable and published by Ondo
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

export const ondoAdapter = new OndoAdapter();
