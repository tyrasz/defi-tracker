// Real-time APY fetching from protocol APIs

import { cache, CACHE_TTL } from '../cache/memory-cache';

// Fallback APYs when API fails
const FALLBACK_APYS: Record<string, number> = {
  marinade: 0.068,
  jito: 0.072,
  lido: 0.035,
  aave: 0.04,
  compound: 0.045,
  spark: 0.05,
  morpho: 0.05,
};

/**
 * Fetch real APY for a protocol
 */
export async function getProtocolApy(protocol: string): Promise<number> {
  const cacheKey = `apy:${protocol}`;
  const cached = cache.get<number>(cacheKey);
  if (cached !== null) return cached;

  try {
    let apy: number | null = null;

    switch (protocol.toLowerCase()) {
      case 'marinade':
        apy = await fetchMarinadeApy();
        break;
      case 'jito':
        apy = await fetchJitoApy();
        break;
      case 'lido':
        apy = await fetchLidoApy();
        break;
      case 'aave':
        apy = await fetchAaveApy();
        break;
      case 'compound':
        apy = await fetchCompoundApy();
        break;
      default:
        apy = FALLBACK_APYS[protocol] ?? 0.05;
    }

    if (apy !== null && apy !== undefined) {
      cache.set(cacheKey, apy, CACHE_TTL.APY);
      console.log(`[APY] ${protocol}: ${(apy * 100).toFixed(2)}%`);
      return apy;
    }
  } catch (error) {
    console.error(`Failed to fetch APY for ${protocol}:`, error);
  }

  // Return fallback
  const fallback = FALLBACK_APYS[protocol] || 0.05;
  cache.set(cacheKey, fallback, CACHE_TTL.APY);
  return fallback;
}

/**
 * Fetch multiple APYs at once
 */
export async function getBatchApys(protocols: string[]): Promise<Record<string, number>> {
  const results: Record<string, number> = {};

  await Promise.all(
    protocols.map(async (protocol) => {
      results[protocol] = await getProtocolApy(protocol);
    })
  );

  return results;
}

// Protocol-specific fetchers

async function fetchMarinadeApy(): Promise<number | null> {
  try {
    const response = await fetch('https://api.marinade.finance/msol/apy', {
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return null;

    const data = await response.json() as { value?: number };
    return data.value || null;
  } catch {
    return null;
  }
}

async function fetchJitoApy(): Promise<number | null> {
  try {
    // Jito doesn't have a public APY endpoint, use DefiLlama
    const response = await fetch(
      'https://yields.llama.fi/chart/f8c5df0d-1473-442a-a0b4-3b39da10a4d8',
      { signal: AbortSignal.timeout(5000) }
    );
    if (!response.ok) return null;

    const data = await response.json() as { data?: Array<{ apy?: number }> };
    const latest = data.data?.[data.data.length - 1];
    return latest?.apy ? latest.apy / 100 : null;
  } catch {
    return null;
  }
}

async function fetchLidoApy(): Promise<number | null> {
  try {
    const response = await fetch(
      'https://eth-api.lido.fi/v1/protocol/steth/apr/sma',
      { signal: AbortSignal.timeout(5000) }
    );
    if (!response.ok) return null;

    const data = await response.json() as { data?: { smaApr?: number } };
    return data.data?.smaApr ? data.data.smaApr / 100 : null;
  } catch {
    return null;
  }
}

async function fetchAaveApy(): Promise<number | null> {
  try {
    // Use DefiLlama for Aave average APY
    const response = await fetch(
      'https://yields.llama.fi/pools',
      { signal: AbortSignal.timeout(10000) }
    );
    if (!response.ok) return null;

    const data = await response.json() as { data?: Array<{ project?: string; apy?: number }> };
    const aavePools = data.data?.filter((p) => p.project === 'aave-v3') || [];

    if (aavePools.length === 0) return null;

    // Average APY across all Aave pools
    const avgApy = aavePools.reduce((sum, p) => sum + (p.apy || 0), 0) / aavePools.length;
    return avgApy / 100;
  } catch {
    return null;
  }
}

async function fetchCompoundApy(): Promise<number | null> {
  try {
    // Use DefiLlama for Compound average APY
    const response = await fetch(
      'https://yields.llama.fi/pools',
      { signal: AbortSignal.timeout(10000) }
    );
    if (!response.ok) return null;

    const data = await response.json() as { data?: Array<{ project?: string; apy?: number }> };
    const compoundPools = data.data?.filter((p) => p.project === 'compound-v3') || [];

    if (compoundPools.length === 0) return null;

    const avgApy = compoundPools.reduce((sum, p) => sum + (p.apy || 0), 0) / compoundPools.length;
    return avgApy / 100;
  } catch {
    return null;
  }
}
