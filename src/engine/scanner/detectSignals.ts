import type { CandleData } from '@/types';
import type { IndicatorSet } from '@/engine/scanner/indicators';
import type { DetectedSignal, DetectionThresholds } from '@/types/scanner';
import { detectVolatility } from './detectors/volatility';
import { detectReversal } from './detectors/reversal';
import { detectContinuation } from './detectors/continuation';
import { makeDetectorInput } from './detectors/shared';

const MIN_HISTORY = 200;

// Only completed candles are passed in; the last element is the signal candle.
export function detectSignals(
  candles: CandleData[],
  ind: IndicatorSet,
  thresholds: DetectionThresholds
): DetectedSignal[] {
  const i = candles.length - 1;
  if (i < MIN_HISTORY || !(ind.atr[i] > 0)) return [];

  const input = makeDetectorInput(candles, ind);
  const signals: DetectedSignal[] = [];

  const volatility = detectVolatility(input, thresholds);
  if (volatility) signals.push(volatility);

  for (const direction of ['long', 'short'] as const) {
    const reversal = detectReversal(input, direction, thresholds.reversalThreshold);
    if (reversal) signals.push(reversal);
    const continuation = detectContinuation(input, direction, thresholds.continuationThreshold);
    if (continuation) signals.push(continuation);
  }

  return signals;
}
