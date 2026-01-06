import type { Address, PublicClient } from 'viem';
import { formatUnits } from 'viem';
import { BaseProtocolAdapter } from '../../base-adapter';
import type { YieldRate } from '../../types';
import type { ChainId } from '@/types/chain';
import type { Position } from '@/types/portfolio';
import type { ProtocolInfo } from '@/types/protocol';
import { MAKER_ADDRESSES } from './addresses';
import { ERC4626_ABI, POT_ABI } from './abi';

export class MakerAdapter extends BaseProtocolAdapter {
  readonly protocol: ProtocolInfo = {
    id: 'maker',
    name: 'Sky (Maker)',
    category: 'cdp',
    website: 'https://sky.money',
    earnsYield: true,
  };

  readonly supportedChains: ChainId[] = [1]; // Ethereum mainnet only

  protected getAddresses(chainId: ChainId) {
    return MAKER_ADDRESSES[chainId] || null;
  }

  async hasPositions(
    client: PublicClient,
    address: Address,
    chainId: ChainId
  ): Promise<boolean> {
    const config = MAKER_ADDRESSES[chainId];
    if (!config) return false;

    try {
      const [sDAIBalance, sUSDSBalance] = await Promise.all([
        client.readContract({
          address: config.sDAI,
          abi: ERC4626_ABI,
          functionName: 'balanceOf',
          args: [address],
        }),
        client.readContract({
          address: config.sUSDS,
          abi: ERC4626_ABI,
          functionName: 'balanceOf',
          args: [address],
        }),
      ]);

      return sDAIBalance > 0n || sUSDSBalance > 0n;
    } catch {
      return false;
    }
  }

  async getPositions(
    client: PublicClient,
    address: Address,
    chainId: ChainId
  ): Promise<Position[]> {
    const config = MAKER_ADDRESSES[chainId];
    if (!config) return [];

    const positions: Position[] = [];

    try {
      // Check sDAI balance
      const sDAIBalance = await client.readContract({
        address: config.sDAI,
        abi: ERC4626_ABI,
        functionName: 'balanceOf',
        args: [address],
      });

      if (sDAIBalance > 0n) {
        const daiAmount = await client.readContract({
          address: config.sDAI,
          abi: ERC4626_ABI,
          functionName: 'convertToAssets',
          args: [sDAIBalance],
        });

        const dsr = await this.getDSR(client, config.pot);

        positions.push({
          id: `maker-sdai-${chainId}`,
          protocol: this.protocol,
          chainId,
          type: 'savings',
          tokens: [
            {
              address: config.sDAI,
              symbol: 'sDAI',
              decimals: 18,
              balance: sDAIBalance,
              balanceFormatted: formatUnits(sDAIBalance, 18),
              priceUsd: 0,
              valueUsd: 0,
            },
          ],
          valueUsd: 0,
          yield: {
            apy: dsr,
            apr: dsr,
          },
          metadata: {
            underlyingDAI: formatUnits(daiAmount, 18),
          },
        });
      }

      // Check sUSDS balance
      const sUSDSBalance = await client.readContract({
        address: config.sUSDS,
        abi: ERC4626_ABI,
        functionName: 'balanceOf',
        args: [address],
      });

      if (sUSDSBalance > 0n) {
        const usdsAmount = await client.readContract({
          address: config.sUSDS,
          abi: ERC4626_ABI,
          functionName: 'convertToAssets',
          args: [sUSDSBalance],
        });

        // sUSDS uses same rate as DSR
        const dsr = await this.getDSR(client, config.pot);

        positions.push({
          id: `maker-susds-${chainId}`,
          protocol: this.protocol,
          chainId,
          type: 'savings',
          tokens: [
            {
              address: config.sUSDS,
              symbol: 'sUSDS',
              decimals: 18,
              balance: sUSDSBalance,
              balanceFormatted: formatUnits(sUSDSBalance, 18),
              priceUsd: 0,
              valueUsd: 0,
            },
          ],
          valueUsd: 0,
          yield: {
            apy: dsr,
            apr: dsr,
          },
          metadata: {
            underlyingUSDS: formatUnits(usdsAmount, 18),
          },
        });
      }
    } catch (error) {
      console.error('Error fetching Maker positions:', error);
    }

    return positions;
  }

  async getYieldRates(
    client: PublicClient,
    chainId: ChainId
  ): Promise<YieldRate[]> {
    const config = MAKER_ADDRESSES[chainId];
    if (!config) return [];

    const rates: YieldRate[] = [];

    try {
      const dsr = await this.getDSR(client, config.pot);

      rates.push({
        protocol: this.protocol.id,
        chainId,
        asset: config.sDAI,
        assetSymbol: 'sDAI',
        type: 'savings',
        apy: dsr,
        apr: dsr,
      });

      rates.push({
        protocol: this.protocol.id,
        chainId,
        asset: config.sUSDS,
        assetSymbol: 'sUSDS',
        type: 'savings',
        apy: dsr,
        apr: dsr,
      });
    } catch (error) {
      console.error('Error fetching Maker yield rates:', error);
    }

    return rates;
  }

  private async getDSR(client: PublicClient, potAddress: Address): Promise<number> {
    try {
      const dsr = await client.readContract({
        address: potAddress,
        abi: POT_ABI,
        functionName: 'dsr',
      });

      // DSR is stored as a ray (1e27) per-second rate
      // Convert to APY: (dsr / 1e27) ^ (seconds_per_year) - 1
      const dsrPerSecond = Number(dsr) / 1e27;
      const secondsPerYear = 365.25 * 24 * 60 * 60;
      const apy = Math.pow(dsrPerSecond, secondsPerYear) - 1;

      return apy;
    } catch {
      return 0;
    }
  }
}

export const makerAdapter = new MakerAdapter();
