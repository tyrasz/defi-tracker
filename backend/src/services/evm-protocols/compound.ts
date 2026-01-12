// Compound V3 Position Detection

import type { Address } from 'viem';
import { chainService, type EvmChainId } from '../chains';
import { pricingService } from '../pricing';
import { EvmPosition, PROTOCOLS, COMPOUND_V3_COMETS, ESTIMATED_APYS } from './types';

// Compound V3 Comet ABI (minimal)
const COMET_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'borrowBalanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'baseToken',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
] as const;

/**
 * Get Compound V3 positions across supported chains
 */
export async function getCompoundPositions(
  address: Address,
  chainIds?: EvmChainId[]
): Promise<EvmPosition[]> {
  const positions: EvmPosition[] = [];
  const targetChains = chainIds || (Object.keys(COMPOUND_V3_COMETS).map(Number) as EvmChainId[]);

  const chainPromises = targetChains.map(async (chainId) => {
    const comets = COMPOUND_V3_COMETS[chainId];
    if (!comets) return [];

    try {
      return await getCompoundPositionsForChain(address, chainId, comets);
    } catch (error) {
      console.error(`Error fetching Compound positions on chain ${chainId}:`, error);
      return [];
    }
  });

  const results = await Promise.all(chainPromises);
  for (const chainPositions of results) {
    positions.push(...chainPositions);
  }

  return positions;
}

async function getCompoundPositionsForChain(
  address: Address,
  chainId: EvmChainId,
  comets: { usdc?: Address; weth?: Address }
): Promise<EvmPosition[]> {
  const positions: EvmPosition[] = [];
  const client = chainService.getClient(chainId);
  const chainConfig = chainService.getConfig(chainId);

  // Check USDC Comet
  if (comets.usdc) {
    try {
      const [supplyBalance, borrowBalance] = await Promise.all([
        client.readContract({
          address: comets.usdc,
          abi: COMET_ABI,
          functionName: 'balanceOf',
          args: [address],
        }),
        client.readContract({
          address: comets.usdc,
          abi: COMET_ABI,
          functionName: 'borrowBalanceOf',
          args: [address],
        }),
      ]);

      // USDC has 6 decimals
      const supplyFormatted = Number(supplyBalance) / 1e6;
      const borrowFormatted = Number(borrowBalance) / 1e6;
      const priceUsd = 1; // USDC is $1

      if (supplyFormatted > 1) {
        positions.push({
          id: `compound-v3-supply-usdc-${chainId}`,
          protocol: PROTOCOLS.compound,
          chainId,
          type: 'supply',
          tokens: [
            {
              address: comets.usdc,
              symbol: 'USDC',
              decimals: 6,
              balance: supplyBalance.toString(),
              balanceFormatted: supplyFormatted.toFixed(2),
              priceUsd,
              valueUsd: supplyFormatted * priceUsd,
            },
          ],
          valueUsd: supplyFormatted * priceUsd,
          yield: {
            apy: ESTIMATED_APYS.compound.supply.usdc,
          },
          metadata: {
            chainName: chainConfig.name,
            market: 'USDC',
          },
        });
      }

      if (borrowFormatted > 1) {
        positions.push({
          id: `compound-v3-borrow-usdc-${chainId}`,
          protocol: PROTOCOLS.compound,
          chainId,
          type: 'borrow',
          tokens: [
            {
              address: comets.usdc,
              symbol: 'USDC',
              decimals: 6,
              balance: borrowBalance.toString(),
              balanceFormatted: borrowFormatted.toFixed(2),
              priceUsd,
              valueUsd: borrowFormatted * priceUsd,
            },
          ],
          valueUsd: -(borrowFormatted * priceUsd),
          yield: {
            apy: -ESTIMATED_APYS.compound.borrow.usdc,
          },
          metadata: {
            chainName: chainConfig.name,
            market: 'USDC',
          },
        });
      }
    } catch (error) {
      // User may not have positions
    }
  }

  // Check WETH Comet
  if (comets.weth) {
    try {
      const [supplyBalance, borrowBalance] = await Promise.all([
        client.readContract({
          address: comets.weth,
          abi: COMET_ABI,
          functionName: 'balanceOf',
          args: [address],
        }),
        client.readContract({
          address: comets.weth,
          abi: COMET_ABI,
          functionName: 'borrowBalanceOf',
          args: [address],
        }),
      ]);

      // WETH has 18 decimals
      const supplyFormatted = Number(supplyBalance) / 1e18;
      const borrowFormatted = Number(borrowBalance) / 1e18;
      const priceUsd = await pricingService.getPrice('ETH') || 0;

      if (supplyFormatted * priceUsd > 1) {
        positions.push({
          id: `compound-v3-supply-weth-${chainId}`,
          protocol: PROTOCOLS.compound,
          chainId,
          type: 'supply',
          tokens: [
            {
              address: comets.weth,
              symbol: 'WETH',
              decimals: 18,
              balance: supplyBalance.toString(),
              balanceFormatted: supplyFormatted.toFixed(6),
              priceUsd,
              valueUsd: supplyFormatted * priceUsd,
            },
          ],
          valueUsd: supplyFormatted * priceUsd,
          yield: {
            apy: ESTIMATED_APYS.compound.supply.weth,
          },
          metadata: {
            chainName: chainConfig.name,
            market: 'WETH',
          },
        });
      }

      if (borrowFormatted * priceUsd > 1) {
        positions.push({
          id: `compound-v3-borrow-weth-${chainId}`,
          protocol: PROTOCOLS.compound,
          chainId,
          type: 'borrow',
          tokens: [
            {
              address: comets.weth,
              symbol: 'WETH',
              decimals: 18,
              balance: borrowBalance.toString(),
              balanceFormatted: borrowFormatted.toFixed(6),
              priceUsd,
              valueUsd: borrowFormatted * priceUsd,
            },
          ],
          valueUsd: -(borrowFormatted * priceUsd),
          yield: {
            apy: -ESTIMATED_APYS.compound.borrow.weth,
          },
          metadata: {
            chainName: chainConfig.name,
            market: 'WETH',
          },
        });
      }
    } catch (error) {
      // User may not have positions
    }
  }

  return positions;
}
