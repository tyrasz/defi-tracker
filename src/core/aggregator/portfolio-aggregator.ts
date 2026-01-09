import type { Address } from 'viem';
import type { ChainId, EvmChainId } from '@/types/chain';
import type {
  Portfolio,
  Position,
  ChainPortfolio,
  ProtocolPortfolio,
} from '@/types/portfolio';
import { chainRegistry } from '@/chains';
import { protocolRegistry } from '@/protocols';

class PortfolioAggregator {
  async getPortfolio(
    address: Address,
    chainIds?: ChainId[]
  ): Promise<Portfolio> {
    // Only process EVM chains for protocol positions (Solana protocols not yet supported)
    const allChains = chainIds ?? chainRegistry.getSupportedChainIds();
    const evmChains = allChains.filter((id): id is EvmChainId => typeof id === 'number');

    // Fetch positions from all EVM chains in parallel
    const chainResults = await Promise.all(
      evmChains.map((chainId) => this.getChainPositions(address, chainId))
    );

    // Flatten all positions
    const allPositions = chainResults.flat();

    // Calculate total value
    const totalValueUsd = allPositions.reduce(
      (sum, pos) => sum + pos.valueUsd,
      0
    );

    // Group by chain
    const byChain = this.groupByChain(allPositions, evmChains);

    // Group by protocol
    const byProtocol = this.groupByProtocol(allPositions);

    // Group by position type
    const byType = this.groupByType(allPositions);

    return {
      address,
      totalValueUsd,
      positions: allPositions,
      byChain: byChain as Record<ChainId, ChainPortfolio>,
      byProtocol,
      byType,
      fetchedAt: Date.now(),
    };
  }

  private async getChainPositions(
    address: Address,
    chainId: EvmChainId
  ): Promise<Position[]> {
    const client = chainRegistry.getClient(chainId);
    const adapters = protocolRegistry.getAdaptersForChain(chainId);

    // First, do quick hasPositions checks in parallel
    const hasPositionsResults = await Promise.all(
      adapters.map(async (adapter) => ({
        adapter,
        hasPositions: await adapter
          .hasPositions(client, address, chainId)
          .catch(() => false),
      }))
    );

    // Only fetch full positions for protocols where user has positions
    const activeAdapters = hasPositionsResults
      .filter((r) => r.hasPositions)
      .map((r) => r.adapter);

    // Fetch full position data in parallel
    const positionResults = await Promise.allSettled(
      activeAdapters.map((adapter) =>
        adapter.getPositions(client, address, chainId)
      )
    );

    // Collect successful results
    const positions: Position[] = [];
    positionResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        positions.push(...result.value);
      } else {
        console.error(
          `Failed to fetch positions from ${activeAdapters[index].protocol.name}:`,
          result.reason
        );
      }
    });

    return positions;
  }

  private groupByChain(
    positions: Position[],
    chains: EvmChainId[]
  ): Record<EvmChainId, ChainPortfolio> {
    const result: Record<number, ChainPortfolio> = {};

    for (const chainId of chains) {
      const chainConfig = chainRegistry.getChain(chainId);
      const chainPositions = positions.filter((p) => p.chainId === chainId);

      result[chainId] = {
        chainId,
        chainName: chainConfig?.name ?? `Chain ${chainId}`,
        totalValueUsd: chainPositions.reduce((sum, p) => sum + p.valueUsd, 0),
        positions: chainPositions,
      };
    }

    return result as Record<EvmChainId, ChainPortfolio>;
  }

  private groupByProtocol(
    positions: Position[]
  ): Record<string, ProtocolPortfolio> {
    const result: Record<string, ProtocolPortfolio> = {};

    for (const position of positions) {
      const protocolId = position.protocol.id;

      if (!result[protocolId]) {
        result[protocolId] = {
          protocolId,
          protocolName: position.protocol.name,
          totalValueUsd: 0,
          positions: [],
        };
      }

      result[protocolId].positions.push(position);
      result[protocolId].totalValueUsd += position.valueUsd;
    }

    return result;
  }

  private groupByType(positions: Position[]): Record<string, Position[]> {
    const result: Record<string, Position[]> = {};

    for (const position of positions) {
      if (!result[position.type]) {
        result[position.type] = [];
      }
      result[position.type].push(position);
    }

    return result;
  }
}

export const portfolioAggregator = new PortfolioAggregator();
