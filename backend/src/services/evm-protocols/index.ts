// EVM DeFi Protocol Detection

import type { Address } from 'viem';
import type { EvmChainId } from '../chains';
import { EvmPosition } from './types';
import { getAavePositions } from './aave';
import { getLidoPositions } from './lido';
import { getCompoundPositions } from './compound';
import { getSparkPositions } from './spark';
import { getMorphoPositions } from './morpho';

export * from './types';

/**
 * Get all DeFi positions for an EVM address across supported protocols
 */
export async function getEvmProtocolPositions(
  address: Address,
  chainIds?: EvmChainId[]
): Promise<EvmPosition[]> {
  // Fetch all protocol positions in parallel
  const [aave, lido, compound, spark, morpho] = await Promise.all([
    getAavePositions(address, chainIds).catch((e) => {
      console.error('Error fetching Aave positions:', e);
      return [];
    }),
    getLidoPositions(address, chainIds).catch((e) => {
      console.error('Error fetching Lido positions:', e);
      return [];
    }),
    getCompoundPositions(address, chainIds).catch((e) => {
      console.error('Error fetching Compound positions:', e);
      return [];
    }),
    getSparkPositions(address, chainIds).catch((e) => {
      console.error('Error fetching Spark positions:', e);
      return [];
    }),
    getMorphoPositions(address, chainIds).catch((e) => {
      console.error('Error fetching Morpho positions:', e);
      return [];
    }),
  ]);

  return [...aave, ...lido, ...compound, ...spark, ...morpho];
}

// Re-export individual protocol functions
export { getAavePositions } from './aave';
export { getLidoPositions } from './lido';
export { getCompoundPositions } from './compound';
export { getSparkPositions } from './spark';
export { getMorphoPositions } from './morpho';
