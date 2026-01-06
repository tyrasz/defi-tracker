import type { Address, PublicClient } from 'viem';
import { formatUnits } from 'viem';
import { BaseProtocolAdapter } from '../../base-adapter';
import type { ProtocolAddresses, YieldRate } from '../../types';
import type { ChainId } from '@/types/chain';
import type { Position } from '@/types/portfolio';
import type { ProtocolInfo } from '@/types/protocol';
import { BACKED_STOCK_ABI } from './abi';
import { BACKED_STOCKS } from './addresses';

export class BackedStocksAdapter extends BaseProtocolAdapter {
  readonly protocol: ProtocolInfo = {
    id: 'backed-stocks',
    name: 'Backed Finance (Stocks)',
    category: 'tokenized-securities',
    website: 'https://backed.fi',
    earnsYield: false, // Stocks don't earn yield (dividends would need special handling)
  };

  readonly supportedChains: ChainId[] = [1];

  protected getAddresses(chainId: ChainId): ProtocolAddresses | null {
    const stocks = BACKED_STOCKS[chainId];
    return stocks ? ({} as ProtocolAddresses) : null;
  }

  async hasPositions(
    client: PublicClient,
    address: Address,
    chainId: ChainId
  ): Promise<boolean> {
    const stocks = BACKED_STOCKS[chainId];
    if (!stocks) return false;

    for (const stock of stocks) {
      try {
        const balance = await client.readContract({
          address: stock.address,
          abi: BACKED_STOCK_ABI,
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
    const stocks = BACKED_STOCKS[chainId];
    if (!stocks) return [];

    const positions: Position[] = [];

    const balanceCalls = stocks.map((stock) => ({
      address: stock.address,
      abi: BACKED_STOCK_ABI,
      functionName: 'balanceOf' as const,
      args: [address] as const,
    }));

    try {
      const results = await client.multicall({ contracts: balanceCalls });

      for (let i = 0; i < stocks.length; i++) {
        const result = results[i];
        const stock = stocks[i];

        if (result.status !== 'success') continue;
        const balance = result.result as bigint;
        if (balance === 0n) continue;

        positions.push({
          id: `backed-stock-${chainId}-${stock.symbol.toLowerCase()}`,
          protocol: this.protocol,
          chainId,
          type: 'tokenized-stock',
          tokens: [
            {
              address: stock.address,
              symbol: stock.symbol,
              decimals: stock.decimals,
              balance,
              balanceFormatted: formatUnits(balance, stock.decimals),
              priceUsd: 0, // Would need price feed for underlying stock
              valueUsd: 0,
            },
          ],
          valueUsd: 0,
          metadata: {
            tokenName: stock.name,
            underlying: stock.underlying,
            ticker: stock.ticker,
            assetType: 'tokenized-equity',
          },
        });
      }
    } catch (error) {
      console.error('Error fetching Backed stocks positions:', error);
    }

    return positions;
  }

  async getYieldRates(
    _client: PublicClient,
    _chainId: ChainId
  ): Promise<YieldRate[]> {
    // Tokenized stocks don't have yield rates
    // Dividends would need special handling
    return [];
  }
}

export const backedStocksAdapter = new BackedStocksAdapter();
