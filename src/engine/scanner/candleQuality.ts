import type { CandleData } from '@/types';

export type CandleIssueCode = 'duplicate' | 'gap' | 'invalid' | 'incomplete' | 'stale';

export interface CandleQualityResult {
  candles: CandleData[];
  issues: Partial<Record<CandleIssueCode, number>>;
  usable: boolean;
}

const STALE_INTERVALS = 2;

function isValidCandle(c: CandleData): boolean {
  const prices = [c.open, c.high, c.low, c.close];
  return (
    Number.isFinite(c.time) &&
    Number.isFinite(c.volume) &&
    c.volume >= 0 &&
    prices.every((p) => Number.isFinite(p) && p > 0) &&
    c.high >= c.low
  );
}

export function checkCandleQuality(raw: CandleData[], intervalMs: number, nowMs: number): CandleQualityResult {
  const counts: Record<CandleIssueCode, number> = { duplicate: 0, gap: 0, invalid: 0, incomplete: 0, stale: 0 };

  const byTime = new Map<number, CandleData>();
  for (const candle of raw) {
    if (!isValidCandle(candle)) {
      counts.invalid++;
      continue;
    }
    if (byTime.has(candle.time)) counts.duplicate++;
    byTime.set(candle.time, candle);
  }

  const completed = [...byTime.values()]
    .sort((a, b) => a.time - b.time)
    .filter((candle) => {
      const closesAt = candle.time * 1000 + intervalMs;
      if (closesAt > nowMs) {
        counts.incomplete++;
        return false;
      }
      return true;
    });

  for (let i = 1; i < completed.length; i++) {
    if ((completed[i].time - completed[i - 1].time) * 1000 !== intervalMs) counts.gap++;
  }

  const last = completed[completed.length - 1];
  if (last && last.time * 1000 + intervalMs < nowMs - STALE_INTERVALS * intervalMs) counts.stale = 1;

  const issues = Object.fromEntries(
    (Object.keys(counts) as CandleIssueCode[]).filter((code) => counts[code] > 0).map((code) => [code, counts[code]])
  ) as CandleQualityResult['issues'];

  return {
    candles: completed,
    issues,
    usable: counts.gap === 0 && counts.invalid === 0 && counts.stale === 0,
  };
}
