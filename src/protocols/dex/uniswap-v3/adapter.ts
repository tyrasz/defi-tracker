import type { Address, PublicClient } from 'viem';
import { formatUnits } from 'viem';
import { BaseProtocolAdapter } from '../../base-adapter';
import type { ProtocolAddresses, YieldRate } from '../../types';
import type { ChainId } from '@/types/chain';
import type { Position } from '@/types/portfolio';
import type { ProtocolInfo } from '@/types/protocol';
import {
  UNISWAP_V3_NFT_MANAGER_ABI,
  UNISWAP_V3_POOL_ABI,
  UNISWAP_V3_FACTORY_ABI,
} from './abi';
import { UNISWAP_V3_ADDRESSES } from './addresses';

interface UniswapAddresses extends ProtocolAddresses {
  nftPositionManager: Address;
  factory: Address;
}

export class UniswapV3Adapter extends BaseProtocolAdapter {
  readonly protocol: ProtocolInfo = {
    id: 'uniswap-v3',
    name: 'Uniswap V3',
    category: 'dex',
    website: 'https://uniswap.org',
    earnsYield: false,
  };

  readonly supportedChains: ChainId[] = [1, 42161, 10, 8453];

  protected getAddresses(chainId: ChainId): UniswapAddresses | null {
    const addresses = UNISWAP_V3_ADDRESSES[chainId];
    return addresses ? (addresses as UniswapAddresses) : null;
  }

  async hasPositions(
    client: PublicClient,
    address: Address,
    chainId: ChainId
  ): Promise<boolean> {
    const addresses = this.getAddresses(chainId);
    if (!addresses) return false;

    try {
      const balance = await client.readContract({
        address: addresses.nftPositionManager,
        abi: UNISWAP_V3_NFT_MANAGER_ABI,
        functionName: 'balanceOf',
        args: [address],
      });

      return balance > 0n;
    } catch {
      return false;
    }
  }

  async getPositions(
    client: PublicClient,
    address: Address,
    chainId: ChainId
  ): Promise<Position[]> {
    const addresses = this.getAddresses(chainId);
    if (!addresses) return [];

    const positions: Position[] = [];

    try {
      const nftBalance = await client.readContract({
        address: addresses.nftPositionManager,
        abi: UNISWAP_V3_NFT_MANAGER_ABI,
        functionName: 'balanceOf',
        args: [address],
      });

      if (nftBalance === 0n) return [];

      // Fetch all token IDs
      const tokenIdCalls = Array.from({ length: Number(nftBalance) }, (_, i) => ({
        address: addresses.nftPositionManager,
        abi: UNISWAP_V3_NFT_MANAGER_ABI,
        functionName: 'tokenOfOwnerByIndex' as const,
        args: [address, BigInt(i)] as const,
      }));

      const tokenIdResults = await client.multicall({ contracts: tokenIdCalls });

      const tokenIds = tokenIdResults
        .filter((r) => r.status === 'success')
        .map((r) => r.result as bigint);

      // Fetch position data for each token
      const positionCalls = tokenIds.map((tokenId) => ({
        address: addresses.nftPositionManager,
        abi: UNISWAP_V3_NFT_MANAGER_ABI,
        functionName: 'positions' as const,
        args: [tokenId] as const,
      }));

      const positionResults = await client.multicall({
        contracts: positionCalls,
      });

      for (let i = 0; i < positionResults.length; i++) {
        const result = positionResults[i];
        if (result.status !== 'success') continue;

        const positionData = result.result as [
          bigint,
          Address,
          Address,
          Address,
          number,
          number,
          number,
          bigint,
          bigint,
          bigint,
          bigint,
          bigint
        ];

        const [
          ,
          ,
          token0,
          token1,
          fee,
          tickLower,
          tickUpper,
          liquidity,
          ,
          ,
          tokensOwed0,
          tokensOwed1,
        ] = positionData;

        // Skip positions with no liquidity
        if (liquidity === 0n && tokensOwed0 === 0n && tokensOwed1 === 0n) {
          continue;
        }

        const [token0Symbol, token1Symbol, token0Decimals, token1Decimals] =
          await Promise.all([
            this.getTokenSymbol(client, token0),
            this.getTokenSymbol(client, token1),
            this.getTokenDecimals(client, token0),
            this.getTokenDecimals(client, token1),
          ]);

        // Get current tick to determine if position is in range
        let currentTick = 0;
        let inRange = true;
        try {
          const poolAddress = await client.readContract({
            address: addresses.factory,
            abi: UNISWAP_V3_FACTORY_ABI,
            functionName: 'getPool',
            args: [token0, token1, fee],
          });

          if (poolAddress !== '0x0000000000000000000000000000000000000000') {
            const slot0 = await client.readContract({
              address: poolAddress,
              abi: UNISWAP_V3_POOL_ABI,
              functionName: 'slot0',
            });
            currentTick = slot0[1];
            inRange = currentTick >= tickLower && currentTick <= tickUpper;
          }
        } catch {
          // Ignore pool fetch errors
        }

        positions.push({
          id: `uniswap-v3-${chainId}-${tokenIds[i]}`,
          protocol: this.protocol,
          chainId,
          type: 'liquidity',
          tokens: [
            {
              address: token0,
              symbol: token0Symbol,
              decimals: token0Decimals,
              balance: tokensOwed0,
              balanceFormatted: formatUnits(tokensOwed0, token0Decimals),
              priceUsd: 0,
              valueUsd: 0,
            },
            {
              address: token1,
              symbol: token1Symbol,
              decimals: token1Decimals,
              balance: tokensOwed1,
              balanceFormatted: formatUnits(tokensOwed1, token1Decimals),
              priceUsd: 0,
              valueUsd: 0,
            },
          ],
          valueUsd: 0,
          metadata: {
            tokenId: tokenIds[i].toString(),
            fee: fee / 10000, // Convert to percentage
            tickLower,
            tickUpper,
            currentTick,
            inRange,
            liquidity: liquidity.toString(),
          },
        });
      }
    } catch (error) {
      console.error('Error fetching Uniswap V3 positions:', error);
    }

    return positions;
  }

  async getYieldRates(
    _client: PublicClient,
    _chainId: ChainId
  ): Promise<YieldRate[]> {
    // Uniswap V3 doesn't have fixed yield rates - returns from fees vary
    // This would need historical data to estimate APY
    return [];
  }
}
