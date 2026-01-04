import type { Address, PublicClient } from 'viem';
import { formatUnits } from 'viem';
import { BaseProtocolAdapter } from '../../base-adapter';
import type { ProtocolAddresses, YieldRate } from '../../types';
import type { ChainId } from '@/types/chain';
import type { Position } from '@/types/portfolio';
import type { ProtocolInfo } from '@/types/protocol';
import { RETH_ABI } from './abi';
import { ROCKET_POOL_ADDRESSES, ROCKET_POOL_ESTIMATED_APR } from './addresses';

export class RocketPoolAdapter extends BaseProtocolAdapter {
  readonly protocol: ProtocolInfo = {
    id: 'rocket-pool',
    name: 'Rocket Pool',
    category: 'liquid-staking',
    website: 'https://rocketpool.net',
  };

  readonly supportedChains: ChainId[] = [1, 42161, 10, 8453];

  protected getAddresses(chainId: ChainId): ProtocolAddresses | null {
    const addresses = ROCKET_POOL_ADDRESSES[chainId];
    return addresses ? (addresses as unknown as ProtocolAddresses) : null;
  }

  async hasPositions(
    client: PublicClient,
    address: Address,
    chainId: ChainId
  ): Promise<boolean> {
    const addresses = ROCKET_POOL_ADDRESSES[chainId];
    if (!addresses) return false;

    try {
      const balance = await client.readContract({
        address: addresses.rETH,
        abi: RETH_ABI,
        functionName: 'balanceOf',
        args: [address],
      });

      return balance > 0n;
    } catch {
      return false;
    }
  }

  async getPositions(
    client: PublicClient,
    address: Address,
    chainId: ChainId
  ): Promise<Position[]> {
    const addresses = ROCKET_POOL_ADDRESSES[chainId];
    if (!addresses) return [];

    const positions: Position[] = [];

    try {
      const rETHBalance = await client.readContract({
        address: addresses.rETH,
        abi: RETH_ABI,
        functionName: 'balanceOf',
        args: [address],
      });

      if (rETHBalance > 0n) {
        // Get underlying ETH value
        let underlyingETH = rETHBalance;
        try {
          underlyingETH = await client.readContract({
            address: addresses.rETH,
            abi: RETH_ABI,
            functionName: 'getEthValue',
            args: [rETHBalance],
          });
        } catch {
          // Use 1:1 as fallback
        }

        positions.push({
          id: `rocket-pool-reth-${chainId}`,
          protocol: this.protocol,
          chainId,
          type: 'stake',
          tokens: [
            {
              address: addresses.rETH,
              symbol: 'rETH',
              decimals: 18,
              balance: rETHBalance,
              balanceFormatted: formatUnits(rETHBalance, 18),
              priceUsd: 0,
              valueUsd: 0,
            },
          ],
          valueUsd: 0,
          yield: {
            apy: ROCKET_POOL_ESTIMATED_APR,
            apr: ROCKET_POOL_ESTIMATED_APR,
          },
          metadata: {
            underlyingETH: formatUnits(underlyingETH, 18),
          },
        });
      }
    } catch (error) {
      console.error('Error fetching Rocket Pool positions:', error);
    }

    return positions;
  }

  async getYieldRates(
    client: PublicClient,
    chainId: ChainId
  ): Promise<YieldRate[]> {
    const addresses = ROCKET_POOL_ADDRESSES[chainId];
    if (!addresses) return [];

    return [
      {
        protocol: this.protocol.id,
        chainId,
        asset: addresses.rETH,
        assetSymbol: 'rETH',
        type: 'stake',
        apy: ROCKET_POOL_ESTIMATED_APR,
        apr: ROCKET_POOL_ESTIMATED_APR,
      },
    ];
  }
}
