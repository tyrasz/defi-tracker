import type { ChainId } from '@/types/chain';

export const SPARK_ADDRESSES: Partial<Record<ChainId, {
  pool: `0x${string}`;
  poolDataProvider: `0x${string}`;
}>> = {
  1: {
    pool: '0xC13e21B648A5Ee794902342038FF3aDAB66BE987',
    poolDataProvider: '0xFc21d6d146E6086B8359705C8b28512a983db0cb',
  },
};
