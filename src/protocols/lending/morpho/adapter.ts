import type { Address, PublicClient } from 'viem';
import { formatUnits } from 'viem';
import { BaseProtocolAdapter } from '../../base-adapter';
import type { YieldRate } from '../../types';
import type { ChainId } from '@/types/chain';
import type { Position } from '@/types/portfolio';
import type { ProtocolInfo } from '@/types/protocol';
import { MORPHO_ADDRESSES } from './addresses';
import { META_MORPHO_ABI } from './abi';

export class MorphoAdapter extends BaseProtocolAdapter {
  readonly protocol: ProtocolInfo = {
    id: 'morpho',
    name: 'Morpho',
    category: 'lending',
    website: 'https://morpho.org',
  };

  readonly supportedChains: ChainId[] = [1, 8453]; // Ethereum and Base

  protected getAddresses(chainId: ChainId) {
    return MORPHO_ADDRESSES[chainId] || null;
  }

  async hasPositions(
    client: PublicClient,
    address: Address,
    chainId: ChainId
  ): Promise<boolean> {
    const config = MORPHO_ADDRESSES[chainId];
    if (!config) return false;

    try {
      // Check first few vaults for balance
      const checkVaults = config.vaults.slice(0, 3);
      const results = await Promise.all(
        checkVaults.map((vault) =>
          client.readContract({
            address: vault.address,
            abi: META_MORPHO_ABI,
            functionName: 'balanceOf',
            args: [address],
          })
        )
      );

      return results.some((balance) => balance > 0n);
    } catch {
      return false;
    }
  }

  async getPositions(
    client: PublicClient,
    address: Address,
    chainId: ChainId
  ): Promise<Position[]> {
    const config = MORPHO_ADDRESSES[chainId];
    if (!config) return [];

    const positions: Position[] = [];

    try {
      // Check all vaults for balances
      const balanceResults = await Promise.all(
        config.vaults.map((vault) =>
          client.readContract({
            address: vault.address,
            abi: META_MORPHO_ABI,
            functionName: 'balanceOf',
            args: [address],
          })
        )
      );

      // Filter vaults with non-zero balance
      const activeVaults = config.vaults.filter(
        (_, i) => balanceResults[i] > 0n
      );
      const activeBalances = balanceResults.filter((balance) => balance > 0n);

      if (activeVaults.length === 0) return [];

      // Get underlying amounts
      const underlyingAmounts = await Promise.all(
        activeVaults.map((vault, i) =>
          client.readContract({
            address: vault.address,
            abi: META_MORPHO_ABI,
            functionName: 'convertToAssets',
            args: [activeBalances[i]],
          })
        )
      );

      // Create positions
      for (let i = 0; i < activeVaults.length; i++) {
        const vault = activeVaults[i];
        const balance = activeBalances[i];
        const underlyingAmount = underlyingAmounts[i];

        const assetDecimals = await this.getTokenDecimals(client, vault.asset);
        const assetSymbol = await this.getTokenSymbol(client, vault.asset);

        positions.push({
          id: `morpho-${vault.symbol.toLowerCase()}-${chainId}`,
          protocol: this.protocol,
          chainId,
          type: 'supply',
          tokens: [
            {
              address: vault.address,
              symbol: vault.symbol,
              decimals: 18,
              balance: balance,
              balanceFormatted: formatUnits(balance, 18),
              priceUsd: 0,
              valueUsd: 0,
            },
          ],
          valueUsd: 0,
          metadata: {
            vaultName: vault.name,
            underlyingAsset: vault.asset,
            underlyingSymbol: assetSymbol,
            underlyingAmount: formatUnits(underlyingAmount, assetDecimals),
          },
        });
      }
    } catch (error) {
      console.error('Error fetching Morpho positions:', error);
    }

    return positions;
  }

  async getYieldRates(
    client: PublicClient,
    chainId: ChainId
  ): Promise<YieldRate[]> {
    const config = MORPHO_ADDRESSES[chainId];
    if (!config) return [];

    const rates: YieldRate[] = [];

    // MetaMorpho vaults don't expose APY on-chain
    // Would need to calculate from historical data or use an oracle
    // Return empty for now - can be enhanced with off-chain data

    return rates;
  }
}

export const morphoAdapter = new MorphoAdapter();
