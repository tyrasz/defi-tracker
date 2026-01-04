export { protocolRegistry } from './registry';
export { BaseProtocolAdapter } from './base-adapter';
export type { IProtocolAdapter, YieldRate, ProtocolAddresses } from './types';

// Re-export adapters
export { AaveV3Adapter } from './lending/aave-v3';
export { CompoundV3Adapter } from './lending/compound-v3';
export { LidoAdapter } from './liquid-staking/lido';
export { RocketPoolAdapter } from './liquid-staking/rocket-pool';
export { UniswapV3Adapter } from './dex/uniswap-v3';
export { CurveAdapter } from './dex/curve';
export { YearnV3Adapter } from './yield-aggregator/yearn-v3';
