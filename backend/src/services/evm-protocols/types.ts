// EVM DeFi Protocol Types

import type { EvmChainId } from '../chains';

export interface ProtocolInfo {
  id: string;
  name: string;
  category: 'lending' | 'staking' | 'dex';
  website: string;
  earnsYield: boolean;
}

export interface EvmPosition {
  id: string;
  protocol: ProtocolInfo;
  chainId: EvmChainId;
  type: 'supply' | 'borrow' | 'stake' | 'liquidity';
  tokens: EvmTokenPosition[];
  valueUsd: number;
  yield?: {
    apy: number;
    apr?: number;
  };
  healthFactor?: number;
  metadata?: Record<string, unknown>;
}

export interface EvmTokenPosition {
  address: string;
  symbol: string;
  decimals: number;
  balance: string;
  balanceFormatted: string;
  priceUsd: number;
  valueUsd: number;
}

// Protocol definitions
export const PROTOCOLS: Record<string, ProtocolInfo> = {
  aave: {
    id: 'aave',
    name: 'Aave V3',
    category: 'lending',
    website: 'https://aave.com',
    earnsYield: true,
  },
  lido: {
    id: 'lido',
    name: 'Lido',
    category: 'staking',
    website: 'https://lido.fi',
    earnsYield: true,
  },
  compound: {
    id: 'compound',
    name: 'Compound V3',
    category: 'lending',
    website: 'https://compound.finance',
    earnsYield: true,
  },
  spark: {
    id: 'spark',
    name: 'Spark',
    category: 'lending',
    website: 'https://spark.fi',
    earnsYield: true,
  },
  morpho: {
    id: 'morpho',
    name: 'Morpho',
    category: 'lending',
    website: 'https://morpho.org',
    earnsYield: true,
  },
};

// Aave V3 Pool addresses per chain
export const AAVE_V3_POOLS: Partial<Record<EvmChainId, `0x${string}`>> = {
  1: '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2',      // Ethereum
  42161: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',  // Arbitrum
  10: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',     // Optimism
  137: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',    // Polygon
  8453: '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5',   // Base
  43114: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',  // Avalanche
};

// Lido token addresses (Ethereum only)
export const LIDO_TOKENS = {
  stETH: '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84' as `0x${string}`,
  wstETH: '0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0' as `0x${string}`,
};

// Compound V3 Comet addresses per chain
export const COMPOUND_V3_COMETS: Partial<Record<EvmChainId, { usdc?: `0x${string}`; weth?: `0x${string}` }>> = {
  1: {
    usdc: '0xc3d688B66703497DAA19211EEdff47f25384cdc3',
    weth: '0xA17581A9E3356d9A858b789D68B4d866e593aE94',
  },
  42161: {
    usdc: '0x9c4ec768c28520B50860ea7a15bd7213a9fF58bf',
  },
  137: {
    usdc: '0xF25212E676D1F7F89Cd72fFEe66158f541246445',
  },
  8453: {
    usdc: '0xb125E6687d4313864e53df431d5425969c15Eb2F',
    weth: '0x46e6b214b524310239732D51387075E0e70970bf',
  },
};

// Spark Pool address (Ethereum only, Aave V3 fork)
export const SPARK_POOL: `0x${string}` = '0xC13e21B648A5Ee794902342038FF3aDAB66BE987';

// Morpho Blue addresses
export const MORPHO_BLUE: Partial<Record<EvmChainId, `0x${string}`>> = {
  1: '0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb',
  8453: '0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb',
};

// Estimated APYs (fallback when live data unavailable)
export const ESTIMATED_APYS = {
  aave: {
    supply: { usdc: 0.04, usdt: 0.035, eth: 0.02, wbtc: 0.005 },
    borrow: { usdc: 0.06, usdt: 0.055, eth: 0.03, wbtc: 0.01 },
  },
  lido: 0.035, // ~3.5% stETH APY
  compound: {
    supply: { usdc: 0.045, weth: 0.02 },
    borrow: { usdc: 0.07, weth: 0.035 },
  },
  spark: {
    supply: { dai: 0.05, usdc: 0.04, eth: 0.02 },
    borrow: { dai: 0.055, usdc: 0.05, eth: 0.025 },
  },
  morpho: {
    supply: 0.05, // Average
    borrow: 0.06,
  },
};
