import type { BacktestDirection, BacktestResult, BacktestTrade, CandleData, ScreenerCondition } from '@/types';
import { calculateEMA, calculateRSI } from '@/engine/indicators';
import { compareValues } from '@/engine/screener/screener';

export const BACKTEST_HOLD_BARS = 5;
const WARMUP_BARS = 50;
const HISTORICAL_FIELDS = new Set<ScreenerCondition['field']>([
  'price',
  'volume',
  'volumeRatio',
  'rsi',
  'ema20',
  'ema50',
]);

interface Series {
  closes: number[];
  volumes: number[];
  volumeRatio: number[];
  ema20: number[];
  ema50: number[];
  rsi: number[];
}

function buildSeries(candles: CandleData[]): Series {
  const closes = candles.map((c) => c.close);
  const volumes = candles.map((c) => c.volume);
  const volumeRatio = volumes.map((v, i) => {
    const window = volumes.slice(Math.max(0, i - 19), i + 1);
    const avg = window.reduce((sum, x) => sum + x, 0) / window.length;
    return avg > 0 ? v / avg : 0;
  });
  return {
    closes,
    volumes,
    volumeRatio,
    ema20: calculateEMA(closes, 20),
    ema50: calculateEMA(closes, 50),
    rsi: calculateRSI(candles, 14),
  };
}

function conditionHoldsAt(condition: ScreenerCondition, i: number, s: Series): boolean {
  switch (condition.field) {
    case 'price':
      return compareValues(s.closes[i], condition.operator, condition.value);
    case 'volume':
      return compareValues(s.volumes[i], condition.operator, condition.value);
    case 'volumeRatio':
      return compareValues(s.volumeRatio[i], condition.operator, condition.value);
    case 'rsi':
      return compareValues(s.rsi[i], condition.operator, condition.value);
    case 'ema20':
      return compareValues(s.closes[i], condition.operator, s.ema20[i]);
    case 'ema50':
      return compareValues(s.closes[i], condition.operator, s.ema50[i]);
    default:
      return false;
  }
}

export function runBacktest(
  candles: CandleData[],
  conditions: ScreenerCondition[],
  volumeThreshold: number,
  direction: BacktestDirection,
  holdBars = BACKTEST_HOLD_BARS
): BacktestResult {
  const historical = conditions.filter((c) => HISTORICAL_FIELDS.has(c.field));
  const skippedConditions = conditions
    .filter((c) => !HISTORICAL_FIELDS.has(c.field))
    .map((c) => c.label);

  const s = buildSeries(candles);
  const trades: BacktestTrade[] = [];

  let i = WARMUP_BARS;
  while (i + holdBars < candles.length) {
    const triggered =
      s.volumeRatio[i] >= volumeThreshold &&
      historical.every((c) => conditionHoldsAt(c, i, s));

    if (triggered) {
      const exitIndex = i + holdBars;
      const entryPrice = s.closes[i];
      const exitPrice = s.closes[exitIndex];
      const move = (exitPrice / entryPrice - 1) * 100;
      trades.push({
        entryTime: candles[i].time,
        entryPrice,
        exitTime: candles[exitIndex].time,
        exitPrice,
        returnPercent: direction === 'long' ? move : -move,
      });
      i += holdBars;
    } else {
      i++;
    }
  }

  const returns = trades.map((t) => t.returnPercent);
  return {
    direction,
    holdBars,
    signals: trades.length,
    wins: returns.filter((r) => r > 0).length,
    returnSum: returns.reduce((sum, r) => sum + r, 0),
    bestReturn: returns.length ? Math.max(...returns) : 0,
    worstReturn: returns.length ? Math.min(...returns) : 0,
    skippedConditions,
    trades,
  };
}

export function summarizeBacktests(results: BacktestResult[]) {
  const signals = results.reduce((sum, r) => sum + r.signals, 0);
  const wins = results.reduce((sum, r) => sum + r.wins, 0);
  const returnSum = results.reduce((sum, r) => sum + r.returnSum, 0);
  return {
    signals,
    winRate: signals > 0 ? (wins / signals) * 100 : 0,
    avgReturn: signals > 0 ? returnSum / signals : 0,
  };
}
