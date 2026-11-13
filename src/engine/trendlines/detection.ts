import type { CandleData, SwingPoint, Trendline, SupportResistanceLevel, ZigZagSegment } from '@/types';
import { detectSwingPoints } from './swingPoints';

function lineFromTwoPoints(p1: { x: number; y: number }, p2: { x: number; y: number }) {
  const slope = (p2.y - p1.y) / (p2.x - p1.x || 1);
  const intercept = p1.y - slope * p1.x;
  return { slope, intercept };
}

function priceAtLine(line: { slope: number; intercept: number }, x: number): number {
  return line.slope * x + line.intercept;
}

function countTouches(
  swingPoints: SwingPoint[],
  line: { slope: number; intercept: number },
  tolerance: number
): SwingPoint[] {
  const touches: SwingPoint[] = [];
  for (const sp of swingPoints) {
    const expected = priceAtLine(line, sp.index);
    const deviation = Math.abs(sp.price - expected) / expected;
    if (deviation < tolerance) {
      touches.push(sp);
    }
  }
  return touches;
}

export function detectTrendlines(
  candles: CandleData[],
  swingPoints: SwingPoint[],
  minTouches: number,
  tolerance = 0.015
): Trendline[] {
  const trendlines: Trendline[] = [];
  const highs = swingPoints.filter((sp) => sp.type === 'high');
  const lows = swingPoints.filter((sp) => sp.type === 'low');

  function buildLines(
    points: SwingPoint[],
    type: 'support' | 'resistance'
  ): Trendline[] {
    const lines: Trendline[] = [];

    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        const p1 = points[i];
        const p2 = points[j];
        const line = lineFromTwoPoints(
          { x: p1.index, y: p1.price },
          { x: p2.index, y: p2.price }
        );

        const direction =
          Math.abs(line.slope) < 0.0001
            ? 'horizontal'
            : line.slope > 0
              ? 'ascending'
              : 'descending';

        const touches = countTouches(swingPoints, line, tolerance);
        if (touches.length < minTouches) continue;

        const lastIdx = candles.length - 1;
        const extendedPrice = priceAtLine(line, lastIdx);
        const spanLength = p2.index - p1.index;
        const strength = Math.min(
          100,
          touches.length * 20 + (spanLength / candles.length) * 40
        );

        const id = `${type}-${p1.index}-${p2.index}-${Math.round(line.slope * 10000)}`;

        lines.push({
          id,
          start: p1,
          end: p2,
          direction,
          slope: line.slope,
          intercept: line.intercept,
          type,
          strength: Math.round(strength),
          touches,
          extendedPrice,
        });
      }
    }

    return lines;
  }

  const supportLines = buildLines(lows, 'support');
  const resistanceLines = buildLines(highs, 'resistance');

  const all = [...supportLines, ...resistanceLines];

  // Deduplicate — keep strongest per cluster
  const seen = new Set<string>();
  const deduped = all
    .sort((a, b) => b.strength - a.strength)
    .filter((tl) => {
      const key = `${tl.type}-${Math.round(tl.slope * 1000)}-${Math.round(tl.intercept / (tl.start.price || 1) * 100)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 8);

  return deduped;
}

export function detectSupportResistance(
  candles: CandleData[],
  swingPoints: SwingPoint[],
  tolerance = 0.02
): SupportResistanceLevel[] {
  const levels: { price: number; type: 'support' | 'resistance'; touches: number }[] = [];

  const highs = swingPoints.filter((sp) => sp.type === 'high');
  const lows = swingPoints.filter((sp) => sp.type === 'low');

  function clusterLevels(points: SwingPoint[], type: 'support' | 'resistance') {
    const sorted = [...points].sort((a, b) => a.price - b.price);
    const used = new Set<number>();

    for (let i = 0; i < sorted.length; i++) {
      if (used.has(i)) continue;
      const cluster = [sorted[i]];
      for (let j = i + 1; j < sorted.length; j++) {
        if (used.has(j)) continue;
        const dev = Math.abs(sorted[j].price - sorted[i].price) / sorted[i].price;
        if (dev < tolerance) {
          cluster.push(sorted[j]);
          used.add(j);
        }
      }
      if (cluster.length >= 2) {
        const avgPrice = cluster.reduce((s, p) => s + p.price, 0) / cluster.length;
        levels.push({ price: avgPrice, type, touches: cluster.length });
      }
      used.add(i);
    }
  }

  clusterLevels(highs, 'resistance');
  clusterLevels(lows, 'support');

  return levels
    .map((l) => ({
      ...l,
      strength: Math.min(100, l.touches * 20 + 20),
    }))
    .sort((a, b) => b.strength - a.strength)
    .slice(0, 6);
}

export function detectZigZag(
  candles: CandleData[],
  swingPoints: SwingPoint[],
  minSegments = 3
): ZigZagSegment[] {
  if (swingPoints.length < 2) return [];

  // Sort by index (time order)
  const sorted = [...swingPoints].sort((a, b) => a.index - b.index);

  // Build zigzag by alternating highs and lows
  const zigzagPoints: SwingPoint[] = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const last = zigzagPoints[zigzagPoints.length - 1];
    if (sorted[i].type !== last.type) {
      zigzagPoints.push(sorted[i]);
    } else if (
      (last.type === 'high' && sorted[i].price > last.price) ||
      (last.type === 'low' && sorted[i].price < last.price)
    ) {
      zigzagPoints[zigzagPoints.length - 1] = sorted[i];
    }
  }

  const segments: ZigZagSegment[] = [];
  for (let i = 0; i < zigzagPoints.length - 1; i++) {
    segments.push({ start: zigzagPoints[i], end: zigzagPoints[i + 1] });
  }

  return segments.length >= minSegments ? segments : [];
}
