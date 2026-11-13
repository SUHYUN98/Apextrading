import { clampScore, linearScore } from '@/engine/scanner/indicators';
import type { LocalizedText } from '@/i18n/types';
import type { DetectionThresholds, DetectedSignal, IndicatorReading, SignalDirection } from '@/types/scanner';
import { evidenceIf, finalizeSignal, finite, formatNumber, mean, type DetectorInput } from './shared';

const ATR_WINDOW = 20;
const COMPRESSION_PERCENTILE = 20;

export function detectVolatility(input: DetectorInput, thresholds: DetectionThresholds): DetectedSignal | null {
  const { closes, ind, i, atr } = input;

  const bbwPercentile = ind.scores.bbwPercentile[i - 1];
  const compression = !Number.isFinite(bbwPercentile)
    ? 0
    : bbwPercentile <= COMPRESSION_PERCENTILE
      ? 100
      : clampScore((40 - bbwPercentile) * 5);

  const rvol = ind.rvol[i];
  const rvolScore = finite(ind.scores.rvol[i]);

  const atrAverage = mean(ind.atr.slice(i - ATR_WINDOW, i));
  const atrRatio = atrAverage > 0 ? atr / atrAverage : NaN;
  const atrExpansion = finite(linearScore(atrRatio, 1, 2));

  const upper = ind.donchian.upper[i - 1];
  const lower = ind.donchian.lower[i - 1];
  const upBreak = (closes[i] - upper) / atr;
  const downBreak = (lower - closes[i]) / atr;
  let direction: SignalDirection = 'undetermined';
  let distance = 0;
  if (upBreak > 0) {
    direction = 'long';
    distance = upBreak;
  } else if (downBreak > 0) {
    direction = 'short';
    distance = downBreak;
  }
  const breakoutScore = finite(linearScore(distance, 0, 1));

  const score = 0.35 * compression + 0.25 * rvolScore + 0.2 * atrExpansion + 0.2 * breakoutScore;
  if (!(rvol >= thresholds.minRvol) || score < thresholds.volatilityThreshold) return null;

  const readings: IndicatorReading[] = [
    { label: { KR: 'BBW 백분위', EN: 'BBW percentile' }, value: `${formatNumber(bbwPercentile, 0)}%` },
    { label: { KR: 'RVOL', EN: 'RVOL' }, value: `${formatNumber(rvol, 2)}x` },
    { label: { KR: 'ATR 확장', EN: 'ATR expansion' }, value: `${formatNumber(atrRatio, 2)}x` },
  ];

  const breakoutText: LocalizedText =
    direction === 'long'
      ? { KR: '20봉 고점 돌파', EN: 'Broke above the 20-bar high' }
      : { KR: '20봉 저점 이탈', EN: 'Broke below the 20-bar low' };

  const evidence: LocalizedText[] = [
    ...evidenceIf(compression, {
      KR: `볼린저 밴드 폭 백분위 ${formatNumber(bbwPercentile, 0)}%로 압축 상태`,
      EN: `Band width at the ${formatNumber(bbwPercentile, 0)} percentile (compressed)`,
    }),
    ...evidenceIf(rvolScore, {
      KR: `거래량이 최근 20봉 평균의 ${formatNumber(rvol, 1)}배`,
      EN: `Volume at ${formatNumber(rvol, 1)}x the 20-bar average`,
    }),
    ...evidenceIf(atrExpansion, {
      KR: `ATR이 ${formatNumber(atrRatio, 2)}배로 확장`,
      EN: `ATR expanded to ${formatNumber(atrRatio, 2)}x`,
    }),
    ...(direction === 'undetermined' ? [] : evidenceIf(breakoutScore, breakoutText)),
  ];

  const invalidation =
    direction === 'long'
      ? { price: upper, text: { KR: '종가가 돌파 기준선 아래로 복귀하면 무효', EN: 'Invalid if the close returns below the breakout level' } }
      : direction === 'short'
        ? { price: lower, text: { KR: '종가가 이탈 기준선 위로 복귀하면 무효', EN: 'Invalid if the close returns above the breakdown level' } }
        : { price: null, text: { KR: '돌파가 확정되기 전이라 기준선이 없습니다', EN: 'No level yet until a breakout is confirmed' } };

  return finalizeSignal(
    { kind: 'volatility', direction, score, readings, evidence, invalidation },
    input
  );
}
