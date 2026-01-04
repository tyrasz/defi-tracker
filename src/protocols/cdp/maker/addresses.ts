import type { ChainId } from '@/types/chain';

export const MAKER_ADDRESSES: Partial<Record<ChainId, {
  sDAI: `0x${string}`;
  dai: `0x${string}`;
  pot: `0x${string}`;
  usds: `0x${string}`;
  sUSDS: `0x${string}`;
}>> = {
  1: {
    sDAI: '0x83F20F44975D03b1b09e64809B757c47f942BEeA',
    dai: '0x6B175474E89094C44Da98b954EesdeeCB5dC3F0f',
    pot: '0x197E90f9FAD81970bA7976f33CbD77088E5D7cf7',
    usds: '0xdC035D45d973E3EC169d2276DDab16f1e407384F',
    sUSDS: '0xa3931d71877C0E7a3148CB7Eb4463524FEc27fbD',
  },
};
