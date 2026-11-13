import type { ScannerSettings } from '@/types/scanner';

export const DEFAULT_SCANNER_SETTINGS: ScannerSettings = {
  timeframe: '1H',
  minQuoteVolume24h: 10_000_000,
  maxSpreadPct: 0.1,
  minCandles: 250,
  minListingDays: 30,
  universeSize: 40,
  minRvol: 1.5,
  volatilityThreshold: 60,
  reversalThreshold: 65,
  continuationThreshold: 65,
};
