import { computeVolumeStats } from '@/engine/surge/volume';
import { fetchKrwPerUsd } from '@/services/api/surgeFx';
import { MARKET_REST } from '@/services/api/binance';
import { CRYPTO_NAMES, CRYPTO_TOP_N, MAJOR_CRYPTO_BASES } from '@/services/api/surgeUniverse';
import type { SurgeAsset, SurgeTimeframe } from '@/types/surge';

const QUOTE_SUFFIX = 'USDT';
const KLINE_LIMIT = 21;
const KRW_EOK = 100_000_000;

const BINANCE_INTERVAL: Record<SurgeTimeframe, string> = {
  '15m': '15m',
  '1h': '1h',
  '4h': '4h',
  '1D': '1d',
};

const NON_TRADABLE_BASES = new Set(['USDC', 'FDUSD', 'TUSD', 'USDP', 'DAI', 'BUSD', 'USDE', 'USD1', 'PYUSD', 'EUR', 'AEUR']);
const LEVERAGED_SUFFIX = /(UP|DOWN|BULL|BEAR)$/;

interface Ticker24h {
  symbol: string;
  lastPrice: string;
  priceChangePercent: string;
  quoteVolume: string;
}

function baseOf(symbol: string): string {
  return symbol.slice(0, -QUOTE_SUFFIX.length);
}

function isTradable(ticker: Ticker24h): boolean {
  if (!ticker.symbol.endsWith(QUOTE_SUFFIX)) return false;
  const base = baseOf(ticker.symbol);
  return !NON_TRADABLE_BASES.has(base) && !LEVERAGED_SUFFIX.test(base);
}

async function fetchJson<T>(url: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal, cache: 'no-store' });
  if (!response.ok) throw new Error(`Binance returned ${response.status}`);
  return response.json() as Promise<T>;
}

async function fetchKlineVolumes(symbol: string, timeframe: SurgeTimeframe, signal: AbortSignal): Promise<number[]> {
  const url = `${MARKET_REST.spot}/klines?symbol=${symbol}&interval=${BINANCE_INTERVAL[timeframe]}&limit=${KLINE_LIMIT}`;
  const rows = await fetchJson<unknown[][]>(url, signal);
  return rows.map((row) => Number(row[5]));
}

// Throws when the ticker list cannot be loaded; individual coins that fail keep their previous values
export async function loadCryptoSurge(
  timeframe: SurgeTimeframe,
  signal: AbortSignal,
  previous: SurgeAsset[]
): Promise<SurgeAsset[]> {
  const [tickers, krwPerUsd] = await Promise.all([
    fetchJson<Ticker24h[]>(`${MARKET_REST.spot}/ticker/24hr`, signal),
    fetchKrwPerUsd(signal),
  ]);

  const top = tickers
    .filter(isTradable)
    .sort((a, b) => Number(b.quoteVolume) - Number(a.quoteVolume))
    .slice(0, CRYPTO_TOP_N);

  const results = await Promise.allSettled(
    top.map((ticker) => fetchKlineVolumes(ticker.symbol, timeframe, signal))
  );

  const assets: SurgeAsset[] = [];
  results.forEach((result, index) => {
    const ticker = top[index];
    const base = baseOf(ticker.symbol);
    const quoteVolume = Number(ticker.quoteVolume);

    if (result.status === 'rejected') {
      const kept = previous.find((asset) => asset.id === ticker.symbol);
      if (kept) assets.push(kept);
      return;
    }

    const stats = computeVolumeStats(result.value);
    if (!stats) return;

    assets.push({
      id: ticker.symbol,
      name: CRYPTO_NAMES[base] ?? { KR: base, EN: base },
      ticker: base,
      assetClass: 'crypto',
      sector: MAJOR_CRYPTO_BASES.has(base) ? 'cryptoMajor' : 'cryptoAlt',
      currency: 'USD',
      price: Number(ticker.lastPrice),
      changePct: Number(ticker.priceChangePercent),
      tradingValue: (quoteVolume * krwPerUsd) / KRW_EOK,
      tradingValueLocal: quoteVolume,
      rvol: stats.rvol,
      volumeChangePct: stats.volumeChangePct,
    });
  });

  if (assets.length === 0) throw new Error('No crypto data available');
  return assets;
}
