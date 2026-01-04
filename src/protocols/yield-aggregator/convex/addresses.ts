import type { ChainId } from '@/types/chain';

export const CONVEX_ADDRESSES: Partial<Record<ChainId, {
  booster: `0x${string}`;
  cvxRewardPool: `0x${string}`;
  cvxLockerV2: `0x${string}`;
  cvx: `0x${string}`;
}>> = {
  1: {
    booster: '0xF403C135812408BFbE8713b5A23a04b3D48AAE31',
    cvxRewardPool: '0xCF50b810E57Ac33B91dCF525C6ddd9881B139332',
    cvxLockerV2: '0x72a19342e8F1838460eBFCCEf09F6585e32db86E',
    cvx: '0x4e3FBD56CD56c3e72c1403e103b45Db9da5B9D2B',
  },
};
