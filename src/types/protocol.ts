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
}
