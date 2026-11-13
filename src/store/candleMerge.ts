import type { CandleData } from '@/types';
import type { FuturesKlineUpdate } from '@/services/marketData/binanceFuturesSocket';

export const MAX_CANDLES = 300;

function toCandle(update: FuturesKlineUpdate): CandleData {
  return {
    time: update.time,
    open: update.open,
    high: update.high,
    low: update.low,
    close: update.close,
    volume: update.volume,
  };
}

// Incoming candles win on equal open time; output is sorted, de-duplicated and capped to the newest MAX_CANDLES.
export function mergeCandles(base: CandleData[], incoming: CandleData[]): CandleData[] {
  const byTime = new Map<number, CandleData>();
  for (const candle of base) byTime.set(candle.time, candle);
  for (const candle of incoming) byTime.set(candle.time, candle);
  return [...byTime.values()].sort((a, b) => a.time - b.time).slice(-MAX_CANDLES);
}

// Returns the same array reference when the update is older than the newest candle, so callers can skip it.
export function applyLiveUpdate(candles: CandleData[], update: FuturesKlineUpdate): CandleData[] {
  const last = candles[candles.length - 1];
  if (!last || update.time < last.time) return candles;
  const next = candles.slice();
  if (update.time === last.time) {
    next[next.length - 1] = toCandle(update);
  } else {
    next.push(toCandle(update));
    if (next.length > MAX_CANDLES) next.shift();
  }
  return next;
}

// Live updates buffered while a REST request was in flight. Updates for bars the REST snapshot does not
// cover are kept, and closed bars are kept even when older, so a bar that closed during the request is not lost.
export function mergeBufferedUpdates(restCandles: CandleData[], buffered: FuturesKlineUpdate[]): CandleData[] {
  const restLast = restCandles.length > 0 ? restCandles[restCandles.length - 1].time : -Infinity;
  const latest = new Map<number, FuturesKlineUpdate>();
  for (const update of buffered) {
    if (update.time >= restLast || update.isClosed) latest.set(update.time, update);
  }
  return mergeCandles(restCandles, [...latest.values()].map(toCandle));
}
