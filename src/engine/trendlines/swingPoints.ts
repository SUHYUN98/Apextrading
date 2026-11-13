import type { CandleData, SwingPoint } from '@/types';

export function detectSwingPoints(
  candles: CandleData[],
  lookback: number,
  sensitivity: number
): SwingPoint[] {
  const swingPoints: SwingPoint[] = [];
  const leftBars = Math.max(1, Math.floor(lookback * (1 - sensitivity / 10)));
  const rightBars = Math.max(1, Math.floor(lookback * (sensitivity / 10)));

  for (let i = leftBars; i < candles.length - rightBars; i++) {
    let isSwingHigh = true;
    let isSwingLow = true;

    for (let j = i - leftBars; j <= i + rightBars; j++) {
      if (j === i) continue;
      if (candles[j].high >= candles[i].high) isSwingHigh = false;
      if (candles[j].low <= candles[i].low) isSwingLow = false;
    }

    if (isSwingHigh) {
      swingPoints.push({
        index: i,
        price: candles[i].high,
        time: candles[i].time,
        type: 'high',
      });
    }
    if (isSwingLow) {
      swingPoints.push({
        index: i,
        price: candles[i].low,
        time: candles[i].time,
        type: 'low',
      });
    }
  }

  return swingPoints;
}
