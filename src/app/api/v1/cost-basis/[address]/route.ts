import { NextRequest, NextResponse } from 'next/server';
import { isAddress, type Address } from 'viem';
import type { ChainId, EvmChainId } from '@/types/chain';
import { pnlCalculator } from '@/core/history';
import { historyStore } from '@/core/history';

interface RouteParams {
  params: Promise<{ address: string }>;
}

// GET all cost bases for an address
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { address } = await params;

  if (!isAddress(address)) {
    return NextResponse.json(
      { success: false, error: 'Invalid Ethereum address' },
      { status: 400 }
    );
  }

  try {
    const costBases = await historyStore.getAllCostBases(address as Address);

    return NextResponse.json({
      success: true,
      address,
      costBases,
    });
  } catch (error) {
    console.error('Error fetching cost bases:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch cost bases' },
      { status: 500 }
    );
  }
}

// POST to add or update cost basis
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { address } = await params;

  if (!isAddress(address)) {
    return NextResponse.json(
      { success: false, error: 'Invalid Ethereum address' },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    const { chainId, tokenAddress, symbol, totalQuantity, totalCostUsd } = body;

    if (!chainId || !tokenAddress || !symbol) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: chainId, tokenAddress, symbol' },
        { status: 400 }
      );
    }

    // Validate chainId is a valid EVM chain or 'solana'
    const validChainIds: ChainId[] = [1, 42161, 10, 8453, 137, 43114, 56, 'solana'];
    if (!validChainIds.includes(chainId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid chainId' },
        { status: 400 }
      );
    }

    const costBasis = await pnlCalculator.setCostBasis(
      address as Address,
      chainId as ChainId,
      tokenAddress,
      symbol,
      BigInt(totalQuantity || '0'),
      parseFloat(totalCostUsd || '0')
    );

    return NextResponse.json({
      success: true,
      message: 'Cost basis updated successfully',
      costBasis,
    });
  } catch (error) {
    console.error('Error updating cost basis:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update cost basis' },
      { status: 500 }
    );
  }
}
