// Lido Staking Position Detection

import type { Address } from 'viem';
import { chainService, type EvmChainId } from '../chains';
import { pricingService } from '../pricing';
import { EvmPosition, PROTOCOLS, LIDO_TOKENS, ESTIMATED_APYS } from './types';

// ERC20 ABI for balance check
const ERC20_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

/**
 * Get Lido staking positions (stETH/wstETH holdings on Ethereum)
 */
export async function getLidoPositions(
  address: Address,
  chainIds?: EvmChainId[]
): Promise<EvmPosition[]> {
  const positions: EvmPosition[] = [];

  // Lido is only on Ethereum mainnet
  if (chainIds && !chainIds.includes(1)) {
    return positions;
  }

  try {
    const client = chainService.getClient(1);

    // Check stETH balance
    const stEthBalance = await client.readContract({
      address: LIDO_TOKENS.stETH,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [address],
    });

    if (stEthBalance > 0n) {
      const balanceFormatted = Number(stEthBalance) / 1e18;
      const priceUsd = await pricingService.getPrice('STETH') || await pricingService.getPrice('ETH') || 0;
      const valueUsd = balanceFormatted * priceUsd;

      if (valueUsd > 1) {
        positions.push({
          id: 'lido-steth',
          protocol: PROTOCOLS.lido,
          chainId: 1,
          type: 'stake',
          tokens: [
            {
              address: LIDO_TOKENS.stETH,
              symbol: 'stETH',
              decimals: 18,
              balance: stEthBalance.toString(),
              balanceFormatted: balanceFormatted.toFixed(6),
              priceUsd,
              valueUsd,
            },
          ],
          valueUsd,
          yield: {
            apy: ESTIMATED_APYS.lido,
          },
        });
      }
    }

    // Check wstETH balance
    const wstEthBalance = await client.readContract({
      address: LIDO_TOKENS.wstETH,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [address],
    });

    if (wstEthBalance > 0n) {
      const balanceFormatted = Number(wstEthBalance) / 1e18;
      // wstETH is worth more than stETH due to rebasing
      const priceUsd = await pricingService.getPrice('WSTETH') || (await pricingService.getPrice('ETH') || 0) * 1.15;
      const valueUsd = balanceFormatted * priceUsd;

      if (valueUsd > 1) {
        positions.push({
          id: 'lido-wsteth',
          protocol: PROTOCOLS.lido,
          chainId: 1,
          type: 'stake',
          tokens: [
            {
              address: LIDO_TOKENS.wstETH,
              symbol: 'wstETH',
              decimals: 18,
              balance: wstEthBalance.toString(),
              balanceFormatted: balanceFormatted.toFixed(6),
              priceUsd,
              valueUsd,
            },
          ],
          valueUsd,
          yield: {
            apy: ESTIMATED_APYS.lido,
          },
        });
      }
    }
  } catch (error) {
    console.error('Error fetching Lido positions:', error);
  }

  return positions;
}
