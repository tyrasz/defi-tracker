// Solana DeFi Protocol Types

export interface ProtocolInfo {
  id: string;
  name: string;
  category: 'liquid-staking' | 'lending' | 'dex';
  website: string;
  earnsYield: boolean;
}

export interface SolanaPosition {
  id: string;
  protocol: ProtocolInfo;
  chainId: 'solana';
  type: 'stake' | 'supply' | 'borrow' | 'liquidity';
  tokens: SolanaTokenPosition[];
  valueUsd: number;
  yield?: {
    apy: number;
    apr?: number;
  };
  healthFactor?: number;
  metadata?: Record<string, unknown>;
}

export interface SolanaTokenPosition {
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
  marinade: {
    id: 'marinade',
    name: 'Marinade Finance',
    category: 'liquid-staking',
    website: 'https://marinade.finance',
    earnsYield: true,
  },
  jito: {
    id: 'jito',
    name: 'Jito',
    category: 'liquid-staking',
    website: 'https://jito.network',
    earnsYield: true,
  },
  kamino: {
    id: 'kamino',
    name: 'Kamino Finance',
    category: 'lending',
    website: 'https://kamino.finance',
    earnsYield: true,
  },
  solend: {
    id: 'solend',
    name: 'Solend',
    category: 'lending',
    website: 'https://solend.fi',
    earnsYield: true,
  },
  marginfi: {
    id: 'marginfi',
    name: 'MarginFi',
    category: 'lending',
    website: 'https://marginfi.com',
    earnsYield: true,
  },
  raydium: {
    id: 'raydium',
    name: 'Raydium',
    category: 'dex',
    website: 'https://raydium.io',
    earnsYield: false,
  },
  orca: {
    id: 'orca',
    name: 'Orca',
    category: 'dex',
    website: 'https://orca.so',
    earnsYield: false,
  },
};

// Program IDs for Solana protocols
export const PROGRAM_IDS = {
  // Liquid Staking
  marinade: 'MarBmsSgKXdrN1egZf5sqe1TMai9K1rChYNDJgjq7aD',
  jito: 'Jito4APyf642JPZPx3hGc6WWJ8zPKtRbRs4P815Awbb',

  // Lending
  kamino: 'KLend2g3cP87ber41GYr8CBYoVrbuKvAz5Z3N2xz7RrS',
  solend: 'So1endDq2YkqhipRh3WViPa8hdiSpxWy6z3Z6tMCpAo',
  marginfi: 'MFv2hWf31Z9kbCa1snEPYctwafyhdvnV7FZnsebVacA',

  // DEX
  raydium: 'CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK', // CLMM
  orca: 'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc', // Whirlpool
};

// Token mint addresses for liquid staking tokens
export const STAKING_TOKENS = {
  mSOL: 'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So',
  JitoSOL: 'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn',
  bSOL: 'bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1', // Blaze
  stSOL: '7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj', // Lido
};

// Estimated APYs (updated periodically from protocol APIs)
export const ESTIMATED_APYS = {
  marinade: 0.068, // ~6.8% APY
  jito: 0.072, // ~7.2% APY (MEV rewards)
  kamino: {
    usdc: 0.08,
    sol: 0.05,
    usdt: 0.07,
  },
  solend: {
    usdc: 0.06,
    sol: 0.04,
    usdt: 0.055,
  },
  marginfi: {
    usdc: 0.09,
    sol: 0.045,
    usdt: 0.075,
  },
};
