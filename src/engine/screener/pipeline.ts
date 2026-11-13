import type { AssetAnalysis, AssetType, BacktestResult, ScreenerCondition } from '@/types';

export type AssetFilter = 'all' | AssetType;

function matchesType(analysis: AssetAnalysis, assetFilter: AssetFilter): boolean {
  return assetFilter === 'all' || analysis.asset.type === assetFilter;
}

export function selectVolumeCandidates(
  analyses: AssetAnalysis[],
  threshold: number,
  assetFilter: AssetFilter
): AssetAnalysis[] {
  return analyses
    .filter((a) => matchesType(a, assetFilter) && Number.isFinite(a.volumeRatio) && a.volumeRatio >= threshold)
    .sort((a, b) => b.volumeRatio - a.volumeRatio);
}

export function selectConditionMatches(
  candidates: AssetAnalysis[],
  conditions: ScreenerCondition[]
): AssetAnalysis[] {
  return candidates.filter((a) =>
    conditions.every((c) => a.matchedConditions.some((m) => m.id === c.id))
  );
}

export interface BacktestRow {
  analysis: AssetAnalysis;
  result: BacktestResult;
}

export function selectBacktestRows(
  analyses: AssetAnalysis[],
  backtests: Map<string, BacktestResult>,
  assetFilter: AssetFilter
): BacktestRow[] {
  const rows: BacktestRow[] = [];
  for (const analysis of analyses) {
    if (!matchesType(analysis, assetFilter)) continue;
    const result = backtests.get(analysis.asset.id);
    if (result && result.signals > 0) rows.push({ analysis, result });
  }
  return rows.sort((x, y) => {
    const winX = x.result.wins / x.result.signals;
    const winY = y.result.wins / y.result.signals;
    return winY - winX || y.result.signals - x.result.signals;
  });
}
