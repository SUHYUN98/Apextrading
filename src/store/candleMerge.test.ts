import { describe, expect, it } from 'vitest';
import type { CandleData } from '@/types';
import type { FuturesKlineUpdate } from '@/services/marketData/binanceFuturesSocket';
import { MAX_CANDLES, applyLiveUpdate, mergeBufferedUpdates, mergeCandles } from './candleMerge';

const candle = (time: number, close: number, volume = 1): CandleData => ({
  time,
  open: close,
  high: close + 1,
  low: close - 1,
  close,
  volume,
});

const update = (time: number, close: number, isClosed = false, volume = 1): FuturesKlineUpdate => ({
  symbol: 'BTCUSDT',
  time,
  open: close,
  high: close + 1,
  low: close - 1,
  close,
  volume,
  isClosed,
  receivedAt: 0,
});

describe('mergeCandles', () => {
  it('sorts, de-duplicates with incoming winning, and caps to the newest 300', () => {
    const base = Array.from({ length: 299 }, (_, i) => candle(i * 60, 100));
    const merged = mergeCandles(base, [candle(120, 555), candle(-60, 1), candle(299 * 60, 7)]);
    expect(merged).toHaveLength(MAX_CANDLES);
    expect(merged.map((c) => c.time)).toEqual([...merged.map((c) => c.time)].sort((a, b) => a - b));
    expect(merged.find((c) => c.time === 120)?.close).toBe(555);
    expect(merged[merged.length - 1].close).toBe(7);
  });
});

describe('applyLiveUpdate', () => {
  it('updates the last bar in place and appends a new bar', () => {
    const base = [candle(0, 10), candle(60, 20)];
    const sameBar = applyLiveUpdate(base, update(60, 25));
    expect(sameBar[sameBar.length - 1].close).toBe(25);
    const newBar = applyLiveUpdate(base, update(120, 30));
    expect(newBar.map((c) => c.time)).toEqual([0, 60, 120]);
  });

  it('ignores events older than the newest candle', () => {
    const base = [candle(0, 10), candle(60, 20)];
    expect(applyLiveUpdate(base, update(0, 999))).toBe(base);
  });
});

describe('mergeBufferedUpdates', () => {
  it('keeps the closed value of the previous bar and the new bar seen during the request', () => {
    const rest = [candle(0, 10), candle(60, 20)];
    const buffered = [
      update(60, 21, false),
      update(0, 11, true),
      update(120, 30, false),
      update(120, 31, false),
    ];
    const merged = mergeBufferedUpdates(rest, buffered);
    expect(merged.map((c) => [c.time, c.close])).toEqual([
      [0, 11],
      [60, 21],
      [120, 31],
    ]);
  });

  it('drops stale unclosed updates for bars older than the REST snapshot', () => {
    const rest = [candle(0, 10), candle(60, 20)];
    const merged = mergeBufferedUpdates(rest, [update(0, 999, false)]);
    expect(merged.find((c) => c.time === 0)?.close).toBe(10);
  });
});
