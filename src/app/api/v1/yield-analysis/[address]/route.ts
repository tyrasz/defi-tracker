import { NextRequest, NextResponse } from 'next/server';
import { isAddress } from 'viem';
import { portfolioAggregator } from '@/core/aggregator';
import { yieldAnalyzer } from '@/core/yield';
import { priceFetcher } from '@/core/pricing';
import { serializeBigInts } from '@/lib/utils/serialize';
import type { ChainId } from '@/types/chain';

interface RouteParams {
  params: Promise<{ address: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { address } = await params;

  if (!isAddress(address)) {
    return NextResponse.json(
      { success: false, error: 'Invalid Ethereum address' },
      { status: 400 }
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const chainsParam = searchParams.get('chains');

  let chainIds: ChainId[] | undefined;
  if (chainsParam) {
    chainIds = chainsParam.split(',').map(Number) as ChainId[];
  }

  try {
    // Fetch portfolio first
    const portfolio = await portfolioAggregator.getPortfolio(
      address as `0x${string}`,
      chainIds
    );

    // Enrich with prices
    await priceFetcher.enrichPositionsWithPrices(portfolio.positions);

    if (portfolio.positions.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          address,
          totalCurrentYield: 0,
          totalPotentialYield: 0,
          opportunities: [],
          idleAssets: [],
          analyzedAt: Date.now(),
          message: 'No positions found for this address',
        },
      });
    }

    // Analyze yield opportunities
    const yieldAnalysis = await yieldAnalyzer.analyzePortfolio(
      portfolio.positions,
      address as `0x${string}`
    );

    return NextResponse.json(
      serializeBigInts({
        success: true,
        data: yieldAnalysis,
      })
    );
  } catch (error) {
    console.error('Yield analysis error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to analyze yield opportunities',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
