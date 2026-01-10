// Solana DeFi Protocol Detection

import { SolanaPosition } from './types';
import { getStakingPositions } from './staking';
import { getLendingPositions } from './lending';

export * from './types';

/**
 * Get all DeFi positions for a Solana address
 */
export async function getSolanaProtocolPositions(
  address: string
): Promise<SolanaPosition[]> {
  const [staking, lending] = await Promise.all([
    getStakingPositions(address),
    getLendingPositions(address),
  ]);

  return [...staking, ...lending];
}

/**
 * Get staking positions only (Marinade, Jito)
 */
export { getStakingPositions } from './staking';

/**
 * Get lending positions only (Kamino, Solend, MarginFi)
 */
export { getLendingPositions } from './lending';
