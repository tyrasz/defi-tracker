import type { Address, PublicClient } from 'viem';
import { formatUnits } from 'viem';
import { BaseProtocolAdapter } from '../../base-adapter';
import type { ProtocolAddresses, YieldRate } from '../../types';
import type { ChainId } from '@/types/chain';
import type { Position } from '@/types/portfolio';
import type { ProtocolInfo } from '@/types/protocol';
import { YEARN_V3_VAULT_ABI } from './abi';
import { YEARN_V3_VAULTS } from './addresses';

export class YearnV3Adapter extends BaseProtocolAdapter {
  readonly protocol: ProtocolInfo = {
    id: 'yearn-v3',
    name: 'Yearn V3',
    category: 'yield-aggregator',
    website: 'https://yearn.fi',
    earnsYield: true,
  };

  readonly supportedChains: ChainId[] = [1, 42161];

  protected getAddresses(chainId: ChainId): ProtocolAddresses | null {
    const vaults = YEARN_V3_VAULTS[chainId];
    if (!vaults || vaults.length === 0) return null;
    return { vault: vaults[0].vault };
  }

  async hasPositions(
    client: PublicClient,
    address: Address,
    chainId: ChainId
  ): Promise<boolean> {
    const vaults = YEARN_V3_VAULTS[chainId];
    if (!vaults) return false;

    for (const vault of vaults) {
      try {
        const balance = await client.readContract({
          address: vault.vault,
          abi: YEARN_V3_VAULT_ABI,
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
    const vaults = YEARN_V3_VAULTS[chainId];
    if (!vaults) return [];

    const positions: Position[] = [];

    for (const vault of vaults) {
      try {
        const balance = await client.readContract({
          address: vault.vault,
          abi: YEARN_V3_VAULT_ABI,
          functionName: 'balanceOf',
          args: [address],
        });

        if (balance > 0n) {
          // Get underlying asset value
          let underlyingAssets = balance;
          try {
            underlyingAssets = await client.readContract({
              address: vault.vault,
              abi: YEARN_V3_VAULT_ABI,
              functionName: 'convertToAssets',
              args: [balance],
            });
          } catch {
            // Use 1:1 as fallback
          }

          const decimals = await this.getTokenDecimals(client, vault.asset);

          positions.push({
            id: `yearn-v3-${chainId}-${vault.vault}`,
            protocol: this.protocol,
            chainId,
            type: 'vault',
            tokens: [
              {
                address: vault.asset,
                symbol: vault.assetSymbol,
                decimals,
                balance: underlyingAssets,
                balanceFormatted: formatUnits(underlyingAssets, decimals),
                priceUsd: 0,
                valueUsd: 0,
              },
            ],
            valueUsd: 0,
            yield: vault.estimatedApy
              ? {
                  apy: vault.estimatedApy,
                  apr: vault.estimatedApy,
                }
              : undefined,
            metadata: {
              vaultName: vault.name,
              vaultAddress: vault.vault,
              shares: formatUnits(balance, decimals),
            },
          });
        }
      } catch (error) {
        console.error(`Error fetching Yearn vault ${vault.name}:`, error);
      }
    }

    return positions;
  }

  async getYieldRates(
    _client: PublicClient,
    chainId: ChainId
  ): Promise<YieldRate[]> {
    const vaults = YEARN_V3_VAULTS[chainId];
    if (!vaults) return [];

    return vaults
      .filter((v) => v.estimatedApy)
      .map((vault) => ({
        protocol: this.protocol.id,
        chainId,
        asset: vault.asset,
        assetSymbol: vault.assetSymbol,
        type: 'vault' as const,
        apy: vault.estimatedApy!,
        apr: vault.estimatedApy!,
      }));
  }
}
