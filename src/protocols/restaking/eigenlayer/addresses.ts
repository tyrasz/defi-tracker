import type { ChainId } from '@/types/chain';

export const EIGENLAYER_ADDRESSES: Partial<Record<ChainId, {
  strategyManager: `0x${string}`;
  delegationManager: `0x${string}`;
  strategies: {
    address: `0x${string}`;
    name: string;
    underlyingToken: `0x${string}`;
    symbol: string;
  }[];
}>> = {
  1: {
    strategyManager: '0x858646372CC42E1A627fcE94aa7A7033e7CF075A',
    delegationManager: '0x39053D51B77DC0d36036Fc1fCc8Cb819df8Ef37A',
    strategies: [
      {
        address: '0x93c4b944D05dfe6df7645A86cd2206016c51564D',
        name: 'stETH Strategy',
        underlyingToken: '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84',
        symbol: 'stETH',
      },
      {
        address: '0x1BeE69b7dFFfA4E2d53C2a2Df135C388AD25dCD2',
        name: 'rETH Strategy',
        underlyingToken: '0xae78736Cd615f374D3085123A210448E74Fc6393',
        symbol: 'rETH',
      },
      {
        address: '0x54945180dB7943c0ed0FEE7EdaB2Bd24620256bc',
        name: 'cbETH Strategy',
        underlyingToken: '0xBe9895146f7AF43049ca1c1AE358B0541Ea49704',
        symbol: 'cbETH',
      },
      {
        address: '0x57ba429517c3473B6d34CA9aCd56c0e735b94c02',
        name: 'osETH Strategy',
        underlyingToken: '0xf1C9acDc66974dFB6dEcB12aA385b9cD01190E38',
        symbol: 'osETH',
      },
      {
        address: '0x0Fe4F44beE93503346A3Ac9EE5A26b130a5796d6',
        name: 'swETH Strategy',
        underlyingToken: '0xf951E335afb289353dc249e82926178EaC7DEd78',
        symbol: 'swETH',
      },
      {
        address: '0x13760F50a9d7377e4F20CB8CF9e4c26586c658ff',
        name: 'ankrETH Strategy',
        underlyingToken: '0xE95A203B1a91a908F9B9CE46459d101078c2c3cb',
        symbol: 'ankrETH',
      },
      {
        address: '0xa4C637e0F704745D182e4D38cAb7E7485321d059',
        name: 'oETH Strategy',
        underlyingToken: '0x856c4Efb76C1D1AE02e20CEB03A2A6a08b0b8dC3',
        symbol: 'oETH',
      },
      {
        address: '0x7CA911E83dabf90C90dD3De5411a10F1A6112184',
        name: 'wBETH Strategy',
        underlyingToken: '0xa2E3356610840701BDf5611a53974510Ae27E2e1',
        symbol: 'wBETH',
      },
      {
        address: '0x8CA7A5d6f3acd3A7A8bC468a8CD0FB14B6BD28b6',
        name: 'sfrxETH Strategy',
        underlyingToken: '0xac3E018457B222d93114458476f3E3416Abbe38F',
        symbol: 'sfrxETH',
      },
      {
        address: '0xAe60d8180437b5C34bB956822ac2710972584473',
        name: 'lsETH Strategy',
        underlyingToken: '0x8c1BEd5b9a0928467c9B1341Da1D7BD5e10b6549',
        symbol: 'lsETH',
      },
      {
        address: '0x298aFB19A105D59E74658C4C334Ff360BadE6dd2',
        name: 'mETH Strategy',
        underlyingToken: '0xd5F7838F5C461fefF7FE49ea5ebaF7728bB0ADfa',
        symbol: 'mETH',
      },
    ],
  },
};
