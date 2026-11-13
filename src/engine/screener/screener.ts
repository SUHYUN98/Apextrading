import type {
  Asset,
  CandleData,
  ScreenerCondition,
  TrendlineRule,
  AssetAnalysis,
  SwingPoint,
  Trendline,
  SupportResistanceLevel,
  ZigZagSegment,
} from '@/types';
import { detectSwingPoints } from '@/engine/trendlines/swingPoints';
import { detectTrendlines, detectSupportResistance, detectZigZag } from '@/engine/trendlines/detection';
import { calculateEMA, calculateRSI } from '@/engine/indicators';

function evaluateCondition(
  condition: ScreenerCondition,
  analysis: Omit<AssetAnalysis, 'matchedConditions' | 'interpretation' | 'sentiment'>
): boolean {
  const { candles } = analysis as any;
  const lastCandle = candles[candles.length - 1];
  if (!lastCandle) return false;

  switch (condition.field) {
    case 'price':
      return compareValues(lastCandle.close, condition.operator, condition.value);
    case 'volume':
      return compareValues(analysis.currentVolume, condition.operator, condition.value);
    case 'volumeRatio':
      return compareValues(analysis.volumeRatio, condition.operator, condition.value);
    case 'rsi': {
      const rsi = analysis.rsi[analysis.rsi.length - 1];
      return compareValues(rsi, condition.operator, condition.value);
    }
    case 'ema20': {
      const ema = analysis.ema.find((e) => e.period === 20);
      if (!ema) return false;
      return compareValues(lastCandle.close, condition.operator, ema.values[ema.values.length - 1]);
    }
    case 'ema50': {
      const ema = analysis.ema.find((e) => e.period === 50);
      if (!ema) return false;
      return compareValues(lastCandle.close, condition.operator, ema.values[ema.values.length - 1]);
    }
    case 'dayChangePercent':
      return compareValues(
        (analysis.asset.dayChangePercent),
        condition.operator,
        condition.value
      );
    case 'nearSupport':
      return isNearLevel(lastCandle.close, analysis.supportResistance, 'support', condition.value);
    case 'nearResistance':
      return isNearLevel(lastCandle.close, analysis.supportResistance, 'resistance', condition.value);
    default:
      return false;
  }
}

export function compareValues(actual: number, operator: string, target: number): boolean {
  switch (operator) {
    case '>': return actual > target;
    case '<': return actual < target;
    case '>=': return actual >= target;
    case '<=': return actual <= target;
    default: return false;
  }
}

function isNearLevel(
  price: number,
  levels: SupportResistanceLevel[],
  type: 'support' | 'resistance',
  thresholdPercent: number
): boolean {
  const filtered = levels.filter((l) => l.type === type);
  return filtered.some((l) => {
    const dev = Math.abs(price - l.price) / price;
    return dev * 100 <= thresholdPercent;
  });
}

export function analyzeAsset(
  asset: Asset,
  candles: CandleData[],
  trendlineRule: TrendlineRule,
  conditions: ScreenerCondition[]
): AssetAnalysis {
  const swingPoints: SwingPoint[] = detectSwingPoints(
    candles,
    trendlineRule.lookbackPeriod,
    trendlineRule.sensitivity
  );

  const trendlines: Trendline[] = detectTrendlines(
    candles,
    swingPoints,
    trendlineRule.minTouches
  );

  const supportResistance: SupportResistanceLevel[] = detectSupportResistance(candles, swingPoints);
  const zigzag: ZigZagSegment[] = detectZigZag(candles, swingPoints);

  const ema20 = calculateEMA(candles.map((c) => c.close), 20);
  const ema50 = calculateEMA(candles.map((c) => c.close), 50);
  const ema200 = calculateEMA(candles.map((c) => c.close), 200);
  const rsi = calculateRSI(candles, 14);

  const volumes = candles.map((c) => c.volume);
  const volumeAvg20 = volumes.slice(-20).reduce((s, v) => s + v, 0) / Math.min(20, volumes.length);
  const currentVolume = volumes[volumes.length - 1];
  const volumeRatio = currentVolume / volumeAvg20;

  const partial: Omit<AssetAnalysis, 'matchedConditions' | 'interpretation' | 'sentiment'> = {
    asset,
    swingPoints,
    trendlines,
    supportResistance,
    zigzag,
    ema: [
      { period: 20, values: ema20 },
      { period: 50, values: ema50 },
      { period: 200, values: ema200 },
    ],
    rsi,
    volumeAvg20,
    currentVolume,
    volumeRatio,
  } as any;

  // Attach candles for condition evaluation
  (partial as any).candles = candles;

  const matchedConditions = conditions.filter((c) => evaluateCondition(c, partial));

  const { interpretation, sentiment } = generateInterpretation(
    asset,
    partial,
    matchedConditions,
    candles
  );

  // Remove temporary candles field
  delete (partial as any).candles;

  return {
    ...partial,
    matchedConditions,
    interpretation,
    sentiment,
  };
}

function generateInterpretation(
  asset: Asset,
  analysis: Omit<AssetAnalysis, 'matchedConditions' | 'interpretation' | 'sentiment'>,
  matchedConditions: ScreenerCondition[],
  candles: CandleData[]
): { interpretation: string; sentiment: 'bullish' | 'bearish' | 'neutral' } {
  const lastCandle = candles[candles.length - 1];
  const price = lastCandle.close;
  const rsiValue = analysis.rsi[analysis.rsi.length - 1];
  const ema20 = analysis.ema.find((e) => e.period === 20)?.values.slice(-1)[0];
  const ema50 = analysis.ema.find((e) => e.period === 50)?.values.slice(-1)[0];

  const parts: string[] = [];
  let bullishCount = 0;
  let bearishCount = 0;

  // Price vs EMA
  if (ema20 && ema50) {
    if (price > ema20 && ema20 > ema50) {
      parts.push('price trading above EMA20/EMA50 in a bullish alignment');
      bullishCount++;
    } else if (price < ema20 && ema20 < ema50) {
      parts.push('price below EMA20/EMA50 in a bearish alignment');
      bearishCount++;
    } else {
      parts.push('EMA structure is mixed, suggesting consolidation');
    }
  }

  // RSI
  if (rsiValue > 70) {
    parts.push(`RSI at ${rsiValue.toFixed(1)} indicates overbought conditions`);
    bearishCount++;
  } else if (rsiValue < 30) {
    parts.push(`RSI at ${rsiValue.toFixed(1)} signals oversold conditions`);
    bullishCount++;
  } else {
    parts.push(`RSI at ${rsiValue.toFixed(1)} is neutral`);
  }

  // Support/Resistance proximity
  const nearestSupport = analysis.supportResistance
    .filter((l) => l.type === 'support')
    .sort((a, b) => Math.abs(a.price - price) - Math.abs(b.price - price))[0];
  const nearestResistance = analysis.supportResistance
    .filter((l) => l.type === 'resistance')
    .sort((a, b) => Math.abs(a.price - price) - Math.abs(b.price - price))[0];

  if (nearestResistance) {
    const dev = ((nearestResistance.price - price) / price) * 100;
    if (Math.abs(dev) < 3) {
      parts.push(`approaching resistance at ${nearestResistance.price.toFixed(2)} (${dev > 0 ? '+' : ''}${dev.toFixed(1)}%)`);
      bearishCount++;
    }
  }

  if (nearestSupport) {
    const dev = ((price - nearestSupport.price) / price) * 100;
    if (Math.abs(dev) < 3) {
      parts.push(`holding above support at ${nearestSupport.price.toFixed(2)} (${dev.toFixed(1)}% above)`);
      bullishCount++;
    }
  }

  // Trendlines
  const strongTrendlines = analysis.trendlines.filter((t) => t.strength > 50);
  if (strongTrendlines.length > 0) {
    const ascending = strongTrendlines.filter((t) => t.direction === 'ascending').length;
    const descending = strongTrendlines.filter((t) => t.direction === 'descending').length;
    if (ascending > descending) {
      parts.push(`${ascending} ascending trendline${ascending > 1 ? 's' : ''} confirmed with multiple touches`);
      bullishCount++;
    } else if (descending > ascending) {
      parts.push(`${descending} descending trendline${descending > 1 ? 's' : ''} confirmed with multiple touches`);
      bearishCount++;
    }
  }

  // Volume
  if (analysis.volumeRatio > 1.5) {
    parts.push(`volume surging at ${analysis.volumeRatio.toFixed(2)}x the 20-period average`);
    if (price > (ema20 || 0)) bullishCount++;
    else bearishCount++;
  } else if (analysis.volumeRatio < 0.7) {
    parts.push('volume below average, indicating reduced interest');
  }

  // Matched conditions
  if (matchedConditions.length > 0) {
    parts.push(`matched ${matchedConditions.length} screener condition${matchedConditions.length > 1 ? 's' : ''}: ${matchedConditions.map((c) => c.label).join(', ')}`);
  }

  const sentiment = bullishCount > bearishCount
    ? 'bullish'
    : bearishCount > bullishCount
      ? 'bearish'
      : 'neutral';

  const symbol = asset.symbol;
  const sentimentWord = sentiment === 'bullish' ? 'Bullish' : sentiment === 'bearish' ? 'Bearish' : 'Neutral';
  const interpretation = `${symbol} — ${sentimentWord} setup. ${parts.join('. ')}.`;

  return { interpretation, sentiment };
}

export function runScreener(
  assets: Asset[],
  candlesMap: Map<string, CandleData[]>,
  trendlineRule: TrendlineRule,
  conditions: ScreenerCondition[]
): AssetAnalysis[] {
  return assets.map((asset) => {
    const candles = candlesMap.get(asset.id) || [];
    return analyzeAsset(asset, candles, trendlineRule, conditions);
  });
}
