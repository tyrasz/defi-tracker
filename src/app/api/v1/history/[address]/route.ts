import { NextRequest, NextResponse } from 'next/server';
import { isAddress, type Address } from 'viem';
import { snapshotService, pnlCalculator, historyStore } from '@/core/history';
import { walletBalanceFetcher } from '@/core/wallet/wallet-balance-fetcher';
import { ensResolver } from '@/core/ens';

interface RouteParams {
  params: Promise<{ address: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { address: addressParam } = await params;

  // Resolve ENS or validate address
  let address: Address;
  if (isAddress(addressParam)) {
    address = addressParam;
  } else if (ensResolver.isEnsName(addressParam)) {
    const result = await ensResolver.resolveToAddress(addressParam);
    if (!result.address) {
      return NextResponse.json(
        { success: false, error: `Could not resolve ENS name: ${addressParam}` },
        { status: 400 }
      );
    }
    address = result.address;
  } else {
    return NextResponse.json(
      { success: false, error: 'Invalid Ethereum address or ENS name' },
      { status: 400 }
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const days = parseInt(searchParams.get('days') || '30', 10);
  const includeSnapshots = searchParams.get('snapshots') === 'true';
  const includePnL = searchParams.get('pnl') === 'true';

  try {
    // Get portfolio history
    const history = await snapshotService.getHistory(address as Address, days);
    const valueChange = await snapshotService.getValueChange(address as Address, days);

    const response: Record<string, unknown> = {
      success: true,
      address,
      period: {
        days,
        startDate: new Date(history.startDate).toISOString(),
        endDate: new Date(history.endDate).toISOString(),
      },
      valueChange,
      valueHistory: history.valueHistory,
    };

    if (includeSnapshots) {
      response.snapshots = history.snapshots;
    }

    if (includePnL) {
      const balances = await walletBalanceFetcher.getBalances(address as Address);
      const positions = balances.balances.flatMap((chain) =>
        chain.balances.map((token) => ({
          chainId: chain.chainId,
          address: token.address,
          symbol: token.symbol,
          balance: token.balance,
          valueUsd: token.valueUsd,
          priceUsd: token.priceUsd,
        }))
      );
      response.pnl = await pnlCalculator.calculatePnL(address as Address, positions);
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching history:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch history' },
      { status: 500 }
    );
  }
}

// POST endpoint to take a snapshot
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { address: addressParam } = await params;

  // Resolve ENS or validate address
  let address: Address;
  if (isAddress(addressParam)) {
    address = addressParam;
  } else if (ensResolver.isEnsName(addressParam)) {
    const result = await ensResolver.resolveToAddress(addressParam);
    if (!result.address) {
      return NextResponse.json(
        { success: false, error: `Could not resolve ENS name: ${addressParam}` },
        { status: 400 }
      );
    }
    address = result.address;
  } else {
    return NextResponse.json(
      { success: false, error: 'Invalid Ethereum address or ENS name' },
      { status: 400 }
    );
  }

  try {
    const snapshot = await snapshotService.takeSnapshot(address);

    return NextResponse.json({
      success: true,
      message: 'Snapshot created successfully',
      snapshot,
    });
  } catch (error) {
    console.error('Error taking snapshot:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to take snapshot' },
      { status: 500 }
    );
  }
}
