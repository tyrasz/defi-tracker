import type { Address, PublicClient } from 'viem';
import { formatUnits } from 'viem';
import { BaseProtocolAdapter } from '../../base-adapter';
import type { YieldRate } from '../../types';
import type { ChainId } from '@/types/chain';
import type { Position } from '@/types/portfolio';
import type { ProtocolInfo } from '@/types/protocol';
import { CONVEX_ADDRESSES } from './addresses';
import { BOOSTER_ABI, BASE_REWARD_POOL_ABI, CVX_LOCKER_ABI } from './abi';

export class ConvexAdapter extends BaseProtocolAdapter {
  readonly protocol: ProtocolInfo = {
    id: 'convex',
    name: 'Convex Finance',
    category: 'yield-aggregator',
    website: 'https://www.convexfinance.com',
  };

  readonly supportedChains: ChainId[] = [1]; // Ethereum mainnet only

  protected getAddresses(chainId: ChainId) {
    return CONVEX_ADDRESSES[chainId] || null;
  }

  async hasPositions(
    client: PublicClient,
    address: Address,
    chainId: ChainId
  ): Promise<boolean> {
    const config = CONVEX_ADDRESSES[chainId];
    if (!config) return false;

    try {
      // Check CVX staking and locked CVX
      const [stakedCvx, lockedCvx] = await Promise.all([
        client.readContract({
          address: config.cvxRewardPool,
          abi: BASE_REWARD_POOL_ABI,
          functionName: 'balanceOf',
          args: [address],
        }),
        client.readContract({
          address: config.cvxLockerV2,
          abi: CVX_LOCKER_ABI,
          functionName: 'lockedBalanceOf',
          args: [address],
        }),
      ]);

      if (stakedCvx > 0n || lockedCvx > 0n) return true;

      // Check first 10 LP pools
      const poolLength = await client.readContract({
        address: config.booster,
        abi: BOOSTER_ABI,
        functionName: 'poolLength',
      });

      const checkPools = Math.min(Number(poolLength), 10);
      for (let i = 0; i < checkPools; i++) {
        try {
          const poolInfo = await client.readContract({
            address: config.booster,
            abi: BOOSTER_ABI,
            functionName: 'poolInfo',
            args: [BigInt(i)],
          });

          const balance = await client.readContract({
            address: poolInfo[3], // crvRewards
            abi: BASE_REWARD_POOL_ABI,
            functionName: 'balanceOf',
            args: [address],
          });

          if (balance > 0n) return true;
        } catch {
          continue;
        }
      }

      return false;
    } catch {
      return false;
    }
  }

  async getPositions(
    client: PublicClient,
    address: Address,
    chainId: ChainId
  ): Promise<Position[]> {
    const config = CONVEX_ADDRESSES[chainId];
    if (!config) return [];

    const positions: Position[] = [];

    try {
      // Check staked CVX
      const stakedCvx = await client.readContract({
        address: config.cvxRewardPool,
        abi: BASE_REWARD_POOL_ABI,
        functionName: 'balanceOf',
        args: [address],
      });

      if (stakedCvx > 0n) {
        const earnedCrv = await client.readContract({
          address: config.cvxRewardPool,
          abi: BASE_REWARD_POOL_ABI,
          functionName: 'earned',
          args: [address],
        });

        positions.push({
          id: `convex-staked-cvx-${chainId}`,
          protocol: this.protocol,
          chainId,
          type: 'stake',
          tokens: [
            {
              address: config.cvx,
              symbol: 'CVX',
              decimals: 18,
              balance: stakedCvx,
              balanceFormatted: formatUnits(stakedCvx, 18),
              priceUsd: 0,
              valueUsd: 0,
            },
          ],
          valueUsd: 0,
          metadata: {
            pendingRewards: formatUnits(earnedCrv, 18) + ' CRV',
          },
        });
      }

      // Check locked CVX (vlCVX)
      const lockedCvx = await client.readContract({
        address: config.cvxLockerV2,
        abi: CVX_LOCKER_ABI,
        functionName: 'lockedBalanceOf',
        args: [address],
      });

      if (lockedCvx > 0n) {
        positions.push({
          id: `convex-locked-cvx-${chainId}`,
          protocol: this.protocol,
          chainId,
          type: 'locked',
          tokens: [
            {
              address: config.cvx,
              symbol: 'vlCVX',
              decimals: 18,
              balance: lockedCvx,
              balanceFormatted: formatUnits(lockedCvx, 18),
              priceUsd: 0,
              valueUsd: 0,
            },
          ],
          valueUsd: 0,
          metadata: {
            lockType: 'vote-locked',
          },
        });
      }

      // Check LP pools (first 20)
      const poolLength = await client.readContract({
        address: config.booster,
        abi: BOOSTER_ABI,
        functionName: 'poolLength',
      });

      const checkPools = Math.min(Number(poolLength), 20);

      for (let i = 0; i < checkPools; i++) {
        try {
          const poolInfo = await client.readContract({
            address: config.booster,
            abi: BOOSTER_ABI,
            functionName: 'poolInfo',
            args: [BigInt(i)],
          });

          if (poolInfo[5]) continue; // Skip shutdown pools

          const balance = await client.readContract({
            address: poolInfo[3], // crvRewards
            abi: BASE_REWARD_POOL_ABI,
            functionName: 'balanceOf',
            args: [address],
          });

          if (balance > 0n) {
            const lpSymbol = await this.getTokenSymbol(client, poolInfo[0]);
            const earned = await client.readContract({
              address: poolInfo[3],
              abi: BASE_REWARD_POOL_ABI,
              functionName: 'earned',
              args: [address],
            });

            positions.push({
              id: `convex-lp-${i}-${chainId}`,
              protocol: this.protocol,
              chainId,
              type: 'farm',
              tokens: [
                {
                  address: poolInfo[0], // LP token
                  symbol: lpSymbol || `cvx-LP-${i}`,
                  decimals: 18,
                  balance: balance,
                  balanceFormatted: formatUnits(balance, 18),
                  priceUsd: 0,
                  valueUsd: 0,
                },
              ],
              valueUsd: 0,
              metadata: {
                poolId: i,
                pendingRewards: formatUnits(earned, 18) + ' CRV',
              },
            });
          }
        } catch {
          continue;
        }
      }
    } catch (error) {
      console.error('Error fetching Convex positions:', error);
    }

    return positions;
  }

  async getYieldRates(
    _client: PublicClient,
    _chainId: ChainId
  ): Promise<YieldRate[]> {
    // Convex APY varies per pool and includes CRV + CVX rewards
    // Would need off-chain data for accurate rates
    return [];
  }
}

export const convexAdapter = new ConvexAdapter();
