import type { Address } from 'viem';

export interface Token {
  address: Address;
  symbol: string;
  name: string;
  decimals: number;
  logoUrl?: string;
}

export interface TokenBalance {
  address: Address;
  symbol: string;
  decimals: number;
  balance: bigint;
  balanceFormatted: string;
  priceUsd: number;
  valueUsd: number;
}

export interface TokenPrice {
  address: Address;
  priceUsd: number;
  source: 'chainlink' | 'dex' | 'cache';
  updatedAt: number;
}
