import type { Address, PublicClient } from 'viem';
import { formatUnits } from 'viem';
import { BaseProtocolAdapter } from '../../base-adapter';
import type { ProtocolAddresses, YieldRate } from '../../types';
import type { ChainId } from '@/types/chain';
import type { Position } from '@/types/portfolio';
import type { ProtocolInfo } from '@/types/protocol';
import { STETH_ABI, WSTETH_ABI } from './abi';
import { LIDO_ADDRESSES, LIDO_ESTIMATED_APR } from './addresses';

export class LidoAdapter extends BaseProtocolAdapter {
  readonly protocol: ProtocolInfo = {
    id: 'lido',
    name: 'Lido',
    category: 'liquid-staking',
    website: 'https://lido.fi',
    earnsYield: true,
  };

  readonly supportedChains: ChainId[] = [1, 42161, 10, 8453];

  protected getAddresses(chainId: ChainId): ProtocolAddresses | null {
    const addresses = LIDO_ADDRESSES[chainId];
    return addresses ? (addresses as unknown as ProtocolAddresses) : null;
  }

  async hasPositions(
    client: PublicClient,
    address: Address,
    chainId: ChainId
  ): Promise<boolean> {
    const addresses = LIDO_ADDRESSES[chainId];
    if (!addresses) return false;

    try {
      const balances = await Promise.all([
        addresses.stETH !== '0x0000000000000000000000000000000000000000'
          ? client.readContract({
              address: addresses.stETH,
              abi: STETH_ABI,
              functionName: 'balanceOf',
              args: [address],
            })
          : 0n,
        client.readContract({
          address: addresses.wstETH,
          abi: WSTETH_ABI,
          functionName: 'balanceOf',
          args: [address],
        }),
      ]);

      return balances[0] > 0n || balances[1] > 0n;
    } catch {
      return false;
    }
  }

  async getPositions(
    client: PublicClient,
    address: Address,
    chainId: ChainId
  ): Promise<Position[]> {
    const addresses = LIDO_ADDRESSES[chainId];
    if (!addresses) return [];

    const positions: Position[] = [];

    try {
      // Check stETH balance (only on Ethereum mainnet)
      if (
        chainId === 1 &&
        addresses.stETH !== '0x0000000000000000000000000000000000000000'
      ) {
        const stETHBalance = await client.readContract({
          address: addresses.stETH,
          abi: STETH_ABI,
          functionName: 'balanceOf',
          args: [address],
        });

        if (stETHBalance > 0n) {
          positions.push({
            id: `lido-steth-${chainId}`,
            protocol: this.protocol,
            chainId,
            type: 'stake',
            tokens: [
              {
                address: addresses.stETH,
                symbol: 'stETH',
                decimals: 18,
                balance: stETHBalance,
                balanceFormatted: formatUnits(stETHBalance, 18),
                priceUsd: 0,
                valueUsd: 0,
              },
            ],
            valueUsd: 0,
            yield: {
              apy: LIDO_ESTIMATED_APR,
              apr: LIDO_ESTIMATED_APR,
            },
          });
        }
      }

      // Check wstETH balance
      const wstETHBalance = await client.readContract({
        address: addresses.wstETH,
        abi: WSTETH_ABI,
        functionName: 'balanceOf',
        args: [address],
      });

      if (wstETHBalance > 0n) {
        // Get the underlying stETH value
        let underlyingStETH = wstETHBalance;
        try {
          underlyingStETH = await client.readContract({
            address: addresses.wstETH,
            abi: WSTETH_ABI,
            functionName: 'getStETHByWstETH',
            args: [wstETHBalance],
          });
        } catch {
          // Use 1:1 as fallback
        }

        positions.push({
          id: `lido-wsteth-${chainId}`,
          protocol: this.protocol,
          chainId,
          type: 'stake',
          tokens: [
            {
              address: addresses.wstETH,
              symbol: 'wstETH',
              decimals: 18,
              balance: wstETHBalance,
              balanceFormatted: formatUnits(wstETHBalance, 18),
              priceUsd: 0,
              valueUsd: 0,
            },
          ],
          valueUsd: 0,
          yield: {
            apy: LIDO_ESTIMATED_APR,
            apr: LIDO_ESTIMATED_APR,
          },
          metadata: {
            underlyingStETH: formatUnits(underlyingStETH, 18),
          },
        });
      }
    } catch (error) {
      console.error('Error fetching Lido positions:', error);
    }

    return positions;
  }

  async getYieldRates(
    client: PublicClient,
    chainId: ChainId
  ): Promise<YieldRate[]> {
    const addresses = LIDO_ADDRESSES[chainId];
    if (!addresses) return [];

    // Lido yields the same APR across all chains for stETH/wstETH
    return [
      {
        protocol: this.protocol.id,
        chainId,
        asset: addresses.wstETH,
        assetSymbol: 'wstETH',
        type: 'stake',
        apy: LIDO_ESTIMATED_APR,
        apr: LIDO_ESTIMATED_APR,
      },
    ];
  }
}
