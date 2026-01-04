import type { Address, PublicClient } from 'viem';
import { formatUnits } from 'viem';
import { BaseProtocolAdapter } from '../../base-adapter';
import type { ProtocolAddresses, YieldRate } from '../../types';
import type { ChainId } from '@/types/chain';
import type { Position } from '@/types/portfolio';
import type { ProtocolInfo } from '@/types/protocol';
import { CURVE_LP_TOKEN_ABI, CURVE_GAUGE_ABI } from './abi';
import { CURVE_ADDRESSES, CURVE_POPULAR_POOLS } from './addresses';

export class CurveAdapter extends BaseProtocolAdapter {
  readonly protocol: ProtocolInfo = {
    id: 'curve',
    name: 'Curve Finance',
    category: 'dex',
    website: 'https://curve.fi',
  };

  readonly supportedChains: ChainId[] = [1, 42161, 10];

  protected getAddresses(chainId: ChainId): ProtocolAddresses | null {
    const addresses = CURVE_ADDRESSES[chainId];
    return addresses ? (addresses as unknown as ProtocolAddresses) : null;
  }

  async hasPositions(
    client: PublicClient,
    address: Address,
    chainId: ChainId
  ): Promise<boolean> {
    const pools = CURVE_POPULAR_POOLS[chainId];
    if (!pools) return false;

    for (const pool of pools) {
      try {
        const balances = await Promise.all([
          client.readContract({
            address: pool.lpToken,
            abi: CURVE_LP_TOKEN_ABI,
            functionName: 'balanceOf',
            args: [address],
          }),
          pool.gauge
            ? client.readContract({
                address: pool.gauge,
                abi: CURVE_GAUGE_ABI,
                functionName: 'balanceOf',
                args: [address],
              })
            : 0n,
        ]);

        if (balances[0] > 0n || balances[1] > 0n) return true;
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
    const pools = CURVE_POPULAR_POOLS[chainId];
    if (!pools) return [];

    const positions: Position[] = [];

    for (const pool of pools) {
      try {
        // Check LP token balance
        const lpBalance = await client.readContract({
          address: pool.lpToken,
          abi: CURVE_LP_TOKEN_ABI,
          functionName: 'balanceOf',
          args: [address],
        });

        if (lpBalance > 0n) {
          positions.push({
            id: `curve-lp-${chainId}-${pool.lpToken}`,
            protocol: this.protocol,
            chainId,
            type: 'liquidity',
            tokens: [
              {
                address: pool.lpToken,
                symbol: pool.symbol,
                decimals: 18,
                balance: lpBalance,
                balanceFormatted: formatUnits(lpBalance, 18),
                priceUsd: 0,
                valueUsd: 0,
              },
            ],
            valueUsd: 0,
            metadata: {
              poolName: pool.name,
              staked: false,
            },
          });
        }

        // Check gauge (staked) balance
        if (pool.gauge) {
          const gaugeBalance = await client.readContract({
            address: pool.gauge,
            abi: CURVE_GAUGE_ABI,
            functionName: 'balanceOf',
            args: [address],
          });

          if (gaugeBalance > 0n) {
            positions.push({
              id: `curve-gauge-${chainId}-${pool.gauge}`,
              protocol: this.protocol,
              chainId,
              type: 'stake',
              tokens: [
                {
                  address: pool.lpToken,
                  symbol: pool.symbol,
                  decimals: 18,
                  balance: gaugeBalance,
                  balanceFormatted: formatUnits(gaugeBalance, 18),
                  priceUsd: 0,
                  valueUsd: 0,
                },
              ],
              valueUsd: 0,
              metadata: {
                poolName: pool.name,
                gauge: pool.gauge,
                staked: true,
              },
            });
          }
        }
      } catch (error) {
        console.error(`Error fetching Curve pool ${pool.name}:`, error);
      }
    }

    return positions;
  }

  async getYieldRates(
    _client: PublicClient,
    _chainId: ChainId
  ): Promise<YieldRate[]> {
    // Curve yields vary by pool and include trading fees + CRV rewards
    // Would need to fetch from gauges and calculate based on emissions
    return [];
  }
}
