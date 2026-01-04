export const STRATEGY_MANAGER_ABI = [
  {
    inputs: [
      { name: 'staker', type: 'address' },
      { name: 'strategy', type: 'address' },
    ],
    name: 'stakerStrategyShares',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export const STRATEGY_ABI = [
  {
    inputs: [{ name: 'shares', type: 'uint256' }],
    name: 'sharesToUnderlyingView',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'totalShares',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'underlyingToken',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export const DELEGATION_MANAGER_ABI = [
  {
    inputs: [{ name: 'staker', type: 'address' }],
    name: 'delegatedTo',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'staker', type: 'address' }],
    name: 'isDelegated',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;
