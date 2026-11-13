import { linearScore } from '@/engine/scanner/indicators';
import type { LocalizedText } from '@/i18n/types';
import type { DetectedSignal, IndicatorReading } from '@/types/scanner';
import { evidenceIf, finalizeSignal, finite, formatNumber, type DetectorInput } from './shared';

const PULLBACK_BARS = 5;

export function detectContinuation(
  input: DetectorInput,
  direction: 'long' | 'short',
  threshold: number
): DetectedSignal | null {
  const { candles, closes, ind, i, atr } = input;
  const sign = direction === 'long' ? 1 : -1;
  const isLong = direction === 'long';
  const ema12 = ind.ema[12][i];
  const ema26 = ind.ema[26][i];
  const ema50 = ind.ema[50][i];
  const ema200 = ind.ema[200][i];

  const alignments = [ema12 - ema26, ema26 - ema50, ema50 - ema200, closes[i] - ema50];
  const alignedCount = alignments.filter((gap) => sign * gap > 0).length;
  const trend = (alignedCount / alignments.length) * 100;

  const adx = ind.adx.adx[i];
  const directionalDI = sign * (ind.adx.plusDI[i] - ind.adx.minusDI[i]);
  const adxScore = directionalDI > 0 ? finite(linearScore(adx, 15, 35)) : 0;

  const { macd, signal, histogram } = ind.macd;
  const momentum =
    (sign * (macd[i] - signal[i]) > 0 ? 50 : 0) +
    (sign * histogram[i] > 0 ? 25 : 0) +
    (sign * (histogram[i] - histogram[i - 1]) > 0 ? 25 : 0);

  const recent = candles.slice(i - PULLBACK_BARS + 1, i + 1);
  const touchedPullback = isLong
    ? Math.min(...recent.map((c) => c.low)) <= ema26 + 0.5 * atr
    : Math.max(...recent.map((c) => c.high)) >= ema26 - 0.5 * atr;
  const recovered = sign * (closes[i] - ema12) > 0;
  const pullback = (touchedPullback ? 50 : 0) + (recovered ? 50 : 0);

  const score = 0.35 * trend + 0.25 * adxScore + 0.2 * momentum + 0.2 * pullback;
  if (score < threshold) return null;

  const readings: IndicatorReading[] = [
    { label: { KR: 'ADX', EN: 'ADX' }, value: formatNumber(adx, 1) },
    { label: { KR: 'RSI', EN: 'RSI' }, value: formatNumber(ind.rsi[i], 1) },
    { label: { KR: 'EMA 정렬', EN: 'EMA alignment' }, value: `${alignedCount}/${alignments.length}` },
  ];

  const evidence: LocalizedText[] = [
    ...evidenceIf(trend, {
      KR: `EMA 정렬 ${alignedCount}/${alignments.length} 충족`,
      EN: `EMA alignment ${alignedCount}/${alignments.length} met`,
    }),
    ...evidenceIf(adxScore, {
      KR: `ADX ${formatNumber(adx, 1)}로 추세 강도 확인`,
      EN: `ADX at ${formatNumber(adx, 1)} confirms trend strength`,
    }),
    ...evidenceIf(momentum, {
      KR: isLong ? 'MACD가 상승 방향 유지' : 'MACD가 하락 방향 유지',
      EN: isLong ? 'MACD holding the upside' : 'MACD holding the downside',
    }),
    ...evidenceIf(pullback, {
      KR: isLong ? 'EMA26 눌림 후 EMA12 위로 회복' : 'EMA26 반등 후 EMA12 아래로 복귀',
      EN: isLong ? 'Pulled back to EMA26 and recovered above EMA12' : 'Bounced to EMA26 and fell back below EMA12',
    }),
  ];

  return finalizeSignal(
    {
      kind: 'continuation',
      direction,
      score,
      readings,
      evidence,
      invalidation: {
        price: ema50,
        text: isLong
          ? { KR: 'EMA50 아래로 종가 마감 시 무효', EN: 'Invalid if the close finishes below EMA50' }
          : { KR: 'EMA50 위로 종가 마감 시 무효', EN: 'Invalid if the close finishes above EMA50' },
      },
    },
    input
  );
}
