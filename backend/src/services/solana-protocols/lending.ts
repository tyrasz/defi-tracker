// Lending Protocol Detection (Kamino, Solend, MarginFi)

import { pricingService } from '../pricing';
import {
  SolanaPosition,
  SolanaTokenPosition,
  PROTOCOLS,
  PROGRAM_IDS,
  ESTIMATED_APYS,
} from './types';

const SOLANA_RPC = 'https://api.mainnet-beta.solana.com';

// Known reserve/market token mappings for lending protocols
const KAMINO_RESERVES: Record<string, { symbol: string; decimals: number }> = {
  'd4A2prbA2whesmvHaL88BH6Ewn5N4bTSU2Ze8P6Bc4Q': { symbol: 'SOL', decimals: 9 },
  'Ga4rZytCpq1unD4DbEJ5bkHeUz9g3oh9AAFEi6vSauXp': { symbol: 'USDC', decimals: 6 },
  'FBSyPnxtHKLBZ4UeeUyAnbtFuAmTHLtso9YtsqRDRWpM': { symbol: 'USDT', decimals: 6 },
  'H3t6qZ1JkguCNTi7unhVR5YWfcXVJLU9e1AaTy2r62Ut': { symbol: 'JitoSOL', decimals: 9 },
  'ByYiZxp8QrdN9qbdtaAiePN8AAr3qvTPppNJDpf5DVJ5': { symbol: 'mSOL', decimals: 9 },
};

const MARGINFI_BANKS: Record<string, { symbol: string; decimals: number }> = {
  '2s37akK2eyBbp8DZgCm7RtsaEz8eJP3Nxd4urLHQv7yB': { symbol: 'SOL', decimals: 9 },
  'CCKtUs6Cgwo4aaQUmBPmyoApH2gUDErxNZCAntD6LYGh': { symbol: 'USDC', decimals: 6 },
  'Guu5uBc8k1WK1U2ihGosNaCy57LSgCkpWAabtzQqrQf8': { symbol: 'USDT', decimals: 6 },
  'DMoqjmsuoru986HgfjqrKEvPv8YBufvBGADHUonkadC5': { symbol: 'JitoSOL', decimals: 9 },
};

const SOLEND_RESERVES: Record<string, { symbol: string; decimals: number }> = {
  '8PbodeaosQP19SjYFx855UMqWxH2HynZLdBXmsrbac36': { symbol: 'SOL', decimals: 9 },
  'BgxfHJDzm44T7XG68MYKx7YisTjZu73tVovyZSjJMpmw': { symbol: 'USDC', decimals: 6 },
  '8K9WC8xoh2rtQNY7iEGXtPvfbDCi563SdWhCAhuMP2xE': { symbol: 'USDT', decimals: 6 },
};

/**
 * Get lending positions from Kamino Finance
 */
async function getKaminoPositions(address: string): Promise<SolanaPosition[]> {
  const positions: SolanaPosition[] = [];

  try {
    // Query Kamino obligation accounts for this user
    const response = await fetch(SOLANA_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getProgramAccounts',
        params: [
          PROGRAM_IDS.kamino,
          {
            encoding: 'base64',
            filters: [
              { dataSize: 3368 }, // Obligation account size
              {
                memcmp: {
                  offset: 40, // Owner field offset
                  bytes: address,
                },
              },
            ],
          },
        ],
      }),
    });

    interface AccountInfo {
      pubkey: string;
      account: { data: [string, string] };
    }

    const data = await response.json() as {
      error?: unknown;
      result?: AccountInfo[];
    };

    if (data.error || !data.result || data.result.length === 0) {
      return positions;
    }

    // Parse obligation accounts
    for (const account of data.result) {
      const parsed = parseKaminoObligation(account.account.data[0]);
      if (parsed.deposits.length > 0 || parsed.borrows.length > 0) {
        // Add supply positions
        for (const deposit of parsed.deposits) {
          const priceUsd = await pricingService.getPrice(deposit.symbol) || 0;
          const valueUsd = parseFloat(deposit.balanceFormatted) * priceUsd;
          const apy = ESTIMATED_APYS.kamino[deposit.symbol.toLowerCase() as keyof typeof ESTIMATED_APYS.kamino] || 0.05;

          positions.push({
            id: `kamino-supply-${deposit.symbol.toLowerCase()}`,
            protocol: PROTOCOLS.kamino,
            chainId: 'solana',
            type: 'supply',
            tokens: [{ ...deposit, priceUsd, valueUsd }],
            valueUsd,
            yield: { apy },
          });
        }

        // Add borrow positions
        for (const borrow of parsed.borrows) {
          const priceUsd = await pricingService.getPrice(borrow.symbol) || 0;
          const valueUsd = parseFloat(borrow.balanceFormatted) * priceUsd;
          const apy = ESTIMATED_APYS.kamino[borrow.symbol.toLowerCase() as keyof typeof ESTIMATED_APYS.kamino] || 0.08;

          positions.push({
            id: `kamino-borrow-${borrow.symbol.toLowerCase()}`,
            protocol: PROTOCOLS.kamino,
            chainId: 'solana',
            type: 'borrow',
            tokens: [{ ...borrow, priceUsd, valueUsd }],
            valueUsd: -valueUsd, // Borrows are negative
            yield: { apy: -apy }, // Borrow rate is cost
          });
        }
      }
    }
  } catch (error) {
    console.error('Error fetching Kamino positions:', error);
  }

  return positions;
}

/**
 * Get lending positions from MarginFi
 */
async function getMarginFiPositions(address: string): Promise<SolanaPosition[]> {
  const positions: SolanaPosition[] = [];

  try {
    // Query MarginFi accounts for this user
    const response = await fetch(SOLANA_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getProgramAccounts',
        params: [
          PROGRAM_IDS.marginfi,
          {
            encoding: 'base64',
            filters: [
              { dataSize: 2304 }, // MarginfiAccount size
              {
                memcmp: {
                  offset: 8, // Authority offset
                  bytes: address,
                },
              },
            ],
          },
        ],
      }),
    });

    interface AccountInfo {
      pubkey: string;
      account: { data: [string, string] };
    }

    const data = await response.json() as {
      error?: unknown;
      result?: AccountInfo[];
    };

    if (data.error || !data.result || data.result.length === 0) {
      return positions;
    }

    // Parse MarginFi accounts
    for (const account of data.result) {
      const parsed = parseMarginFiAccount(account.account.data[0]);

      for (const deposit of parsed.deposits) {
        const priceUsd = await pricingService.getPrice(deposit.symbol) || 0;
        const valueUsd = parseFloat(deposit.balanceFormatted) * priceUsd;
        const apy = ESTIMATED_APYS.marginfi[deposit.symbol.toLowerCase() as keyof typeof ESTIMATED_APYS.marginfi] || 0.05;

        positions.push({
          id: `marginfi-supply-${deposit.symbol.toLowerCase()}`,
          protocol: PROTOCOLS.marginfi,
          chainId: 'solana',
          type: 'supply',
          tokens: [{ ...deposit, priceUsd, valueUsd }],
          valueUsd,
          yield: { apy },
        });
      }

      for (const borrow of parsed.borrows) {
        const priceUsd = await pricingService.getPrice(borrow.symbol) || 0;
        const valueUsd = parseFloat(borrow.balanceFormatted) * priceUsd;
        const apy = ESTIMATED_APYS.marginfi[borrow.symbol.toLowerCase() as keyof typeof ESTIMATED_APYS.marginfi] || 0.08;

        positions.push({
          id: `marginfi-borrow-${borrow.symbol.toLowerCase()}`,
          protocol: PROTOCOLS.marginfi,
          chainId: 'solana',
          type: 'borrow',
          tokens: [{ ...borrow, priceUsd, valueUsd }],
          valueUsd: -valueUsd,
          yield: { apy: -apy },
        });
      }
    }
  } catch (error) {
    console.error('Error fetching MarginFi positions:', error);
  }

  return positions;
}

/**
 * Get lending positions from Solend
 */
async function getSolendPositions(address: string): Promise<SolanaPosition[]> {
  const positions: SolanaPosition[] = [];

  try {
    // Query Solend obligation accounts for this user
    const response = await fetch(SOLANA_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getProgramAccounts',
        params: [
          PROGRAM_IDS.solend,
          {
            encoding: 'base64',
            filters: [
              { dataSize: 1300 }, // Obligation account size (approximate)
              {
                memcmp: {
                  offset: 2, // Owner offset
                  bytes: address,
                },
              },
            ],
          },
        ],
      }),
    });

    interface AccountInfo {
      pubkey: string;
      account: { data: [string, string] };
    }

    const data = await response.json() as {
      error?: unknown;
      result?: AccountInfo[];
    };

    if (data.error || !data.result || data.result.length === 0) {
      return positions;
    }

    // Parse Solend obligations
    for (const account of data.result) {
      const parsed = parseSolendObligation(account.account.data[0]);

      for (const deposit of parsed.deposits) {
        const priceUsd = await pricingService.getPrice(deposit.symbol) || 0;
        const valueUsd = parseFloat(deposit.balanceFormatted) * priceUsd;
        const apy = ESTIMATED_APYS.solend[deposit.symbol.toLowerCase() as keyof typeof ESTIMATED_APYS.solend] || 0.04;

        positions.push({
          id: `solend-supply-${deposit.symbol.toLowerCase()}`,
          protocol: PROTOCOLS.solend,
          chainId: 'solana',
          type: 'supply',
          tokens: [{ ...deposit, priceUsd, valueUsd }],
          valueUsd,
          yield: { apy },
        });
      }

      for (const borrow of parsed.borrows) {
        const priceUsd = await pricingService.getPrice(borrow.symbol) || 0;
        const valueUsd = parseFloat(borrow.balanceFormatted) * priceUsd;
        const apy = ESTIMATED_APYS.solend[borrow.symbol.toLowerCase() as keyof typeof ESTIMATED_APYS.solend] || 0.06;

        positions.push({
          id: `solend-borrow-${borrow.symbol.toLowerCase()}`,
          protocol: PROTOCOLS.solend,
          chainId: 'solana',
          type: 'borrow',
          tokens: [{ ...borrow, priceUsd, valueUsd }],
          valueUsd: -valueUsd,
          yield: { apy: -apy },
        });
      }
    }
  } catch (error) {
    console.error('Error fetching Solend positions:', error);
  }

  return positions;
}

// Simplified parsers - extract basic deposit/borrow info from account data
// In production, you'd use proper Anchor IDL deserialization

interface ParsedPosition {
  deposits: Omit<SolanaTokenPosition, 'priceUsd' | 'valueUsd'>[];
  borrows: Omit<SolanaTokenPosition, 'priceUsd' | 'valueUsd'>[];
}

function parseKaminoObligation(base64Data: string): ParsedPosition {
  // Simplified parsing - in production use proper account layout
  try {
    const buffer = Buffer.from(base64Data, 'base64');
    const deposits: Omit<SolanaTokenPosition, 'priceUsd' | 'valueUsd'>[] = [];
    const borrows: Omit<SolanaTokenPosition, 'priceUsd' | 'valueUsd'>[] = [];

    // Parse deposit positions (simplified - check for non-zero amounts at known offsets)
    // This is a placeholder - real implementation needs proper Anchor deserialization
    if (buffer.length > 200) {
      // Check for deposits starting at offset 200
      for (let i = 0; i < 8; i++) {
        const offset = 200 + i * 80;
        if (offset + 16 < buffer.length) {
          const amount = buffer.readBigUInt64LE(offset);
          if (amount > 0n) {
            // Map to known reserves (simplified)
            const reserveInfo = Object.values(KAMINO_RESERVES)[i];
            if (reserveInfo) {
              deposits.push({
                address: Object.keys(KAMINO_RESERVES)[i],
                symbol: reserveInfo.symbol,
                decimals: reserveInfo.decimals,
                balance: amount.toString(),
                balanceFormatted: (Number(amount) / Math.pow(10, reserveInfo.decimals)).toString(),
              });
            }
          }
        }
      }
    }

    return { deposits, borrows };
  } catch {
    return { deposits: [], borrows: [] };
  }
}

function parseMarginFiAccount(base64Data: string): ParsedPosition {
  try {
    const buffer = Buffer.from(base64Data, 'base64');
    const deposits: Omit<SolanaTokenPosition, 'priceUsd' | 'valueUsd'>[] = [];
    const borrows: Omit<SolanaTokenPosition, 'priceUsd' | 'valueUsd'>[] = [];

    // Simplified parsing for MarginFi account structure
    if (buffer.length > 100) {
      for (let i = 0; i < 4; i++) {
        const offset = 100 + i * 48;
        if (offset + 8 < buffer.length) {
          const amount = buffer.readBigUInt64LE(offset);
          if (amount > 0n) {
            const bankInfo = Object.values(MARGINFI_BANKS)[i];
            if (bankInfo) {
              deposits.push({
                address: Object.keys(MARGINFI_BANKS)[i],
                symbol: bankInfo.symbol,
                decimals: bankInfo.decimals,
                balance: amount.toString(),
                balanceFormatted: (Number(amount) / Math.pow(10, bankInfo.decimals)).toString(),
              });
            }
          }
        }
      }
    }

    return { deposits, borrows };
  } catch {
    return { deposits: [], borrows: [] };
  }
}

function parseSolendObligation(base64Data: string): ParsedPosition {
  try {
    const buffer = Buffer.from(base64Data, 'base64');
    const deposits: Omit<SolanaTokenPosition, 'priceUsd' | 'valueUsd'>[] = [];
    const borrows: Omit<SolanaTokenPosition, 'priceUsd' | 'valueUsd'>[] = [];

    // Simplified parsing for Solend obligation
    if (buffer.length > 50) {
      for (let i = 0; i < 3; i++) {
        const offset = 50 + i * 56;
        if (offset + 8 < buffer.length) {
          const amount = buffer.readBigUInt64LE(offset);
          if (amount > 0n) {
            const reserveInfo = Object.values(SOLEND_RESERVES)[i];
            if (reserveInfo) {
              deposits.push({
                address: Object.keys(SOLEND_RESERVES)[i],
                symbol: reserveInfo.symbol,
                decimals: reserveInfo.decimals,
                balance: amount.toString(),
                balanceFormatted: (Number(amount) / Math.pow(10, reserveInfo.decimals)).toString(),
              });
            }
          }
        }
      }
    }

    return { deposits, borrows };
  } catch {
    return { deposits: [], borrows: [] };
  }
}

/**
 * Get all lending positions across protocols
 */
export async function getLendingPositions(
  address: string
): Promise<SolanaPosition[]> {
  const [kamino, marginfi, solend] = await Promise.all([
    getKaminoPositions(address),
    getMarginFiPositions(address),
    getSolendPositions(address),
  ]);

  return [...kamino, ...marginfi, ...solend];
}
