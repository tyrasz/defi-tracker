import type { Address, PublicClient } from 'viem';
import { formatUnits } from 'viem';
import { BaseProtocolAdapter } from '../../base-adapter';
import type { ProtocolAddresses, YieldRate } from '../../types';
import type { ChainId } from '@/types/chain';
import type { Position } from '@/types/portfolio';
import type { ProtocolInfo } from '@/types/protocol';
import { AAVE_V3_POOL_ABI, AAVE_V3_DATA_PROVIDER_ABI } from './abi';
import { AAVE_V3_ADDRESSES } from './addresses';

interface AaveAddresses extends ProtocolAddresses {
  pool: Address;
  dataProvider: Address;
}

export class AaveV3Adapter extends BaseProtocolAdapter {
  readonly protocol: ProtocolInfo = {
    id: 'aave-v3',
    name: 'Aave V3',
    category: 'lending',
    website: 'https://aave.com',
    earnsYield: true,
  };

  readonly supportedChains: ChainId[] = [1, 42161, 10, 8453];

  protected getAddresses(chainId: ChainId): AaveAddresses | null {
    const addresses = AAVE_V3_ADDRESSES[chainId];
    return addresses ? (addresses as AaveAddresses) : null;
  }

  async hasPositions(
    client: PublicClient,
    address: Address,
    chainId: ChainId
  ): Promise<boolean> {
    const addresses = this.getAddresses(chainId);
    if (!addresses) return false;

    try {
      const result = await client.readContract({
        address: addresses.pool,
        abi: AAVE_V3_POOL_ABI,
        functionName: 'getUserAccountData',
        args: [address],
      });

      const [totalCollateral, totalDebt] = result;
      return totalCollateral > 0n || totalDebt > 0n;
    } catch {
      return false;
    }
  }

  async getPositions(
    client: PublicClient,
    address: Address,
    chainId: ChainId
  ): Promise<Position[]> {
    const addresses = this.getAddresses(chainId);
    if (!addresses) return [];

    const positions: Position[] = [];

    try {
      const reservesList = (await client.readContract({
        address: addresses.dataProvider,
        abi: AAVE_V3_DATA_PROVIDER_ABI,
        functionName: 'getAllReservesTokens',
      })) as Array<{ symbol: string; tokenAddress: Address }>;

      const userReserveDataCalls = reservesList.map((reserve) => ({
        address: addresses.dataProvider,
        abi: AAVE_V3_DATA_PROVIDER_ABI,
        functionName: 'getUserReserveData' as const,
        args: [reserve.tokenAddress, address] as const,
      }));

      const userReserveResults = await client.multicall({
        contracts: userReserveDataCalls,
      });

      let healthFactor = 0;
      try {
        const accountData = await client.readContract({
          address: addresses.pool,
          abi: AAVE_V3_POOL_ABI,
          functionName: 'getUserAccountData',
          args: [address],
        });
        healthFactor = Number(formatUnits(accountData[5], 18));
      } catch {
        // Ignore health factor errors
      }

      for (let i = 0; i < reservesList.length; i++) {
        const { symbol, tokenAddress } = reservesList[i];
        const result = userReserveResults[i];

        if (result.status !== 'success') continue;

        const [
          currentATokenBalance,
          currentStableDebt,
          currentVariableDebt,
          ,
          ,
          ,
          liquidityRate,
          ,
          usageAsCollateralEnabled,
        ] = result.result as [
          bigint,
          bigint,
          bigint,
          bigint,
          bigint,
          bigint,
          bigint,
          number,
          boolean
        ];

        const decimals = await this.getTokenDecimals(client, tokenAddress);

        if (currentATokenBalance > 0n) {
          const supplyApy = this.rayToPercent(liquidityRate);

          positions.push({
            id: `aave-v3-supply-${chainId}-${tokenAddress}`,
            protocol: this.protocol,
            chainId,
            type: usageAsCollateralEnabled ? 'collateral' : 'supply',
            tokens: [
              {
                address: tokenAddress,
                symbol,
                decimals,
                balance: currentATokenBalance,
                balanceFormatted: formatUnits(currentATokenBalance, decimals),
                priceUsd: 0,
                valueUsd: 0,
              },
            ],
            valueUsd: 0,
            yield: {
              apy: supplyApy,
              apr: supplyApy,
            },
            healthFactor: healthFactor > 0 ? healthFactor : undefined,
          });
        }

        if (currentVariableDebt > 0n) {
          positions.push({
            id: `aave-v3-borrow-variable-${chainId}-${tokenAddress}`,
            protocol: this.protocol,
            chainId,
            type: 'borrow',
            tokens: [
              {
                address: tokenAddress,
                symbol,
                decimals,
                balance: currentVariableDebt,
                balanceFormatted: formatUnits(currentVariableDebt, decimals),
                priceUsd: 0,
                valueUsd: 0,
              },
            ],
            valueUsd: 0,
            healthFactor: healthFactor > 0 ? healthFactor : undefined,
          });
        }

        if (currentStableDebt > 0n) {
          positions.push({
            id: `aave-v3-borrow-stable-${chainId}-${tokenAddress}`,
            protocol: this.protocol,
            chainId,
            type: 'borrow',
            tokens: [
              {
                address: tokenAddress,
                symbol,
                decimals,
                balance: currentStableDebt,
                balanceFormatted: formatUnits(currentStableDebt, decimals),
                priceUsd: 0,
                valueUsd: 0,
              },
            ],
            valueUsd: 0,
            healthFactor: healthFactor > 0 ? healthFactor : undefined,
          });
        }
      }
    } catch (error) {
      console.error('Error fetching Aave V3 positions:', error);
    }

    return positions;
  }

  async getYieldRates(
    client: PublicClient,
    chainId: ChainId
  ): Promise<YieldRate[]> {
    const addresses = this.getAddresses(chainId);
    if (!addresses) return [];

    const rates: YieldRate[] = [];

    try {
      const reservesList = (await client.readContract({
        address: addresses.dataProvider,
        abi: AAVE_V3_DATA_PROVIDER_ABI,
        functionName: 'getAllReservesTokens',
      })) as Array<{ symbol: string; tokenAddress: Address }>;

      const reserveDataCalls = reservesList.map((reserve) => ({
        address: addresses.dataProvider,
        abi: AAVE_V3_DATA_PROVIDER_ABI,
        functionName: 'getReserveData' as const,
        args: [reserve.tokenAddress] as const,
      }));

      const results = await client.multicall({ contracts: reserveDataCalls });

      for (let i = 0; i < reservesList.length; i++) {
        const { symbol, tokenAddress } = reservesList[i];
        const result = results[i];

        if (result.status !== 'success') continue;

        const resultArray = result.result as readonly unknown[];
        const liquidityRate = resultArray[5] as bigint;
        const supplyApy = this.rayToPercent(liquidityRate);

        rates.push({
          protocol: this.protocol.id,
          chainId,
          asset: tokenAddress,
          assetSymbol: symbol,
          type: 'supply',
          apy: supplyApy,
          apr: supplyApy,
        });
      }
    } catch (error) {
      console.error('Error fetching Aave V3 yield rates:', error);
    }

    return rates;
  }

  private rayToPercent(ray: bigint): number {
    return Number(ray) / 1e27;
  }
}
