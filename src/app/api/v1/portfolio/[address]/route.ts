import { NextRequest, NextResponse } from 'next/server';
import { isAddress, type Address } from 'viem';
import { portfolioAggregator } from '@/core/aggregator';
import { yieldAnalyzer } from '@/core/yield';
import { priceFetcher } from '@/core/pricing';
import { walletBalanceFetcher } from '@/core/wallet';
import { serializeBigInts } from '@/lib/utils/serialize';
import { ensResolver } from '@/core/ens';
import type { ChainId } from '@/types/chain';

interface RouteParams {
  params: Promise<{ address: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { address: addressParam } = await params;

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
      { success: false, error: 'Invalid Ethereum address or ENS name' },
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
