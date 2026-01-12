// Spark Protocol Position Detection (Aave V3 fork on Ethereum)

import type { Address } from 'viem';
import { chainService, type EvmChainId } from '../chains';
import { EvmPosition, PROTOCOLS, SPARK_POOL, ESTIMATED_APYS } from './types';

// Spark uses same ABI as Aave V3 (it's a fork)
const SPARK_POOL_ABI = [
  {
    name: 'getUserAccountData',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [
      { name: 'totalCollateralBase', type: 'uint256' },
      { name: 'totalDebtBase', type: 'uint256' },
      { name: 'availableBorrowsBase', type: 'uint256' },
      { name: 'currentLiquidationThreshold', type: 'uint256' },
      { name: 'ltv', type: 'uint256' },
      { name: 'healthFactor', type: 'uint256' },
    ],
  },
] as const;

/**
 * Get Spark positions (Ethereum mainnet only)
 */
export async function getSparkPositions(
  address: Address,
  chainIds?: EvmChainId[]
): Promise<EvmPosition[]> {
  const positions: EvmPosition[] = [];

  // Spark is only on Ethereum mainnet
  if (chainIds && !chainIds.includes(1)) {
    return positions;
  }

  try {
    const client = chainService.getClient(1);

    const accountData = await client.readContract({
      address: SPARK_POOL,
      abi: SPARK_POOL_ABI,
      functionName: 'getUserAccountData',
      args: [address],
    });

    const [
      totalCollateralBase,
      totalDebtBase,
      _availableBorrowsBase,
      _currentLiquidationThreshold,
      _ltv,
      healthFactor,
    ] = accountData;

    // Spark returns values in USD with 8 decimals
    const collateralUsd = Number(totalCollateralBase) / 1e8;
    const debtUsd = Number(totalDebtBase) / 1e8;
    const health = Number(healthFactor) / 1e18;

    if (collateralUsd > 1) {
      positions.push({
        id: 'spark-supply',
        protocol: PROTOCOLS.spark,
        chainId: 1,
        type: 'supply',
        tokens: [
          {
            address: SPARK_POOL,
            symbol: 'SPARK_COLLATERAL',
            decimals: 8,
            balance: totalCollateralBase.toString(),
            balanceFormatted: collateralUsd.toFixed(2),
            priceUsd: 1,
            valueUsd: collateralUsd,
          },
        ],
        valueUsd: collateralUsd,
        healthFactor: health > 0 && health < 1e10 ? health : undefined,
        yield: {
          apy: ESTIMATED_APYS.spark.supply.dai,
        },
        metadata: {
          healthFactor: health,
        },
      });
    }

    if (debtUsd > 1) {
      positions.push({
        id: 'spark-borrow',
        protocol: PROTOCOLS.spark,
        chainId: 1,
        type: 'borrow',
        tokens: [
          {
            address: SPARK_POOL,
            symbol: 'SPARK_DEBT',
            decimals: 8,
            balance: totalDebtBase.toString(),
            balanceFormatted: debtUsd.toFixed(2),
            priceUsd: 1,
            valueUsd: debtUsd,
          },
        ],
        valueUsd: -debtUsd,
        yield: {
          apy: -ESTIMATED_APYS.spark.borrow.dai,
        },
      });
    }
  } catch (error) {
    // User may not have Spark positions
    if (process.env.NODE_ENV === 'development') {
      console.debug('No Spark positions:', error);
    }
  }

  return positions;
}
