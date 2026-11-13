import type { CandleData } from '@/types';

export type ExchangeId = 'binance' | 'bybit';

export type ScannerTimeframe = '15m' | '1H' | '4H';

export const SCANNER_TIMEFRAME_MS: Record<ScannerTimeframe, number> = {
  '15m': 15 * 60_000,
  '1H': 60 * 60_000,
  '4H': 4 * 60 * 60_000,
};

export interface PerpMarket {
  exchange: ExchangeId;
  symbol: string;
  baseAsset: string;
  listedAt: number;
  quoteVolume24h: number;
  lastPrice: number;
  spreadPct: number | null;
}

export interface CandleStreamHandlers {
  onCandle: (candle: CandleData) => void;
  onError: (message: string) => void;
}

export interface ExchangeAdapter {
  id: ExchangeId;
  listMarkets: () => Promise<PerpMarket[]>;
  fetchCandles: (symbol: string, timeframe: ScannerTimeframe, limit: number) => Promise<CandleData[]>;
  subscribeClosedCandles: (symbol: string, timeframe: ScannerTimeframe, handlers: CandleStreamHandlers) => () => void;
}
