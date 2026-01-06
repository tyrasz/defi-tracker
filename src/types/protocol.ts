export type ProtocolCategory =
  | 'lending'
  | 'dex'
  | 'liquid-staking'
  | 'yield-aggregator'
  | 'derivatives'
  | 'restaking'
  | 'cdp';

export interface ProtocolInfo {
  id: string;
  name: string;
  category: ProtocolCategory;
  website: string;
  logo?: string;
  /** Whether this protocol earns passive yield (vs just position tracking like DEX LPs) */
  earnsYield: boolean;
}

/** Categories that typically earn passive yield */
export const YIELD_CATEGORIES: ProtocolCategory[] = [
  'lending',
  'liquid-staking',
  'yield-aggregator',
  'restaking',
  'cdp',
];

/** Categories that are position tracking only (fees, not yield) */
export const TRACKING_CATEGORIES: ProtocolCategory[] = ['dex', 'derivatives'];
