import type { LocalizedText } from '@/i18n/types';

export type SurgeTimeframe = '15m' | '1h' | '4h' | '1D';

export type SurgeSortKey = 'name' | 'changePct' | 'tradingValue' | 'rvol' | 'volumeChangePct';

export type SortDirection = 'asc' | 'desc';

export interface SurgeSort {
  key: SurgeSortKey;
  direction: SortDirection;
}

export type AssetClass = 'stock' | 'crypto';

export type Currency = 'KRW' | 'USD';

export type SectorId = 'semi' | 'battery' | 'bio' | 'platform' | 'auto' | 'cryptoMajor' | 'cryptoAlt';

export interface SurgeAsset {
  id: string;
  name: LocalizedText;
  ticker: string;
  assetClass: AssetClass;
  sector: SectorId;
  currency: Currency;
  price: number;
  changePct: number;
  /** Daily trading value in 억 KRW, used for liquidity filtering */
  tradingValue: number;
  /** Daily trading value in the asset's own currency (won or USD) */
  tradingValueLocal: number;
  rvol: number;
  volumeChangePct: number;
}

export type FeedStatus = 'loading' | 'live' | 'simulated' | 'error';

export interface FeedState {
  data: SurgeAsset[];
  updatedAt: number | null;
  status: FeedStatus;
}

export interface SurgeFilters {
  timeframe: SurgeTimeframe;
  minRvol: number;
  minTradingValue: number;
  changeRange: [number, number];
  query: string;
}
