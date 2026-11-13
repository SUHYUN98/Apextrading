import { bucketVolumes, computeVolumeStats } from '@/engine/surge/volume';
import { fetchYahooChartSnapshot, type YahooChartSnapshot } from '@/services/api/yahoo';
import { fetchKrwPerUsd } from '@/services/api/surgeFx';
import { STOCK_UNIVERSE, type StockListing } from '@/services/api/surgeUniverse';
import type { Currency, SurgeAsset, SurgeTimeframe } from '@/types/surge';

const HOUR_MS = 60 * 60 * 1000;
const KRW_EOK = 100_000_000;

interface StockFeedConfig {
  range: string;
  interval: string;
  bucketMs?: number;
}

// Yahoo has no 4h interval, so 4h is built by summing hourly bars
const STOCK_FEED: Record<SurgeTimeframe, StockFeedConfig> = {
  '15m': { range: '1mo', interval: '15m' },
  '1h': { range: '3mo', interval: '60m' },
  '4h': { range: '3mo', interval: '60m', bucketMs: 4 * HOUR_MS },
  '1D': { range: '1y', interval: '1d' },
};

function currencyOf(symbol: string): Currency {
  return /\.(KS|KQ)$/.test(symbol) ? 'KRW' : 'USD';
}

function displayTicker(symbol: string): string {
  return symbol.replace(/\.(KS|KQ)$/, '');
}

function buildAsset(
  listing: StockListing,
  snapshot: YahooChartSnapshot,
  config: StockFeedConfig,
  krwPerUsd: number
): SurgeAsset | null {
  const volumes = config.bucketMs
    ? bucketVolumes(snapshot.timesMs, snapshot.volumes, config.bucketMs)
    : snapshot.volumes;
  const stats = computeVolumeStats(volumes);
  if (!stats) return null;

  const currency = currencyOf(listing.symbol);
  const tradingValueLocal = snapshot.price * snapshot.sessionVolume;
  const tradingValueKrw = currency === 'KRW' ? tradingValueLocal : tradingValueLocal * krwPerUsd;
  const changePct =
    snapshot.previousClose > 0 ? ((snapshot.price - snapshot.previousClose) / snapshot.previousClose) * 100 : 0;

  return {
    id: listing.symbol,
    name: listing.name,
    ticker: displayTicker(listing.symbol),
    assetClass: 'stock',
    sector: listing.sector,
    currency,
    price: snapshot.price,
    changePct,
    tradingValue: tradingValueKrw / KRW_EOK,
    tradingValueLocal,
    rvol: stats.rvol,
    volumeChangePct: stats.volumeChangePct,
  };
}

// Throws only when no listing could be loaded, so the caller can show the fallback state
export async function loadStockSurge(
  timeframe: SurgeTimeframe,
  signal: AbortSignal,
  previous: SurgeAsset[]
): Promise<SurgeAsset[]> {
  const config = STOCK_FEED[timeframe];
  const krwPerUsdPromise = fetchKrwPerUsd(signal);
  const snapshots = await Promise.allSettled(
    STOCK_UNIVERSE.map((listing) => fetchYahooChartSnapshot(listing.symbol, config.range, config.interval, signal))
  );
  const krwPerUsd = await krwPerUsdPromise;

  const assets: SurgeAsset[] = [];
  snapshots.forEach((result, index) => {
    const listing = STOCK_UNIVERSE[index];
    const built = result.status === 'fulfilled' ? buildAsset(listing, result.value, config, krwPerUsd) : null;
    if (built) {
      assets.push(built);
      return;
    }
    const kept = previous.find((asset) => asset.id === listing.symbol);
    if (kept) assets.push(kept);
  });

  if (assets.length === 0) throw new Error('No stock quotes available');
  return assets;
}
