import type { CandleData } from '@/types';

export function calculateEMA(values: number[], period: number): number[] {
  const ema: number[] = [];
  const multiplier = 2 / (period + 1);

  for (let i = 0; i < values.length; i++) {
    if (i === 0) {
      ema.push(values[0]);
    } else if (i < period) {
      const slice = values.slice(0, i + 1);
      const sma = slice.reduce((sum, v) => sum + v, 0) / slice.length;
      ema.push(sma);
    } else {
      ema.push(values[i] * multiplier + ema[i - 1] * (1 - multiplier));
    }
  }

  return ema;
}

export function calculateRSI(candles: CandleData[], period = 14): number[] {
  const rsi: number[] = [];
  const gains: number[] = [];
  const losses: number[] = [];

  for (let i = 0; i < candles.length; i++) {
    if (i === 0) {
      gains.push(0);
      losses.push(0);
      rsi.push(50);
      continue;
    }

    const change = candles[i].close - candles[i - 1].close;
    gains.push(Math.max(0, change));
    losses.push(Math.max(0, -change));

    if (i < period) {
      rsi.push(50);
      continue;
    }

    const avgGain = gains.slice(-period).reduce((s, v) => s + v, 0) / period;
    const avgLoss = losses.slice(-period).reduce((s, v) => s + v, 0) / period;

    if (avgLoss === 0) {
      rsi.push(100);
    } else {
      const rs = avgGain / avgLoss;
      rsi.push(100 - 100 / (1 + rs));
    }
  }

  return rsi;
}

export function calculateSMA(values: number[], period: number): number[] {
  const sma: number[] = [];
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      sma.push(NaN);
      continue;
    }
    const slice = values.slice(i - period + 1, i + 1);
    sma.push(slice.reduce((s, v) => s + v, 0) / period);
  }
  return sma;
}
