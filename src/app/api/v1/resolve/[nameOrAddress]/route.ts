import { NextRequest, NextResponse } from 'next/server';
import { isAddress } from 'viem';
import { ensResolver } from '@/core/ens';

interface RouteParams {
  params: Promise<{ nameOrAddress: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { nameOrAddress } = await params;

  try {
    const result = await ensResolver.resolveToAddress(nameOrAddress);

    if (!result.address) {
      return NextResponse.json(
        {
          success: false,
          error: 'Could not resolve to an Ethereum address',
          input: nameOrAddress,
        },
        { status: 404 }
      );
    }

    // Get avatar if available
    const avatar = await ensResolver.getEnsAvatar(nameOrAddress);

    return NextResponse.json({
      success: true,
      input: nameOrAddress,
      address: result.address,
      ensName: result.ensName,
      isEns: result.isEns,
      avatar,
    });
  } catch (error) {
    console.error('Error resolving address/ENS:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to resolve address or ENS name',
        input: nameOrAddress,
      },
      { status: 500 }
    );
  }
}
