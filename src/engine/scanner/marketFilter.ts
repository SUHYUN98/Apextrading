import type { PerpMarket } from '@/services/scanner/types';
import type { ScannerSettings, ScannerSkipReason } from '@/types/scanner';

const DAY_MS = 86_400_000;

export function findExclusionReason(
  market: PerpMarket,
  settings: ScannerSettings,
  now: number
): ScannerSkipReason | null {
  if (market.quoteVolume24h < settings.minQuoteVolume24h) return 'low-volume';
  if (market.spreadPct === null) return 'unknown-spread';
  if (market.spreadPct > settings.maxSpreadPct) return 'wide-spread';
  if (!Number.isFinite(market.listedAt) || market.listedAt <= 0) return 'unknown-listing';
  if (now - market.listedAt < settings.minListingDays * DAY_MS) return 'new-listing';
  return null;
}
