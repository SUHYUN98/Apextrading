import type { CandleData } from '@/types';
import { calculateEMA, calculateRSI, calculateSMA } from '@/engine/indicators';

export interface MacdSeries {
  macd: number[];
  signal: number[];
  histogram: number[];
}

export interface AdxSeries {
  adx: number[];
  plusDI: number[];
  minusDI: number[];
}

export interface BollingerSeries {
  middle: number[];
  upper: number[];
  lower: number[];
  width: number[];
}

export interface DonchianSeries {
  upper: number[];
  lower: number[];
}

export interface IndicatorSet {
  ema: Record<12 | 26 | 50 | 200, number[]>;
  macd: MacdSeries;
  rsi: number[];
  adx: AdxSeries;
  atr: number[];
  bollinger: BollingerSeries;
  rvol: number[];
  donchian: DonchianSeries;
  scores: {
    rsi: number[];
    adx: number[];
    bbwPercentile: number[];
    rvol: number[];
  };
}

export function clampScore(value: number): number {
  return Math.min(100, Math.max(0, value));
}

export function linearScore(value: number, low: number, high: number): number {
  return clampScore(((value - low) / (high - low)) * 100);
}

export function percentileRank(values: number[], index: number, lookback: number): number {
  const start = index - lookback + 1;
  if (start < 0 || !Number.isFinite(values[index])) return NaN;
  const window = values.slice(start, index + 1).filter(Number.isFinite);
  if (window.length < lookback) return NaN;
  const atOrBelow = window.filter((v) => v <= values[index]).length;
  return (atOrBelow / window.length) * 100;
}

function wilderSmooth(values: number[], period: number): number[] {
  const out = new Array<number>(values.length).fill(NaN);
  if (values.length < period) return out;
  let prev = values.slice(0, period).reduce((sum, v) => sum + v, 0) / period;
  out[period - 1] = prev;
  for (let i = period; i < values.length; i++) {
    prev = (prev * (period - 1) + values[i]) / period;
    out[i] = prev;
  }
  return out;
}

export function calculateMACD(closes: number[], fast = 12, slow = 26, signalPeriod = 9): MacdSeries {
  const fastEma = calculateEMA(closes, fast);
  const slowEma = calculateEMA(closes, slow);
  const macd = closes.map((_, i) => fastEma[i] - slowEma[i]);
  const signal = calculateEMA(macd, signalPeriod);
  return { macd, signal, histogram: macd.map((m, i) => m - signal[i]) };
}

export function calculateATR(candles: CandleData[], period = 14): number[] {
  const trueRange = candles.map((c, i) =>
    i === 0
      ? c.high - c.low
      : Math.max(c.high - c.low, Math.abs(c.high - candles[i - 1].close), Math.abs(c.low - candles[i - 1].close))
  );
  return wilderSmooth(trueRange, period);
}

export function calculateADX(candles: CandleData[], period = 14): AdxSeries {
  const n = candles.length;
  const plusDM = new Array<number>(n).fill(0);
  const minusDM = new Array<number>(n).fill(0);
  const trueRange = new Array<number>(n).fill(0);

  for (let i = 1; i < n; i++) {
    const up = candles[i].high - candles[i - 1].high;
    const down = candles[i - 1].low - candles[i].low;
    plusDM[i] = up > down && up > 0 ? up : 0;
    minusDM[i] = down > up && down > 0 ? down : 0;
    trueRange[i] = Math.max(
      candles[i].high - candles[i].low,
      Math.abs(candles[i].high - candles[i - 1].close),
      Math.abs(candles[i].low - candles[i - 1].close)
    );
  }

  const atr = wilderSmooth(trueRange, period);
  const smoothedPlus = wilderSmooth(plusDM, period);
  const smoothedMinus = wilderSmooth(minusDM, period);
  const plusDI = smoothedPlus.map((v, i) => (atr[i] > 0 ? (100 * v) / atr[i] : NaN));
  const minusDI = smoothedMinus.map((v, i) => (atr[i] > 0 ? (100 * v) / atr[i] : NaN));
  const dx = plusDI.map((p, i) => {
    const sum = p + minusDI[i];
    return sum > 0 ? (100 * Math.abs(p - minusDI[i])) / sum : NaN;
  });

  const adx = new Array<number>(n).fill(NaN);
  const firstAdx = 2 * period - 2;
  if (n > firstAdx) {
    let prev = dx.slice(period - 1, firstAdx + 1).reduce((sum, v) => sum + v, 0) / period;
    adx[firstAdx] = prev;
    for (let i = firstAdx + 1; i < n; i++) {
      prev = (prev * (period - 1) + dx[i]) / period;
      adx[i] = prev;
    }
  }

  return { adx, plusDI, minusDI };
}

export function calculateBollinger(closes: number[], period = 20, multiplier = 2): BollingerSeries {
  const middle = calculateSMA(closes, period);
  const upper: number[] = [];
  const lower: number[] = [];
  const width: number[] = [];
  closes.forEach((_, i) => {
    if (i < period - 1) {
      upper.push(NaN);
      lower.push(NaN);
      width.push(NaN);
      return;
    }
    const window = closes.slice(i - period + 1, i + 1);
    const mean = middle[i];
    const deviation = Math.sqrt(window.reduce((sum, v) => sum + (v - mean) ** 2, 0) / period);
    upper.push(mean + multiplier * deviation);
    lower.push(mean - multiplier * deviation);
    width.push(mean > 0 ? (2 * multiplier * deviation) / mean : NaN);
  });
  return { middle, upper, lower, width };
}

// Compares each bar against the average of the previous `period` bars, excluding itself.
export function calculateRVOL(volumes: number[], period = 20): number[] {
  return volumes.map((v, i) => {
    if (i < period) return NaN;
    const avg = volumes.slice(i - period, i).reduce((sum, x) => sum + x, 0) / period;
    return avg > 0 ? v / avg : NaN;
  });
}

export function calculateDonchian(candles: CandleData[], period = 20): DonchianSeries {
  const upper: number[] = [];
  const lower: number[] = [];
  candles.forEach((_, i) => {
    if (i < period - 1) {
      upper.push(NaN);
      lower.push(NaN);
      return;
    }
    const window = candles.slice(i - period + 1, i + 1);
    upper.push(Math.max(...window.map((c) => c.high)));
    lower.push(Math.min(...window.map((c) => c.low)));
  });
  return { upper, lower };
}

export function calculateIndicatorSet(candles: CandleData[]): IndicatorSet {
  const closes = candles.map((c) => c.close);
  const volumes = candles.map((c) => c.volume);
  const adx = calculateADX(candles, 14);
  const bollinger = calculateBollinger(closes, 20, 2);
  const rsi = calculateRSI(candles, 14);
  const rvol = calculateRVOL(volumes, 20);

  return {
    ema: {
      12: calculateEMA(closes, 12),
      26: calculateEMA(closes, 26),
      50: calculateEMA(closes, 50),
      200: calculateEMA(closes, 200),
    },
    macd: calculateMACD(closes, 12, 26, 9),
    rsi,
    adx,
    atr: calculateATR(candles, 14),
    bollinger,
    rvol,
    donchian: calculateDonchian(candles, 20),
    scores: {
      rsi: rsi.map(clampScore),
      adx: adx.adx.map(clampScore),
      bbwPercentile: bollinger.width.map((_, i) => percentileRank(bollinger.width, i, 100)),
      rvol: rvol.map((v) => linearScore(v, 1, 3)),
    },
  };
}
