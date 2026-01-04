import type { PublicClient, Address } from 'viem';
import { formatUnits } from 'viem';
import { BaseProtocolAdapter } from '../../base-adapter';
import type { YieldRate } from '../../types';
import type { ChainId } from '@/types/chain';
import type { Position } from '@/types/portfolio';
import { EIGENLAYER_ADDRESSES } from './addresses';
import { STRATEGY_MANAGER_ABI, STRATEGY_ABI, DELEGATION_MANAGER_ABI } from './abi';

export class EigenLayerAdapter extends BaseProtocolAdapter {
  readonly protocol = {
    id: 'eigenlayer',
    name: 'EigenLayer',
    category: 'restaking' as const,
    website: 'https://eigenlayer.xyz',
  };

  readonly supportedChains: ChainId[] = [1]; // Ethereum mainnet only

  protected getAddresses(chainId: ChainId) {
    return EIGENLAYER_ADDRESSES[chainId] || null;
  }

  async hasPositions(
    client: PublicClient,
    address: Address,
    chainId: ChainId
  ): Promise<boolean> {
    const config = EIGENLAYER_ADDRESSES[chainId];
    if (!config) return false;

    try {
      // Check first few strategies for shares
      const checkStrategies = config.strategies.slice(0, 3);
      const results = await Promise.all(
        checkStrategies.map((strategy) =>
          client.readContract({
            address: config.strategyManager,
            abi: STRATEGY_MANAGER_ABI,
            functionName: 'stakerStrategyShares',
            args: [address, strategy.address],
          })
        )
      );

      return results.some((shares) => shares > 0n);
    } catch {
      return false;
    }
  }

  async getPositions(
    client: PublicClient,
    address: Address,
    chainId: ChainId
  ): Promise<Position[]> {
    const config = EIGENLAYER_ADDRESSES[chainId];
    if (!config) return [];

    const positions: Position[] = [];

    try {
      // Get shares for all strategies
      const sharesResults = await Promise.all(
        config.strategies.map((strategy) =>
          client.readContract({
            address: config.strategyManager,
            abi: STRATEGY_MANAGER_ABI,
            functionName: 'stakerStrategyShares',
            args: [address, strategy.address],
          })
        )
      );

      // Filter strategies with non-zero shares
      const activeStrategies = config.strategies.filter(
        (_, i) => sharesResults[i] > 0n
      );
      const activeShares = sharesResults.filter((shares) => shares > 0n);

      if (activeStrategies.length === 0) return [];

      // Get underlying amounts for active strategies
      const underlyingAmounts = await Promise.all(
        activeStrategies.map((strategy, i) =>
          client.readContract({
            address: strategy.address,
            abi: STRATEGY_ABI,
            functionName: 'sharesToUnderlyingView',
            args: [activeShares[i]],
          })
        )
      );

      // Check delegation status
      let delegatedTo: Address | null = null;
      try {
        const isDelegated = await client.readContract({
          address: config.delegationManager,
          abi: DELEGATION_MANAGER_ABI,
          functionName: 'isDelegated',
          args: [address],
        });

        if (isDelegated) {
          delegatedTo = await client.readContract({
            address: config.delegationManager,
            abi: DELEGATION_MANAGER_ABI,
            functionName: 'delegatedTo',
            args: [address],
          });
        }
      } catch {
        // Delegation check failed, continue without it
      }

      // Create positions for each active strategy
      for (let i = 0; i < activeStrategies.length; i++) {
        const strategy = activeStrategies[i];
        const underlyingAmount = underlyingAmounts[i];

        // Get token decimals
        const decimals = await this.getTokenDecimals(
          client,
          strategy.underlyingToken
        );

        const balanceFormatted = formatUnits(underlyingAmount, decimals);

        positions.push({
          id: `eigenlayer-${strategy.symbol.toLowerCase()}-${chainId}`,
          protocol: this.protocol,
          chainId,
          type: 'restake',
          tokens: [
            {
              address: strategy.underlyingToken,
              symbol: strategy.symbol,
              decimals,
              balance: underlyingAmount,
              balanceFormatted,
              priceUsd: 0,
              valueUsd: 0,
            },
          ],
          valueUsd: 0,
          metadata: {
            strategyName: strategy.name,
            strategyAddress: strategy.address,
            shares: activeShares[i].toString(),
            ...(delegatedTo && { delegatedTo }),
          },
        });
      }
    } catch (error) {
      console.error('EigenLayer getPositions error:', error);
    }

    return positions;
  }

  async getYieldRates(
    _client: PublicClient,
    _chainId: ChainId
  ): Promise<YieldRate[]> {
    // EigenLayer doesn't have direct yield - rewards come from AVS operators
    // and are distributed separately. Return empty for now.
    return [];
  }
}

export const eigenLayerAdapter = new EigenLayerAdapter();
