import type { CandleData } from '@/types';
import type { IndicatorSet } from '@/engine/scanner/indicators';
import type { LocalizedText } from '@/i18n/types';
import type { DetectedSignal } from '@/types/scanner';

export interface DetectorInput {
  candles: CandleData[];
  closes: number[];
  ind: IndicatorSet;
  i: number;
  atr: number;
}

export type SignalDraft = Omit<DetectedSignal, 'signalTime' | 'price'>;

const EVIDENCE_MIN_SCORE = 50;

export function makeDetectorInput(candles: CandleData[], ind: IndicatorSet): DetectorInput {
  const i = candles.length - 1;
  return { candles, closes: candles.map((c) => c.close), ind, i, atr: ind.atr[i] };
}

export function finite(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

export function mean(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export function formatNumber(value: number, digits = 2): string {
  return Number.isFinite(value) ? value.toFixed(digits) : '-';
}

export function regressionSlope(values: number[], from: number, to: number): number {
  const n = to - from + 1;
  let sx = 0;
  let sy = 0;
  let sxy = 0;
  let sxx = 0;
  for (let k = 0; k < n; k++) {
    const y = values[from + k];
    sx += k;
    sy += y;
    sxy += k * y;
    sxx += k * k;
  }
  const denominator = n * sxx - sx * sx;
  return denominator === 0 ? 0 : (n * sxy - sx * sy) / denominator;
}

// A pivot is only returned once k candles on its right have closed, so it never repaints.
export function confirmedPivots(
  candles: CandleData[],
  side: 'high' | 'low',
  k: number,
  lastIndex: number,
  lookback: number
): number[] {
  const pivots: number[] = [];
  for (let p = Math.max(k, lastIndex - lookback); p + k <= lastIndex; p++) {
    const value = pivotPrice(candles, p, side);
    let isPivot = true;
    for (let j = 1; j <= k && isPivot; j++) {
      const left = pivotPrice(candles, p - j, side);
      const right = pivotPrice(candles, p + j, side);
      isPivot = side === 'low' ? value < left && value <= right : value > left && value >= right;
    }
    if (isPivot) pivots.push(p);
  }
  return pivots;
}

export function pivotPrice(candles: CandleData[], index: number, side: 'high' | 'low'): number {
  return side === 'low' ? candles[index].low : candles[index].high;
}

export function evidenceIf(score: number, text: LocalizedText): LocalizedText[] {
  return score >= EVIDENCE_MIN_SCORE ? [text] : [];
}

export function finalizeSignal(draft: SignalDraft, input: DetectorInput): DetectedSignal {
  return {
    ...draft,
    score: Math.round(draft.score),
    signalTime: input.candles[input.i].time * 1000,
    price: input.closes[input.i],
  };
}
