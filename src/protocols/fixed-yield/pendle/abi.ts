// Pendle PT/YT Token ABI (ERC20-like)
export const PENDLE_TOKEN_ABI = [
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'expiry',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// Pendle Market ABI
export const PENDLE_MARKET_ABI = [
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'readTokens',
    outputs: [
      { name: '_SY', type: 'address' },
      { name: '_PT', type: 'address' },
      { name: '_YT', type: 'address' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'expiry',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getRewardTokens',
    outputs: [{ name: '', type: 'address[]' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// Pendle RouterStatic ABI for yield calculations
export const PENDLE_ROUTER_STATIC_ABI = [
  {
    inputs: [{ name: 'market', type: 'address' }],
    name: 'getMarketState',
    outputs: [
      { name: 'pt', type: 'address' },
      { name: 'yt', type: 'address' },
      { name: 'sy', type: 'address' },
      { name: 'impliedYield', type: 'int256' },
      { name: 'marketExchangeRateExcludeFee', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'market', type: 'address' }],
    name: 'getPtImpliedYield',
    outputs: [{ name: '', type: 'int256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// SY (Standardized Yield) token ABI
export const PENDLE_SY_ABI = [
  {
    inputs: [],
    name: 'exchangeRate',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'yieldToken',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;
