import { NextRequest, NextResponse } from 'next/server';
import { isAddress, type Address } from 'viem';
import { portfolioAggregator } from '@/core/aggregator';
import { yieldAnalyzer } from '@/core/yield';
import { priceFetcher } from '@/core/pricing';
import { walletBalanceFetcher } from '@/core/wallet';
import { solanaBalanceFetcher } from '@/core/wallet/solana-balance-fetcher';
import { serializeBigInts } from '@/lib/utils/serialize';
import { ensResolver } from '@/core/ens';
import type { ChainId } from '@/types/chain';

// Check if address is a Solana address (base58, 32-44 chars)
function isSolanaAddress(input: string): boolean {
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  return base58Regex.test(input);
}

interface RouteParams {
  params: Promise<{ address: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { address: addressParam } = await params;

  // Check if this is a Solana address
  if (isSolanaAddress(addressParam)) {
    return handleSolanaRequest(addressParam);
  }

  // Resolve ENS name or validate address
  let resolvedAddress: Address | null;
  let ensName: string | null = null;

  if (isAddress(addressParam)) {
    resolvedAddress = addressParam;
    // Optionally get ENS name for display
    ensName = await ensResolver.getEnsName(addressParam);
  } else if (ensResolver.isEnsName(addressParam)) {
    // Try to resolve ENS name
    const result = await ensResolver.resolveToAddress(addressParam);
    resolvedAddress = result.address;
    ensName = result.ensName;

    if (!resolvedAddress) {
      return NextResponse.json(
        { success: false, error: `Could not resolve ENS name: ${addressParam}` },
        { status: 400 }
      );
    }
  } else {
    return NextResponse.json(
      { success: false, error: 'Invalid Ethereum address, ENS name, or Solana address' },
      { status: 400 }
    );
  }

  const address = resolvedAddress;

  // Parse query params
  const searchParams = request.nextUrl.searchParams;
  const chainsParam = searchParams.get('chains');
  const includeYieldAnalysis = searchParams.get('yieldAnalysis') !== 'false';

  // Parse chain IDs if provided
  let chainIds: ChainId[] | undefined;
  if (chainsParam) {
    chainIds = chainsParam.split(',').map(Number) as ChainId[];
  }

  try {
    // Fetch portfolio
    const portfolio = await portfolioAggregator.getPortfolio(
      address as `0x${string}`,
      chainIds
    );

    // Enrich with prices
    await priceFetcher.enrichPositionsWithPrices(portfolio.positions);

    // Recalculate USD values after price enrichment
    portfolio.totalValueUsd = portfolio.positions.reduce(
      (sum, p) => sum + p.valueUsd,
      0
    );

    // Update chain and protocol totals
    for (const chainId of Object.keys(portfolio.byChain)) {
      const chain = portfolio.byChain[Number(chainId) as ChainId];
      chain.totalValueUsd = chain.positions.reduce(
        (sum, p) => sum + p.valueUsd,
        0
      );
    }

    for (const protocolId of Object.keys(portfolio.byProtocol)) {
      const protocol = portfolio.byProtocol[protocolId];
      protocol.totalValueUsd = protocol.positions.reduce(
        (sum, p) => sum + p.valueUsd,
        0
      );
    }

    // Fetch wallet balances (ETH + stablecoins) in parallel with yield analysis
    const [yieldAnalysis, walletBalances] = await Promise.all([
      includeYieldAnalysis && portfolio.positions.length > 0
        ? yieldAnalyzer.analyzePortfolio(
            portfolio.positions,
            address as `0x${string}`
          )
        : Promise.resolve(null),
      walletBalanceFetcher.getBalances(address as `0x${string}`),
    ]);

    return NextResponse.json(
      serializeBigInts({
        success: true,
        data: {
          ...portfolio,
          ensName, // Include ENS name if available
          yieldAnalysis,
          walletBalances,
        },
      })
    );
  } catch (error) {
    console.error('Portfolio fetch error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch portfolio',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Handle Solana address requests
 */
async function handleSolanaRequest(address: string) {
  try {
    const solanaBalances = await solanaBalanceFetcher.getBalances(address);

    // Convert Solana balances to a portfolio-like response
    const positions = solanaBalances.balances.balances.map((token, index) => ({
      id: `solana-wallet-${index}`,
      chainId: 'solana' as const,
      protocol: {
        id: 'wallet',
        name: 'Wallet',
        logo: '',
      },
      type: 'wallet' as const,
      tokens: [
        {
          address: token.address,
          symbol: token.symbol,
          decimals: token.decimals,
          balance: token.balance,
          balanceFormatted: token.balanceFormatted,
          priceUsd: token.priceUsd,
          valueUsd: token.valueUsd,
        },
      ],
      valueUsd: token.valueUsd,
      yield: null,
    }));

    return NextResponse.json(
      serializeBigInts({
        success: true,
        data: {
          address,
          network: 'solana',
          totalValueUsd: solanaBalances.totalValueUsd,
          positions,
          byChain: {
            solana: {
              chainId: 'solana',
              chainName: 'Solana',
              totalValueUsd: solanaBalances.totalValueUsd,
              positions,
            },
          },
          byProtocol: {
            wallet: {
              protocolId: 'wallet',
              protocolName: 'Wallet',
              totalValueUsd: solanaBalances.totalValueUsd,
              positions,
            },
          },
          byType: {
            wallet: positions,
          },
          walletBalances: {
            address,
            balances: [solanaBalances.balances],
            totalValueUsd: solanaBalances.totalValueUsd,
            fetchedAt: solanaBalances.fetchedAt,
          },
          yieldAnalysis: null, // Solana DeFi protocols not yet supported
          fetchedAt: solanaBalances.fetchedAt,
        },
      })
    );
  } catch (error) {
    console.error('Solana portfolio fetch error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch Solana portfolio',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
