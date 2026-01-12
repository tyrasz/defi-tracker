// Morpho Blue Position Detection

import type { Address } from 'viem';
import { chainService, type EvmChainId } from '../chains';
import { pricingService } from '../pricing';
import { EvmPosition, PROTOCOLS, MORPHO_BLUE, ESTIMATED_APYS } from './types';

// Morpho Blue ABI (simplified - checking position via idToMarketParams and position)
const MORPHO_BLUE_ABI = [
  {
    name: 'position',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'id', type: 'bytes32' },
      { name: 'user', type: 'address' },
    ],
    outputs: [
      { name: 'supplyShares', type: 'uint256' },
      { name: 'borrowShares', type: 'uint128' },
      { name: 'collateral', type: 'uint128' },
    ],
  },
] as const;

// Known Morpho Blue market IDs (major markets)
const MORPHO_MARKETS: Record<string, { id: `0x${string}`; name: string; decimals: number }> = {
  // Ethereum mainnet markets
  'wstETH/USDC': {
    id: '0xb323495f7e4148be5643a4ea4a8221eef163e4bccfdedc2a6f4696baacbc86cc',
    name: 'wstETH/USDC',
    decimals: 6,
  },
  'wstETH/WETH': {
    id: '0xc54d7acf14de29e0e5527cabd7a576506870346a78a11a6762e2cca66322ec41',
    name: 'wstETH/WETH',
    decimals: 18,
  },
  'WBTC/USDC': {
    id: '0x3a85e619751152991742810df6ec69ce473daef99e28a64ab2340d7b7ccfee49',
    name: 'WBTC/USDC',
    decimals: 6,
  },
};

/**
 * Get Morpho Blue positions
 */
export async function getMorphoPositions(
  address: Address,
  chainIds?: EvmChainId[]
): Promise<EvmPosition[]> {
  const positions: EvmPosition[] = [];
  const targetChains = chainIds || (Object.keys(MORPHO_BLUE).map(Number) as EvmChainId[]);

  for (const chainId of targetChains) {
    const morphoAddress = MORPHO_BLUE[chainId];
    if (!morphoAddress) continue;

    try {
      const chainPositions = await getMorphoPositionsForChain(address, chainId, morphoAddress);
      positions.push(...chainPositions);
    } catch (error) {
      console.error(`Error fetching Morpho positions on chain ${chainId}:`, error);
    }
  }

  return positions;
}

async function getMorphoPositionsForChain(
  address: Address,
  chainId: EvmChainId,
  morphoAddress: Address
): Promise<EvmPosition[]> {
  const positions: EvmPosition[] = [];
  const client = chainService.getClient(chainId);
  const chainConfig = chainService.getConfig(chainId);

  // Check each known market
  for (const [marketName, market] of Object.entries(MORPHO_MARKETS)) {
    try {
      const position = await client.readContract({
        address: morphoAddress,
        abi: MORPHO_BLUE_ABI,
        functionName: 'position',
        args: [market.id, address],
      });

      const [supplyShares, borrowShares, collateral] = position;

      // Check supply position (using shares as proxy - actual value requires more complex calculation)
      if (supplyShares > 0n) {
        // Simplified: shares ≈ assets for estimation
        const supplyFormatted = Number(supplyShares) / Math.pow(10, market.decimals);
        const priceUsd = market.decimals === 6 ? 1 : await pricingService.getPrice('ETH') || 0;
        const valueUsd = supplyFormatted * priceUsd;

        if (valueUsd > 1) {
          positions.push({
            id: `morpho-supply-${marketName.replace('/', '-').toLowerCase()}-${chainId}`,
            protocol: PROTOCOLS.morpho,
            chainId,
            type: 'supply',
            tokens: [
              {
                address: morphoAddress,
                symbol: marketName.split('/')[1], // Loan asset
                decimals: market.decimals,
                balance: supplyShares.toString(),
                balanceFormatted: supplyFormatted.toFixed(2),
                priceUsd,
                valueUsd,
              },
            ],
            valueUsd,
            yield: {
              apy: ESTIMATED_APYS.morpho.supply,
            },
            metadata: {
              chainName: chainConfig.name,
              market: marketName,
            },
          });
        }
      }

      // Check borrow position
      if (borrowShares > 0n) {
        const borrowFormatted = Number(borrowShares) / Math.pow(10, market.decimals);
        const priceUsd = market.decimals === 6 ? 1 : await pricingService.getPrice('ETH') || 0;
        const valueUsd = borrowFormatted * priceUsd;

        if (valueUsd > 1) {
          positions.push({
            id: `morpho-borrow-${marketName.replace('/', '-').toLowerCase()}-${chainId}`,
            protocol: PROTOCOLS.morpho,
            chainId,
            type: 'borrow',
            tokens: [
              {
                address: morphoAddress,
                symbol: marketName.split('/')[1],
                decimals: market.decimals,
                balance: borrowShares.toString(),
                balanceFormatted: borrowFormatted.toFixed(2),
                priceUsd,
                valueUsd,
              },
            ],
            valueUsd: -valueUsd,
            yield: {
              apy: -ESTIMATED_APYS.morpho.borrow,
            },
            metadata: {
              chainName: chainConfig.name,
              market: marketName,
            },
          });
        }
      }

      // Check collateral position
      if (collateral > 0n) {
        // Collateral is the first asset in the market name (e.g., wstETH in wstETH/USDC)
        const collateralSymbol = marketName.split('/')[0];
        const collateralFormatted = Number(collateral) / 1e18; // Most collateral is 18 decimals
        const priceUsd = await pricingService.getPrice(collateralSymbol) || await pricingService.getPrice('ETH') || 0;
        const valueUsd = collateralFormatted * priceUsd;

        if (valueUsd > 1) {
          positions.push({
            id: `morpho-collateral-${marketName.replace('/', '-').toLowerCase()}-${chainId}`,
            protocol: PROTOCOLS.morpho,
            chainId,
            type: 'supply', // Collateral is a form of supply
            tokens: [
              {
                address: morphoAddress,
                symbol: collateralSymbol,
                decimals: 18,
                balance: collateral.toString(),
                balanceFormatted: collateralFormatted.toFixed(6),
                priceUsd,
                valueUsd,
              },
            ],
            valueUsd,
            metadata: {
              chainName: chainConfig.name,
              market: marketName,
              isCollateral: true,
            },
          });
        }
      }
    } catch (error) {
      // User may not have position in this market
    }
  }

  return positions;
}
