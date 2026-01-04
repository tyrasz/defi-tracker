export const STETH_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    name: 'getPooledEthByShares',
    type: 'function',
    inputs: [{ name: '_sharesAmount', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
] as const;

export const WSTETH_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    name: 'getStETHByWstETH',
    type: 'function',
    inputs: [{ name: '_wstETHAmount', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    name: 'stEthPerToken',
    type: 'function',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
] as const;

export const LIDO_ORACLE_ABI = [
  {
    name: 'getLastCompletedReportDelta',
    type: 'function',
    inputs: [],
    outputs: [
      { name: 'postTotalPooledEther', type: 'uint256' },
      { name: 'preTotalPooledEther', type: 'uint256' },
      { name: 'timeElapsed', type: 'uint256' },
    ],
    stateMutability: 'view',
  },
] as const;
