import { clampScore, linearScore } from '@/engine/scanner/indicators';
import type { LocalizedText } from '@/i18n/types';
import type { DetectedSignal, IndicatorReading } from '@/types/scanner';
import {
  confirmedPivots,
  evidenceIf,
  finalizeSignal,
  finite,
  formatNumber,
  pivotPrice,
  regressionSlope,
  type DetectorInput,
} from './shared';

const PIVOT_K = 3;
const PIVOT_LOOKBACK = 60;

export function detectReversal(
  input: DetectorInput,
  direction: 'long' | 'short',
  threshold: number
): DetectedSignal | null {
  const { candles, closes, ind, i, atr } = input;
  const sign = direction === 'long' ? 1 : -1;
  const isLong = direction === 'long';
  const swingSide = isLong ? 'low' : 'high';
  const structureSide = isLong ? 'high' : 'low';

  const swings = confirmedPivots(candles, swingSide, PIVOT_K, i, PIVOT_LOOKBACK);
  let divergence = 0;
  if (swings.length >= 2) {
    const p1 = swings[swings.length - 2];
    const p2 = swings[swings.length - 1];
    const priceExtended = sign * (pivotPrice(candles, p2, swingSide) - pivotPrice(candles, p1, swingSide)) < 0;
    const rsiGap = sign * (ind.rsi[p2] - ind.rsi[p1]);
    if (priceExtended && rsiGap > 0) divergence = clampScore(60 + rsiGap * 4);
  }

  const recentSlope = regressionSlope(closes, i - 4, i) / atr;
  const priorSlope = regressionSlope(closes, i - 9, i - 5) / atr;
  const curvature = finite(linearScore(sign * (recentSlope - priorSlope), 0, 0.5));

  const histogram = ind.macd.histogram;
  const histogramShift = (sign * (histogram[i] - histogram[i - 1])) / atr;
  const flipped = [i - 2, i - 1, i].some((k) => sign * histogram[k] > 0 && sign * histogram[k - 1] <= 0);
  const macdShift = clampScore(finite(linearScore(histogramShift, 0, 0.15)) + (flipped ? 20 : 0));

  const structurePivots = confirmedPivots(candles, structureSide, PIVOT_K, i, PIVOT_LOOKBACK);
  const structureIndex = structurePivots[structurePivots.length - 1];
  const structure =
    structureIndex === undefined
      ? 0
      : finite(linearScore((sign * (closes[i] - pivotPrice(candles, structureIndex, structureSide))) / atr, 0, 0.5));

  const score = 0.3 * divergence + 0.25 * curvature + 0.25 * macdShift + 0.2 * structure;
  if (score < threshold) return null;

  const readings: IndicatorReading[] = [
    { label: { KR: 'RSI', EN: 'RSI' }, value: formatNumber(ind.rsi[i], 1) },
    { label: { KR: 'MACD 히스토그램', EN: 'MACD histogram' }, value: formatNumber(histogram[i], 4) },
    { label: { KR: 'ATR 대비 기울기 변화', EN: 'Slope change per ATR' }, value: formatNumber(recentSlope - priorSlope, 3) },
  ];

  const divergenceText: LocalizedText = isLong
    ? { KR: '가격 저점은 낮아졌지만 RSI 저점은 높아짐', EN: 'Price made a lower low while RSI made a higher low' }
    : { KR: '가격 고점은 높아졌지만 RSI 고점은 낮아짐', EN: 'Price made a higher high while RSI made a lower high' };

  const evidence: LocalizedText[] = [
    ...evidenceIf(divergence, divergenceText),
    ...evidenceIf(curvature, {
      KR: isLong ? '가격 기울기가 하락에서 상승으로 전환' : '가격 기울기가 상승에서 하락으로 전환',
      EN: isLong ? 'Price slope turned from down to up' : 'Price slope turned from up to down',
    }),
    ...evidenceIf(macdShift, {
      KR: isLong ? 'MACD 히스토그램이 상승 방향으로 전환' : 'MACD 히스토그램이 하락 방향으로 전환',
      EN: isLong ? 'MACD histogram turning up' : 'MACD histogram turning down',
    }),
    ...evidenceIf(structure, {
      KR: isLong ? '직전 스윙 고점 돌파' : '직전 스윙 저점 이탈',
      EN: isLong ? 'Broke the prior swing high' : 'Broke the prior swing low',
    }),
  ];

  const lastSwing = swings[swings.length - 1];
  const invalidation =
    lastSwing === undefined
      ? { price: null, text: { KR: '스윙 구조가 확정되지 않았습니다', EN: 'No swing structure confirmed yet' } }
      : {
          price: pivotPrice(candles, lastSwing, swingSide),
          text: isLong
            ? { KR: '스윙 저점 아래로 종가 마감 시 무효', EN: 'Invalid if the close finishes below the swing low' }
            : { KR: '스윙 고점 위로 종가 마감 시 무효', EN: 'Invalid if the close finishes above the swing high' },
        };

  return finalizeSignal(
    { kind: 'reversal', direction, score, readings, evidence, invalidation },
    input
  );
}
