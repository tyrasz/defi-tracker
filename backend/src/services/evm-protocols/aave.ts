// Aave V3 Position Detection

import type { Address } from 'viem';
import { chainService, type EvmChainId } from '../chains';
import { pricingService } from '../pricing';
import { EvmPosition, PROTOCOLS, AAVE_V3_POOLS, ESTIMATED_APYS } from './types';

// Aave V3 Pool ABI (minimal for getUserAccountData)
const AAVE_POOL_ABI = [
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
 * Get Aave V3 positions for an address across all supported chains
 */
export async function getAavePositions(
  address: Address,
  chainIds?: EvmChainId[]
): Promise<EvmPosition[]> {
  const positions: EvmPosition[] = [];
  const targetChains = chainIds || (Object.keys(AAVE_V3_POOLS).map(Number) as EvmChainId[]);

  const chainPromises = targetChains.map(async (chainId) => {
    const poolAddress = AAVE_V3_POOLS[chainId];
    if (!poolAddress) return [];

    try {
      return await getAavePositionsForChain(address, chainId, poolAddress);
    } catch (error) {
      console.error(`Error fetching Aave positions on chain ${chainId}:`, error);
      return [];
    }
  });

  const results = await Promise.all(chainPromises);
  for (const chainPositions of results) {
    positions.push(...chainPositions);
  }

  return positions;
}

async function getAavePositionsForChain(
  address: Address,
  chainId: EvmChainId,
  poolAddress: Address
): Promise<EvmPosition[]> {
  const positions: EvmPosition[] = [];

  try {
    const client = chainService.getClient(chainId);
    const chainConfig = chainService.getConfig(chainId);

    // Get user account data from Aave Pool
    const accountData = await client.readContract({
      address: poolAddress,
      abi: AAVE_POOL_ABI,
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

    // Aave returns values in USD with 8 decimals
    const collateralUsd = Number(totalCollateralBase) / 1e8;
    const debtUsd = Number(totalDebtBase) / 1e8;
    const health = Number(healthFactor) / 1e18;

    // Only add positions if there's meaningful value
    if (collateralUsd > 1) {
      positions.push({
        id: `aave-v3-supply-${chainId}`,
        protocol: PROTOCOLS.aave,
        chainId,
        type: 'supply',
        tokens: [
          {
            address: poolAddress,
            symbol: 'AAVE_COLLATERAL',
            decimals: 8,
            balance: totalCollateralBase.toString(),
            balanceFormatted: collateralUsd.toFixed(2),
            priceUsd: 1, // Already in USD
            valueUsd: collateralUsd,
          },
        ],
        valueUsd: collateralUsd,
        healthFactor: health > 0 && health < 1e10 ? health : undefined,
        yield: {
          apy: ESTIMATED_APYS.aave.supply.usdc, // Average supply APY
        },
        metadata: {
          chainName: chainConfig.name,
          healthFactor: health,
        },
      });
    }

    if (debtUsd > 1) {
      positions.push({
        id: `aave-v3-borrow-${chainId}`,
        protocol: PROTOCOLS.aave,
        chainId,
        type: 'borrow',
        tokens: [
          {
            address: poolAddress,
            symbol: 'AAVE_DEBT',
            decimals: 8,
            balance: totalDebtBase.toString(),
            balanceFormatted: debtUsd.toFixed(2),
            priceUsd: 1, // Already in USD
            valueUsd: debtUsd,
          },
        ],
        valueUsd: -debtUsd, // Negative for debt
        yield: {
          apy: -ESTIMATED_APYS.aave.borrow.usdc, // Negative for cost
        },
        metadata: {
          chainName: chainConfig.name,
        },
      });
    }
  } catch (error) {
    // Silently fail - user may not have positions on this chain
    if (process.env.NODE_ENV === 'development') {
      console.debug(`No Aave positions on chain ${chainId}:`, error);
    }
  }

  return positions;
}
