import type { LocalizedText } from '@/i18n/types';
import type { ExchangeId, ScannerTimeframe } from '@/services/scanner/types';

export type SignalKind = 'volatility' | 'reversal' | 'continuation';

export type SignalDirection = 'long' | 'short' | 'undetermined';

export type ScannerSkipReason =
  | 'low-volume'
  | 'unknown-spread'
  | 'wide-spread'
  | 'unknown-listing'
  | 'new-listing'
  | 'fetch-failed'
  | 'data-issue'
  | 'short-history';

export interface IndicatorReading {
  label: LocalizedText;
  value: string;
}

export interface DetectedSignal {
  kind: SignalKind;
  direction: SignalDirection;
  score: number;
  signalTime: number;
  price: number;
  readings: IndicatorReading[];
  evidence: LocalizedText[];
  invalidation: { price: number | null; text: LocalizedText };
}

export interface ScannerSignal extends DetectedSignal {
  id: string;
  exchange: ExchangeId;
  symbol: string;
  baseAsset: string;
  timeframe: ScannerTimeframe;
  chartUrl: string;
}

export interface ScannerSettings {
  timeframe: ScannerTimeframe;
  minQuoteVolume24h: number;
  maxSpreadPct: number;
  minCandles: number;
  minListingDays: number;
  universeSize: number;
  minRvol: number;
  volatilityThreshold: number;
  reversalThreshold: number;
  continuationThreshold: number;
}

export type DetectionThresholds = Pick<
  ScannerSettings,
  'minRvol' | 'volatilityThreshold' | 'reversalThreshold' | 'continuationThreshold'
>;

export interface ScanOutcome {
  signals: ScannerSignal[];
  scanned: number;
  skipped: Partial<Record<ScannerSkipReason, number>>;
  exchangeErrors: Partial<Record<ExchangeId, string>>;
  finishedAt: number;
}
