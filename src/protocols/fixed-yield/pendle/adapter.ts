import type { Address, PublicClient } from 'viem';
import { formatUnits } from 'viem';
import { BaseProtocolAdapter } from '../../base-adapter';
import type { ProtocolAddresses, YieldRate } from '../../types';
import type { ChainId } from '@/types/chain';
import type { Position } from '@/types/portfolio';
import type { ProtocolInfo } from '@/types/protocol';
import { PENDLE_TOKEN_ABI, PENDLE_MARKET_ABI, PENDLE_ROUTER_STATIC_ABI } from './abi';
import { PENDLE_ADDRESSES, PENDLE_MARKETS } from './addresses';

export class PendleAdapter extends BaseProtocolAdapter {
  readonly protocol: ProtocolInfo = {
    id: 'pendle',
    name: 'Pendle',
    category: 'fixed-yield',
    website: 'https://pendle.finance',
    earnsYield: true,
  };

  readonly supportedChains: ChainId[] = [1, 42161];

  protected getAddresses(chainId: ChainId): ProtocolAddresses | null {
    const addresses = PENDLE_ADDRESSES[chainId];
    return addresses ? (addresses as unknown as ProtocolAddresses) : null;
  }

  async hasPositions(
    client: PublicClient,
    address: Address,
    chainId: ChainId
  ): Promise<boolean> {
    const markets = PENDLE_MARKETS[chainId];
    if (!markets) return false;

    for (const market of markets) {
      try {
        // Check PT balance
        const ptBalance = await client.readContract({
          address: market.pt,
          abi: PENDLE_TOKEN_ABI,
          functionName: 'balanceOf',
          args: [address],
        });
        if (ptBalance > 0n) return true;

        // Check YT balance
        const ytBalance = await client.readContract({
          address: market.yt,
          abi: PENDLE_TOKEN_ABI,
          functionName: 'balanceOf',
          args: [address],
        });
        if (ytBalance > 0n) return true;

        // Check LP balance
        const lpBalance = await client.readContract({
          address: market.address,
          abi: PENDLE_MARKET_ABI,
          functionName: 'balanceOf',
          args: [address],
        });
        if (lpBalance > 0n) return true;
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
    const markets = PENDLE_MARKETS[chainId];
    if (!markets) return [];

    const positions: Position[] = [];

    for (const market of markets) {
      try {
        // Fetch all balances in parallel
        const [ptBalance, ytBalance, lpBalance] = await Promise.all([
          client.readContract({
            address: market.pt,
            abi: PENDLE_TOKEN_ABI,
            functionName: 'balanceOf',
            args: [address],
          }),
          client.readContract({
            address: market.yt,
            abi: PENDLE_TOKEN_ABI,
            functionName: 'balanceOf',
            args: [address],
          }),
          client.readContract({
            address: market.address,
            abi: PENDLE_MARKET_ABI,
            functionName: 'balanceOf',
            args: [address],
          }),
        ]);

        // Add PT position if exists
        if (ptBalance > 0n) {
          positions.push({
            id: `pendle-pt-${chainId}-${market.pt}`,
            protocol: this.protocol,
            chainId,
            type: 'fixed-yield',
            tokens: [
              {
                address: market.pt,
                symbol: `PT-${market.underlying}`,
                decimals: 18,
                balance: ptBalance,
                balanceFormatted: formatUnits(ptBalance, 18),
                priceUsd: 0,
                valueUsd: 0,
              },
            ],
            valueUsd: 0,
            metadata: {
              marketName: market.name,
              underlying: market.underlying,
              maturity: market.maturity,
              positionType: 'principal',
            },
          });
        }

        // Add YT position if exists
        if (ytBalance > 0n) {
          positions.push({
            id: `pendle-yt-${chainId}-${market.yt}`,
            protocol: this.protocol,
            chainId,
            type: 'fixed-yield',
            tokens: [
              {
                address: market.yt,
                symbol: `YT-${market.underlying}`,
                decimals: 18,
                balance: ytBalance,
                balanceFormatted: formatUnits(ytBalance, 18),
                priceUsd: 0,
                valueUsd: 0,
              },
            ],
            valueUsd: 0,
            metadata: {
              marketName: market.name,
              underlying: market.underlying,
              maturity: market.maturity,
              positionType: 'yield',
            },
          });
        }

        // Add LP position if exists
        if (lpBalance > 0n) {
          positions.push({
            id: `pendle-lp-${chainId}-${market.address}`,
            protocol: this.protocol,
            chainId,
            type: 'liquidity',
            tokens: [
              {
                address: market.address,
                symbol: `LP-${market.underlying}`,
                decimals: 18,
                balance: lpBalance,
                balanceFormatted: formatUnits(lpBalance, 18),
                priceUsd: 0,
                valueUsd: 0,
              },
            ],
            valueUsd: 0,
            metadata: {
              marketName: market.name,
              underlying: market.underlying,
              maturity: market.maturity,
              positionType: 'liquidity',
            },
          });
        }
      } catch (error) {
        console.error(`Error fetching Pendle market ${market.name}:`, error);
      }
    }

    return positions;
  }

  async getYieldRates(
    client: PublicClient,
    chainId: ChainId
  ): Promise<YieldRate[]> {
    const addresses = PENDLE_ADDRESSES[chainId];
    const markets = PENDLE_MARKETS[chainId];
    if (!addresses || !markets) return [];

    const rates: YieldRate[] = [];

    for (const market of markets) {
      try {
        // Get implied yield from RouterStatic
        const impliedYield = await client.readContract({
          address: addresses.routerStatic,
          abi: PENDLE_ROUTER_STATIC_ABI,
          functionName: 'getPtImpliedYield',
          args: [market.address],
        });

        // Convert from 1e18 to percentage
        const apy = Number(impliedYield) / 1e18;

        rates.push({
          protocol: this.protocol.id,
          chainId,
          asset: market.pt,
          assetSymbol: `PT-${market.underlying}`,
          type: 'fixed-yield',
          apy,
          apr: apy, // For PT, APY and APR are effectively the same (fixed)
          metadata: {
            maturity: market.maturity,
            marketName: market.name,
          },
        });
      } catch (error) {
        console.error(`Error fetching Pendle yield for ${market.name}:`, error);
      }
    }

    return rates;
  }
}

export const pendleAdapter = new PendleAdapter();
