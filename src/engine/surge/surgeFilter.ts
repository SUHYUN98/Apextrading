import type { Lang } from '@/i18n/types';
import { DICTIONARY } from '@/i18n/dictionary';
import type { SectorId, SurgeAsset, SurgeFilters, SurgeSort, SurgeSortKey, SurgeTimeframe } from '@/types/surge';

export const CHANGE_BOUNDS = { min: -100, max: 100, step: 0.5 } as const;

export const DEFAULT_SURGE_FILTERS: SurgeFilters = {
  timeframe: '1h',
  minRvol: 2.5,
  minTradingValue: 50,
  changeRange: [-20, 50],
  query: '',
};

export const RVOL_FLOOR = 1;

export const LIQUIDITY_FLOOR = 10;

export const DEFAULT_TOP_N = 10;

export interface SectorSummary {
  sector: SectorId;
  count: number;
  avgRvol: number;
  totalTradingValue: number;
}

function matchesQuery(asset: SurgeAsset, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [asset.ticker, asset.name.KR, asset.name.EN].some((value) => value.toLowerCase().includes(q));
}

export function filterSurgeAssets(assets: SurgeAsset[], filters: SurgeFilters): SurgeAsset[] {
  const [minChange, maxChange] = filters.changeRange;
  const rvolOpen = filters.minRvol <= RVOL_FLOOR;
  const liquidityOpen = filters.minTradingValue <= LIQUIDITY_FLOOR;
  const lowerChangeOpen = minChange <= CHANGE_BOUNDS.min;
  const upperChangeOpen = maxChange >= CHANGE_BOUNDS.max;
  return assets.filter((asset) => {
    if (!matchesQuery(asset, filters.query)) return false;
    if (!rvolOpen && asset.rvol < filters.minRvol) return false;
    if (!liquidityOpen && asset.tradingValue < filters.minTradingValue) return false;
    if (!lowerChangeOpen && asset.changePct < minChange) return false;
    if (!upperChangeOpen && asset.changePct > maxChange) return false;
    return true;
  });
}

function sortValue(asset: SurgeAsset, key: SurgeSortKey, lang: Lang): number | string {
  switch (key) {
    case 'name':
      return asset.name[lang];
    case 'changePct':
      return asset.changePct;
    case 'tradingValue':
      return asset.tradingValue;
    case 'rvol':
      return asset.rvol;
    case 'volumeChangePct':
      return asset.volumeChangePct;
  }
}

export function sortSurgeAssets(assets: SurgeAsset[], sort: SurgeSort, lang: Lang): SurgeAsset[] {
  const direction = sort.direction === 'asc' ? 1 : -1;
  const locale = DICTIONARY[lang].locale;
  return [...assets].sort((a, b) => {
    const va = sortValue(a, sort.key, lang);
    const vb = sortValue(b, sort.key, lang);
    if (typeof va === 'string' && typeof vb === 'string') {
      return va.localeCompare(vb, locale) * direction;
    }
    return ((va as number) - (vb as number)) * direction;
  });
}

// Sectors ranked by combined trading value, i.e. where volume is concentrated
export function groupBySector(assets: SurgeAsset[]): SectorSummary[] {
  const groups = new Map<SectorId, SectorSummary & { rvolSum: number }>();
  for (const asset of assets) {
    const group = groups.get(asset.sector) ?? {
      sector: asset.sector,
      count: 0,
      avgRvol: 0,
      totalTradingValue: 0,
      rvolSum: 0,
    };
    group.count += 1;
    group.rvolSum += asset.rvol;
    group.totalTradingValue += asset.tradingValue;
    groups.set(asset.sector, group);
  }
  return Array.from(groups.values())
    .map(({ rvolSum, ...summary }) => ({ ...summary, avgRvol: rvolSum / summary.count }))
    .sort((a, b) => b.totalTradingValue - a.totalTradingValue);
}
