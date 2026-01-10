// Liquid Staking Protocol Detection (Marinade, Jito)

import { pricingService } from '../pricing';
import {
  SolanaPosition,
  PROTOCOLS,
  STAKING_TOKENS,
  ESTIMATED_APYS,
} from './types';

const SOLANA_RPC = 'https://api.mainnet-beta.solana.com';

interface TokenAccountInfo {
  mint: string;
  amount: string;
  decimals: number;
}

/**
 * Get liquid staking positions (mSOL, JitoSOL, etc.)
 * These are detected from wallet token holdings
 */
export async function getStakingPositions(
  address: string
): Promise<SolanaPosition[]> {
  const positions: SolanaPosition[] = [];

  try {
    // Fetch all token accounts for the address
    const response = await fetch(SOLANA_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getTokenAccountsByOwner',
        params: [
          address,
          { programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' },
          { encoding: 'jsonParsed' },
        ],
      }),
    });

    interface TokenAccount {
      account: {
        data: {
          parsed: {
            info: {
              mint: string;
              tokenAmount: { amount: string; decimals: number; uiAmountString: string };
            };
          };
        };
      };
    }

    const data = await response.json() as {
      error?: unknown;
      result?: { value: TokenAccount[] };
    };

    if (data.error || !data.result?.value) {
      return positions;
    }

    // Aggregate by mint (wallet can have multiple token accounts)
    const balancesByMint = new Map<string, { amount: bigint; decimals: number }>();

    for (const account of data.result.value) {
      const info = account.account?.data?.parsed?.info;
      if (!info) continue;

      const mint = info.mint;
      const amount = BigInt(info.tokenAmount.amount);
      const decimals = info.tokenAmount.decimals;

      if (amount === 0n) continue;

      const existing = balancesByMint.get(mint);
      if (existing) {
        existing.amount += amount;
      } else {
        balancesByMint.set(mint, { amount, decimals });
      }
    }

    // Check for Marinade mSOL
    const msolBalance = balancesByMint.get(STAKING_TOKENS.mSOL);
    if (msolBalance && msolBalance.amount > 0n) {
      const balanceFormatted = (
        Number(msolBalance.amount) / Math.pow(10, msolBalance.decimals)
      ).toString();
      const priceUsd = await pricingService.getPrice('MSOL') || 0;
      const valueUsd = parseFloat(balanceFormatted) * priceUsd;

      positions.push({
        id: 'marinade-stake',
        protocol: PROTOCOLS.marinade,
        chainId: 'solana',
        type: 'stake',
        tokens: [
          {
            address: STAKING_TOKENS.mSOL,
            symbol: 'mSOL',
            decimals: msolBalance.decimals,
            balance: msolBalance.amount.toString(),
            balanceFormatted,
            priceUsd,
            valueUsd,
          },
        ],
        valueUsd,
        yield: {
          apy: ESTIMATED_APYS.marinade,
          apr: ESTIMATED_APYS.marinade,
        },
      });
    }

    // Check for Jito JitoSOL
    const jitoBalance = balancesByMint.get(STAKING_TOKENS.JitoSOL);
    if (jitoBalance && jitoBalance.amount > 0n) {
      const balanceFormatted = (
        Number(jitoBalance.amount) / Math.pow(10, jitoBalance.decimals)
      ).toString();
      const priceUsd = await pricingService.getPrice('JITOSOL') || 0;
      const valueUsd = parseFloat(balanceFormatted) * priceUsd;

      positions.push({
        id: 'jito-stake',
        protocol: PROTOCOLS.jito,
        chainId: 'solana',
        type: 'stake',
        tokens: [
          {
            address: STAKING_TOKENS.JitoSOL,
            symbol: 'JitoSOL',
            decimals: jitoBalance.decimals,
            balance: jitoBalance.amount.toString(),
            balanceFormatted,
            priceUsd,
            valueUsd,
          },
        ],
        valueUsd,
        yield: {
          apy: ESTIMATED_APYS.jito,
          apr: ESTIMATED_APYS.jito,
        },
      });
    }
  } catch (error) {
    console.error('Error fetching staking positions:', error);
  }

  return positions;
}
