export const BOOSTER_ABI = [
  {
    inputs: [],
    name: 'poolLength',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: '_pid', type: 'uint256' }],
    name: 'poolInfo',
    outputs: [
      { name: 'lptoken', type: 'address' },
      { name: 'token', type: 'address' },
      { name: 'gauge', type: 'address' },
      { name: 'crvRewards', type: 'address' },
      { name: 'stash', type: 'address' },
      { name: 'shutdown', type: 'bool' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export const BASE_REWARD_POOL_ABI = [
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'earned',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'totalSupply',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'rewardRate',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'stakingToken',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export const CVX_LOCKER_ABI = [
  {
    inputs: [{ name: '_user', type: 'address' }],
    name: 'lockedBalanceOf',
    outputs: [{ name: 'amount', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: '_user', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: 'amount', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: '_account', type: 'address' }],
    name: 'claimableRewards',
    outputs: [
      {
        components: [
          { name: 'token', type: 'address' },
          { name: 'amount', type: 'uint256' },
        ],
        name: '',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;
