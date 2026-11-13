import { checkCandleQuality } from '@/engine/scanner/candleQuality';
import { detectSignals } from '@/engine/scanner/detectSignals';
import { calculateIndicatorSet } from '@/engine/scanner/indicators';
import { findExclusionReason } from '@/engine/scanner/marketFilter';
import { EXCHANGE_ADAPTERS } from '@/services/scanner/exchanges';
import { SCANNER_TIMEFRAME_MS, type ExchangeId, type PerpMarket } from '@/services/scanner/types';
import type { ScanOutcome, ScannerSettings, ScannerSignal, ScannerSkipReason } from '@/types/scanner';

const CANDLE_LIMIT = 300;
const FETCH_CONCURRENCY = 6;
const EXCHANGES: ExchangeId[] = ['binance', 'bybit'];
const CHART_SYMBOL_PREFIX: Record<ExchangeId, string> = { binance: 'BINANCE', bybit: 'BYBIT' };

type MarketResult = { signals: ScannerSignal[]; skip: null } | { signals: []; skip: ScannerSkipReason };

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Unknown error';
}

function chartUrl(market: PerpMarket): string {
  return `https://www.tradingview.com/chart/?symbol=${CHART_SYMBOL_PREFIX[market.exchange]}:${market.symbol}.P`;
}

async function mapWithConcurrency<T, R>(items: T[], limit: number, worker: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await worker(items[index]);
    }
  });
  await Promise.all(runners);
  return results;
}

async function scanMarket(market: PerpMarket, settings: ScannerSettings, now: number): Promise<MarketResult> {
  let raw;
  try {
    raw = await EXCHANGE_ADAPTERS[market.exchange].fetchCandles(market.symbol, settings.timeframe, CANDLE_LIMIT);
  } catch {
    return { signals: [], skip: 'fetch-failed' };
  }

  const quality = checkCandleQuality(raw, SCANNER_TIMEFRAME_MS[settings.timeframe], now);
  if (!quality.usable) return { signals: [], skip: 'data-issue' };
  if (quality.candles.length < settings.minCandles) return { signals: [], skip: 'short-history' };

  const detected = detectSignals(quality.candles, calculateIndicatorSet(quality.candles), settings);
  const signals = detected.map<ScannerSignal>((signal) => ({
    ...signal,
    id: `${market.exchange}:${market.symbol}:${settings.timeframe}:${signal.kind}:${signal.direction}`,
    exchange: market.exchange,
    symbol: market.symbol,
    baseAsset: market.baseAsset,
    timeframe: settings.timeframe,
    chartUrl: chartUrl(market),
  }));
  return { signals, skip: null };
}

export async function runScan(settings: ScannerSettings, now: number): Promise<ScanOutcome> {
  const skipped: Partial<Record<ScannerSkipReason, number>> = {};
  const exchangeErrors: Partial<Record<ExchangeId, string>> = {};
  const countSkip = (reason: ScannerSkipReason) => {
    skipped[reason] = (skipped[reason] ?? 0) + 1;
  };

  const listings = await Promise.all(
    EXCHANGES.map(async (id) => {
      try {
        return await EXCHANGE_ADAPTERS[id].listMarkets();
      } catch (err) {
        exchangeErrors[id] = errorMessage(err);
        return [];
      }
    })
  );

  const candidates: PerpMarket[] = [];
  for (const markets of listings) {
    const eligible: PerpMarket[] = [];
    for (const market of markets) {
      const reason = findExclusionReason(market, settings, now);
      if (reason) countSkip(reason);
      else eligible.push(market);
    }
    eligible.sort((a, b) => b.quoteVolume24h - a.quoteVolume24h);
    candidates.push(...eligible.slice(0, settings.universeSize));
  }

  const results = await mapWithConcurrency(candidates, FETCH_CONCURRENCY, (market) =>
    scanMarket(market, settings, now)
  );

  const signals: ScannerSignal[] = [];
  let scanned = 0;
  for (const result of results) {
    if (result.skip) {
      countSkip(result.skip);
      continue;
    }
    scanned++;
    signals.push(...result.signals);
  }

  signals.sort((a, b) => b.score - a.score);
  return { signals, scanned, skipped, exchangeErrors, finishedAt: Date.now() };
}
