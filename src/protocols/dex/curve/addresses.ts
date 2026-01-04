import type { Address } from 'viem';
import type { ChainId } from '@/types/chain';

interface CurveAddresses {
  registry: Address;
  gaugeController?: Address;
}

// Common Curve LP tokens to check directly (most popular pools)
interface CurvePool {
  lpToken: Address;
  gauge?: Address;
  name: string;
  symbol: string;
}

export const CURVE_ADDRESSES: Partial<Record<ChainId, CurveAddresses>> = {
  1: {
    registry: '0x90E00ACe148ca3b23Ac1bC8C240C2a7Dd9c2d7f5',
    gaugeController: '0x2F50D538606Fa9EDD2B11E2446BEb18C9D5846bB',
  },
  42161: {
    registry: '0x445FE580eF8d70FF569aB36e80c647af338db351',
  },
  10: {
    registry: '0x445FE580eF8d70FF569aB36e80c647af338db351',
  },
};

// Popular Curve pools to check directly for faster position detection
export const CURVE_POPULAR_POOLS: Partial<Record<ChainId, CurvePool[]>> = {
  1: [
    {
      lpToken: '0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490',
      gauge: '0xbFcF63294aD7105dEa65aA58F8AE5BE2D9d0952A',
      name: 'Curve.fi DAI/USDC/USDT',
      symbol: '3Crv',
    },
    {
      lpToken: '0x06325440D014e39736583c165C2963BA99fAf14E',
      gauge: '0x182B723a58739a9c974cFDB385ceaDb237453c28',
      name: 'Curve.fi ETH/stETH',
      symbol: 'steCRV',
    },
    {
      lpToken: '0xC25a3A3b969415c80451098fa907EC722572917F',
      gauge: '0xA90996896660DEcC6E997655E065b23788857849',
      name: 'Curve.fi sUSD',
      symbol: 'sCrv',
    },
  ],
  42161: [
    {
      lpToken: '0x7f90122BF0700F9E7e1F688fe926940E8839F353',
      name: 'Curve.fi 2CRV',
      symbol: '2CRV',
    },
  ],
};
