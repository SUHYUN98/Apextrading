import type { CandleData, Timeframe } from '@/types';
import { logMarketDataError } from '@/services/marketData/diagnostics';

// Yahoo Finance interval mapping
const YAHOO_INTERVAL_MAP: Record<Timeframe, { interval: string; range: string }> = {
  '5m': { interval: '5m', range: '1mo' },
  '15m': { interval: '15m', range: '1mo' },
  '1H': { interval: '60m', range: '3mo' },
  '4H': { interval: '1h', range: '6mo' }, // Yahoo doesn't have 4h, use 1h
  '1D': { interval: '1d', range: '1y' },
};

export interface YahooQuote {
  symbol: string;
  regularMarketPrice: number;
  regularMarketChangePercent: number;
  regularMarketVolume: number;
  marketCap: number;
  currency: string;
  shortName: string;
}

interface YahooChartResponse {
  chart: {
    result: Array<{
      meta: {
        symbol: string;
        regularMarketPrice: number;
        chartPreviousClose: number;
        regularMarketVolume: number;
        shortName: string;
      };
      timestamp: number[];
      indicators: {
        quote: Array<{
          open: (number | null)[];
          high: (number | null)[];
          low: (number | null)[];
          close: (number | null)[];
          volume: (number | null)[];
        }>;
      };
    }> | null;
    error?: { code: string; description: string };
  };
}

// In-memory cache for fallback when rate-limited
const cache = new Map<string, { data: CandleData[]; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getEdgeFunctionUrl(): string {
  const url = import.meta.env.VITE_SUPABASE_URL;
  return `${url}/functions/v1/yahoo-finance`;
}

export interface YahooChartSnapshot {
  price: number;
  previousClose: number;
  sessionVolume: number;
  timesMs: number[];
  volumes: number[];
}

export async function fetchYahooChartSnapshot(
  ticker: string,
  range: string,
  interval: string,
  signal?: AbortSignal
): Promise<YahooChartSnapshot> {
  const url = `${getEdgeFunctionUrl()}?ticker=${encodeURIComponent(ticker)}&range=${range}&interval=${interval}`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
    cache: 'no-store',
    signal,
  });
  if (!response.ok) throw new Error(`Yahoo Finance proxy returned ${response.status}`);

  const data: YahooChartResponse = await response.json();
  const result = data.chart?.result?.[0];
  if (!result) throw new Error(data.chart?.error?.description || 'No data from Yahoo Finance');

  const quote = result.indicators.quote[0];
  const timesMs: number[] = [];
  const volumes: number[] = [];
  (result.timestamp ?? []).forEach((time, index) => {
    timesMs.push(time * 1000);
    volumes.push(quote?.volume[index] ?? 0);
  });

  return {
    price: result.meta.regularMarketPrice,
    previousClose: result.meta.chartPreviousClose,
    sessionVolume: result.meta.regularMarketVolume ?? 0,
    timesMs,
    volumes,
  };
}

const FOUR_HOUR_SECONDS = 4 * 60 * 60;

// Buckets are aligned to UTC epoch boundaries; TradingView session-based bars can start at different times.
export function aggregateCandlesToUtcBuckets(candles: CandleData[], bucketSeconds: number): CandleData[] {
  const uniqueByTime = new Map<number, CandleData>();
  for (const candle of candles) uniqueByTime.set(candle.time, candle);
  const sorted = [...uniqueByTime.values()].sort((a, b) => a.time - b.time);

  const buckets = new Map<number, CandleData>();
  for (const candle of sorted) {
    const start = Math.floor(candle.time / bucketSeconds) * bucketSeconds;
    const current = buckets.get(start);
    if (!current) {
      buckets.set(start, { ...candle, time: start });
      continue;
    }
    current.high = Math.max(current.high, candle.high);
    current.low = Math.min(current.low, candle.low);
    current.close = candle.close;
    current.volume += candle.volume;
  }
  return [...buckets.values()];
}

export async function fetchYahooCandles(
  ticker: string,
  timeframe: Timeframe
): Promise<{ candles: CandleData[]; cached: boolean }> {
  const { interval, range } = YAHOO_INTERVAL_MAP[timeframe];
  const cacheKey = `${ticker}-${timeframe}`;

  // Check cache first
  const cached = cache.get(cacheKey);
  const now = Date.now();
  if (cached && now - cached.timestamp < CACHE_TTL) {
    return { candles: cached.data, cached: true };
  }

  try {
    const edgeUrl = getEdgeFunctionUrl();
    const url = `${edgeUrl}?ticker=${encodeURIComponent(ticker)}&range=${range}&interval=${interval}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
    });

    if (!response.ok) {
      logMarketDataError('yahoo-proxy', {
        ticker,
        status: response.status,
        body: (await response.text().catch(() => '')).slice(0, 300),
        hint: 'Non-2xx from the Supabase yahoo-finance proxy. Check the edge function logs; 4xx/5xx from Yahoo itself are passed through.',
      });
      // Try to serve stale cache
      if (cached) {
        return { candles: cached.data, cached: true };
      }
      throw new Error(`Yahoo Finance proxy returned ${response.status}`);
    }

    const data: YahooChartResponse = await response.json();

    if (!data.chart?.result || data.chart.result.length === 0) {
      if (cached) {
        return { candles: cached.data, cached: true };
      }
      throw new Error(data.chart?.error?.description || 'No data from Yahoo Finance');
    }

    const result = data.chart.result[0];
    const timestamps = result.timestamp || [];
    const quote = result.indicators.quote[0];

    const candles: CandleData[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      if (
        quote.open[i] == null ||
        quote.high[i] == null ||
        quote.low[i] == null ||
        quote.close[i] == null
      ) {
        continue;
      }
      candles.push({
        time: timestamps[i],
        open: quote.open[i] as number,
        high: quote.high[i] as number,
        low: quote.low[i] as number,
        close: quote.close[i] as number,
        volume: quote.volume[i] != null ? quote.volume[i] as number : 0,
      });
    }

    const finalCandles = timeframe === '4H' ? aggregateCandlesToUtcBuckets(candles, FOUR_HOUR_SECONDS) : candles;
    cache.set(cacheKey, { data: finalCandles, timestamp: now });

    return { candles: finalCandles, cached: false };
  } catch (err) {
    // Fall back to stale cache
    if (cached) {
      return { candles: cached.data, cached: true };
    }
    throw err;
  }
}

export async function fetchYahooQuote(ticker: string): Promise<YahooQuote | null> {
  try {
    // Use 1d range to get current quote metadata
    const edgeUrl = getEdgeFunctionUrl();
    const url = `${edgeUrl}?ticker=${encodeURIComponent(ticker)}&range=5d&interval=1d`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
    });

    if (!response.ok) {
      logMarketDataError('yahoo-proxy', { ticker, endpoint: 'quote', status: response.status });
      return null;
    }

    const data: YahooChartResponse = await response.json();
    if (!data.chart?.result || data.chart.result.length === 0) return null;

    const result = data.chart.result[0];
    const meta = result.meta;
    const prevClose = meta.chartPreviousClose;
    const currentPrice = meta.regularMarketPrice;
    const changePercent = prevClose > 0 ? ((currentPrice - prevClose) / prevClose) * 100 : 0;

    return {
      symbol: meta.symbol,
      regularMarketPrice: currentPrice,
      regularMarketChangePercent: changePercent,
      regularMarketVolume: meta.regularMarketVolume || 0,
      marketCap: 0,
      currency: 'USD',
      shortName: meta.shortName || ticker,
    };
  } catch {
    return null;
  }
}

// Default stock assets
export const DEFAULT_STOCK_ASSETS = [
  { id: 'aapl', symbol: 'AAPL', name: 'Apple Inc.' },
  { id: 'nvda', symbol: 'NVDA', name: 'NVIDIA Corp.' },
  { id: 'tsla', symbol: 'TSLA', name: 'Tesla Inc.' },
  { id: 'msft', symbol: 'MSFT', name: 'Microsoft Corp.' },
  { id: 'amzn', symbol: 'AMZN', name: 'Amazon.com Inc.' },
];
