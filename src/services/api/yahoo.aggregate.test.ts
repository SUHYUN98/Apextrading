import { describe, expect, it } from 'vitest';
import type { CandleData } from '@/types';
import { aggregateCandlesToUtcBuckets } from './yahoo';

const HOUR = 3600;
const FOUR_HOURS = 4 * HOUR;

const bar = (time: number, open: number, high: number, low: number, close: number, volume: number): CandleData => ({
  time,
  open,
  high,
  low,
  close,
  volume,
});

describe('aggregateCandlesToUtcBuckets', () => {
  it('aggregates hourly bars into UTC 4-hour OHLCV buckets', () => {
    const hourly = [
      bar(0, 10, 15, 9, 12, 100),
      bar(HOUR, 12, 18, 11, 17, 200),
      bar(2 * HOUR, 17, 19, 8, 9, 300),
      bar(3 * HOUR, 9, 13, 7, 11, 400),
      bar(FOUR_HOURS, 11, 14, 10, 13, 50),
    ];
    const result = aggregateCandlesToUtcBuckets(hourly, FOUR_HOURS);
    expect(result).toEqual([
      { time: 0, open: 10, high: 19, low: 7, close: 11, volume: 1000 },
      { time: FOUR_HOURS, open: 11, high: 14, low: 10, close: 13, volume: 50 },
    ]);
  });

  it('sorts unordered input and removes duplicate timestamps', () => {
    const result = aggregateCandlesToUtcBuckets(
      [bar(HOUR, 2, 3, 1, 2, 5), bar(0, 1, 2, 0.5, 1.5, 4), bar(HOUR, 2, 3, 1, 2.5, 5)],
      FOUR_HOURS
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ time: 0, open: 1, close: 2.5, volume: 9 });
  });
});
