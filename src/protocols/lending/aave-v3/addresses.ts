import type { Address } from 'viem';
import type { ChainId } from '@/types/chain';

interface AaveV3ChainAddresses {
  pool: Address;
  dataProvider: Address;
}

export const AAVE_V3_ADDRESSES: Partial<Record<ChainId, AaveV3ChainAddresses>> = {
  1: {
    pool: '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2',
    dataProvider: '0x7B4EB56E7CD4b454BA8ff71E4518426369a138a3',
  },
  42161: {
    pool: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
    dataProvider: '0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654',
  },
  10: {
    pool: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
    dataProvider: '0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654',
  },
  8453: {
    pool: '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5',
    dataProvider: '0x2d8A3C5677189723C4cB8873CfC9C8976FDF38Ac',
  },
};
