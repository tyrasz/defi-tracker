import type { Address, PublicClient } from 'viem';
import { formatUnits } from 'viem';
import { BaseProtocolAdapter } from '../../base-adapter';
import type { ProtocolAddresses, YieldRate } from '../../types';
import type { ChainId } from '@/types/chain';
import type { Position } from '@/types/portfolio';
import type { ProtocolInfo } from '@/types/protocol';
import { COMPOUND_V3_COMET_ABI } from './abi';
import { COMPOUND_V3_MARKETS } from './addresses';

const SECONDS_PER_YEAR = 60 * 60 * 24 * 365;

export class CompoundV3Adapter extends BaseProtocolAdapter {
  readonly protocol: ProtocolInfo = {
    id: 'compound-v3',
    name: 'Compound V3',
    category: 'lending',
    website: 'https://compound.finance',
  };

  readonly supportedChains: ChainId[] = [1, 42161, 10, 8453];

  protected getAddresses(chainId: ChainId): ProtocolAddresses | null {
    const markets = COMPOUND_V3_MARKETS[chainId];
    if (!markets || markets.length === 0) return null;
    return { comet: markets[0].comet };
  }

  async hasPositions(
    client: PublicClient,
    address: Address,
    chainId: ChainId
  ): Promise<boolean> {
    const markets = COMPOUND_V3_MARKETS[chainId];
    if (!markets) return false;

    for (const market of markets) {
      try {
        const [supplyBalance, borrowBalance] = await Promise.all([
          client.readContract({
            address: market.comet,
            abi: COMPOUND_V3_COMET_ABI,
            functionName: 'balanceOf',
            args: [address],
          }),
          client.readContract({
            address: market.comet,
            abi: COMPOUND_V3_COMET_ABI,
            functionName: 'borrowBalanceOf',
            args: [address],
          }),
        ]);

        if (supplyBalance > 0n || borrowBalance > 0n) return true;
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
    const markets = COMPOUND_V3_MARKETS[chainId];
    if (!markets) return [];

    const positions: Position[] = [];

    for (const market of markets) {
      try {
        const [supplyBalance, borrowBalance, utilization] = await Promise.all([
          client.readContract({
            address: market.comet,
            abi: COMPOUND_V3_COMET_ABI,
            functionName: 'balanceOf',
            args: [address],
          }),
          client.readContract({
            address: market.comet,
            abi: COMPOUND_V3_COMET_ABI,
            functionName: 'borrowBalanceOf',
            args: [address],
          }),
          client.readContract({
            address: market.comet,
            abi: COMPOUND_V3_COMET_ABI,
            functionName: 'getUtilization',
          }),
        ]);

        const decimals = await this.getTokenDecimals(client, market.baseToken);

        if (supplyBalance > 0n) {
          const supplyRate = await client.readContract({
            address: market.comet,
            abi: COMPOUND_V3_COMET_ABI,
            functionName: 'getSupplyRate',
            args: [utilization],
          });

          const apy = (Number(supplyRate) * SECONDS_PER_YEAR) / 1e18;

          positions.push({
            id: `compound-v3-supply-${chainId}-${market.comet}`,
            protocol: this.protocol,
            chainId,
            type: 'supply',
            tokens: [
              {
                address: market.baseToken,
                symbol: market.baseSymbol,
                decimals,
                balance: supplyBalance,
                balanceFormatted: formatUnits(supplyBalance, decimals),
                priceUsd: 0,
                valueUsd: 0,
              },
            ],
            valueUsd: 0,
            yield: { apy, apr: apy },
          });
        }

        if (borrowBalance > 0n) {
          positions.push({
            id: `compound-v3-borrow-${chainId}-${market.comet}`,
            protocol: this.protocol,
            chainId,
            type: 'borrow',
            tokens: [
              {
                address: market.baseToken,
                symbol: market.baseSymbol,
                decimals,
                balance: borrowBalance,
                balanceFormatted: formatUnits(borrowBalance, decimals),
                priceUsd: 0,
                valueUsd: 0,
              },
            ],
            valueUsd: 0,
          });
        }

        // Check collateral positions
        const numAssets = await client.readContract({
          address: market.comet,
          abi: COMPOUND_V3_COMET_ABI,
          functionName: 'numAssets',
        });

        for (let i = 0; i < numAssets; i++) {
          const assetInfo = await client.readContract({
            address: market.comet,
            abi: COMPOUND_V3_COMET_ABI,
            functionName: 'getAssetInfo',
            args: [i],
          });

          const collateral = await client.readContract({
            address: market.comet,
            abi: COMPOUND_V3_COMET_ABI,
            functionName: 'userCollateral',
            args: [address, assetInfo.asset],
          });

          if (collateral[0] > 0n) {
            const assetDecimals = await this.getTokenDecimals(
              client,
              assetInfo.asset
            );
            const assetSymbol = await this.getTokenSymbol(
              client,
              assetInfo.asset
            );

            positions.push({
              id: `compound-v3-collateral-${chainId}-${market.comet}-${assetInfo.asset}`,
              protocol: this.protocol,
              chainId,
              type: 'collateral',
              tokens: [
                {
                  address: assetInfo.asset,
                  symbol: assetSymbol,
                  decimals: assetDecimals,
                  balance: BigInt(collateral[0]),
                  balanceFormatted: formatUnits(collateral[0], assetDecimals),
                  priceUsd: 0,
                  valueUsd: 0,
                },
              ],
              valueUsd: 0,
            });
          }
        }
      } catch (error) {
        console.error(
          `Error fetching Compound V3 positions for market ${market.comet}:`,
          error
        );
      }
    }

    return positions;
  }

  async getYieldRates(
    client: PublicClient,
    chainId: ChainId
  ): Promise<YieldRate[]> {
    const markets = COMPOUND_V3_MARKETS[chainId];
    if (!markets) return [];

    const rates: YieldRate[] = [];

    for (const market of markets) {
      try {
        const utilization = await client.readContract({
          address: market.comet,
          abi: COMPOUND_V3_COMET_ABI,
          functionName: 'getUtilization',
        });

        const supplyRate = await client.readContract({
          address: market.comet,
          abi: COMPOUND_V3_COMET_ABI,
          functionName: 'getSupplyRate',
          args: [utilization],
        });

        const apy = (Number(supplyRate) * SECONDS_PER_YEAR) / 1e18;

        rates.push({
          protocol: this.protocol.id,
          chainId,
          asset: market.baseToken,
          assetSymbol: market.baseSymbol,
          type: 'supply',
          apy,
          apr: apy,
        });
      } catch (error) {
        console.error(
          `Error fetching Compound V3 yield rate for ${market.baseSymbol}:`,
          error
        );
      }
    }

    return rates;
  }
}
