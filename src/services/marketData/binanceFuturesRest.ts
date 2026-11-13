import type { CandleData, Timeframe } from '@/types';
import { MARKET_REST } from '@/services/api/binance';
import { logMarketDataError } from './diagnostics';

const BINANCE_FUTURES_REST = MARKET_REST.futures;

export const FUTURES_INTERVAL_MAP: Record<Timeframe, string> = {
  '5m': '5m',
  '15m': '15m',
  '1H': '1h',
  '4H': '4h',
  '1D': '1d',
};

const CANDLE_LIMIT = 300;
const REQUEST_TIMEOUT_MS = 15000;

export interface FuturesTicker24h {
  symbol: string;
  lastPrice: number;
  priceChangePercent: number;
  quoteVolume: number;
}

export class MarketDataHttpError extends Error {
  constructor(
    readonly endpoint: string,
    readonly status: number,
    readonly body: string
  ) {
    super(`Binance Futures HTTP ${status} on ${endpoint}`);
    this.name = 'MarketDataHttpError';
  }
}

async function getJson(endpoint: string, url: string): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      signal: controller.signal,
    });
  } catch (err) {
    const timedOut = controller.signal.aborted;
    const message = timedOut
      ? `timed out after ${REQUEST_TIMEOUT_MS} ms`
      : err instanceof Error ? err.message : String(err);
    logMarketDataError('binance-futures-rest', {
      endpoint,
      url,
      kind: timedOut ? 'timeout' : 'network-or-cors',
      message,
      hint: timedOut
        ? 'The request did not finish in time. Check the network connection.'
        : 'TypeError from fetch usually means a CORS block, DNS failure, or regional restriction. Check the browser network panel for the blocked request.',
    });
    throw new Error(`Binance Futures request failed (${endpoint}): ${message}`);
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    logMarketDataError('binance-futures-rest', {
      endpoint,
      url,
      kind: 'http',
      status: response.status,
      statusText: response.statusText,
      body: body.slice(0, 300),
    });
    throw new MarketDataHttpError(endpoint, response.status, body);
  }

  try {
    return await response.json();
  } catch {
    logMarketDataError('binance-futures-rest', { endpoint, url, kind: 'invalid-json' });
    throw new Error(`Binance Futures returned invalid JSON (${endpoint})`);
  }
}

export function isValidOhlcv(candle: CandleData): boolean {
  const values = [candle.time, candle.open, candle.high, candle.low, candle.close, candle.volume];
  if (!values.every((v) => Number.isFinite(v))) return false;
  if (candle.time <= 0 || candle.volume < 0) return false;
  if (candle.open <= 0 || candle.high <= 0 || candle.low <= 0 || candle.close <= 0) return false;
  return (
    candle.high >= candle.low &&
    candle.high >= Math.max(candle.open, candle.close) &&
    candle.low <= Math.min(candle.open, candle.close)
  );
}

function parseKlineRow(row: unknown): CandleData {
  if (!Array.isArray(row) || row.length < 6) throw new Error('Malformed kline row from Binance Futures');
  const candle = {
    time: Math.floor(Number(row[0]) / 1000),
    open: Number(row[1]),
    high: Number(row[2]),
    low: Number(row[3]),
    close: Number(row[4]),
    volume: Number(row[5]),
  };
  if (!isValidOhlcv(candle)) throw new Error('Invalid OHLCV value in Binance Futures kline');
  return candle;
}

function parseKlines(raw: unknown): CandleData[] {
  if (!Array.isArray(raw)) throw new Error('Unexpected klines response shape from Binance Futures');
  const candles = raw.map(parseKlineRow);
  for (let i = 1; i < candles.length; i++) {
    if (candles[i].time <= candles[i - 1].time) {
      throw new Error('Binance Futures klines are duplicated or out of order');
    }
  }
  return candles;
}

export async function fetchFuturesKlines(symbol: string, timeframe: Timeframe): Promise<CandleData[]> {
  const endpoint = 'klines';
  const url = `${BINANCE_FUTURES_REST}/klines?symbol=${encodeURIComponent(symbol)}&interval=${FUTURES_INTERVAL_MAP[timeframe]}&limit=${CANDLE_LIMIT}`;
  return parseKlines(await getJson(endpoint, url));
}

export async function fetchFutures24hTicker(symbol: string): Promise<FuturesTicker24h> {
  const endpoint = 'ticker/24hr';
  const url = `${BINANCE_FUTURES_REST}/ticker/24hr?symbol=${encodeURIComponent(symbol)}`;
  const data = (await getJson(endpoint, url)) as Record<string, unknown> | null;
  const ticker = {
    symbol: typeof data?.symbol === 'string' ? data.symbol : '',
    lastPrice: Number(data?.lastPrice),
    priceChangePercent: Number(data?.priceChangePercent),
    quoteVolume: Number(data?.quoteVolume),
  };
  if (
    ticker.symbol.toUpperCase() !== symbol.toUpperCase() ||
    !(ticker.lastPrice > 0) ||
    !Number.isFinite(ticker.priceChangePercent) ||
    !(ticker.quoteVolume >= 0) ||
    !Number.isFinite(ticker.quoteVolume)
  ) {
    throw new Error('Invalid 24h ticker response from Binance Futures');
  }
  return ticker;
}

export async function checkFuturesSymbol(symbol: string): Promise<boolean> {
  try {
    await getJson('ticker/price', `${BINANCE_FUTURES_REST}/ticker/price?symbol=${encodeURIComponent(symbol)}`);
    return true;
  } catch (err) {
    if (err instanceof MarketDataHttpError && err.status === 400) return false;
    throw err;
  }
}
