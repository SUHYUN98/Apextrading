import { useMemo, useState } from 'react';
import { useI18n } from '@/i18n/useI18n';
import {
  DEFAULT_SURGE_FILTERS,
  DEFAULT_TOP_N,
  filterSurgeAssets,
  groupBySector,
  sortSurgeAssets,
} from '@/engine/surge/surgeFilter';
import type { AssetClass, SectorId, SurgeFilters, SurgeSort, SurgeSortKey } from '@/types/surge';
import { FeedStatusIndicator } from './FeedStatusIndicator';
import { MarketTabs } from './MarketTabs';
import { SectorBadgeBar } from './SectorBadgeBar';
import { SurgeControlPanel } from './SurgeControlPanel';
import { SurgeGuide } from './SurgeGuide';
import { SurgeTable } from './SurgeTable';
import { useSurgeMarket } from './useSurgeMarket';

const DEFAULT_SORT: SurgeSort = { key: 'rvol', direction: 'desc' };

export function VolumeSurgeScreener() {
  const { t, lang } = useI18n();
  const [filters, setFilters] = useState<SurgeFilters>(DEFAULT_SURGE_FILTERS);
  const feeds = useSurgeMarket(filters.timeframe);
  const [market, setMarket] = useState<AssetClass>('stock');
  const [sector, setSector] = useState<SectorId | null>(null);
  const [sort, setSort] = useState<SurgeSort>(DEFAULT_SORT);
  const [topN, setTopN] = useState(DEFAULT_TOP_N);

  const matched = useMemo(
    () => filterSurgeAssets([...feeds.stock.data, ...feeds.crypto.data], filters),
    [feeds.stock.data, feeds.crypto.data, filters]
  );
  const counts = useMemo(
    () => ({
      stock: matched.filter((asset) => asset.assetClass === 'stock').length,
      crypto: matched.filter((asset) => asset.assetClass === 'crypto').length,
    }),
    [matched]
  );
  const marketAssets = useMemo(() => matched.filter((asset) => asset.assetClass === market), [matched, market]);
  const sectors = useMemo(() => groupBySector(marketAssets), [marketAssets]);
  const rows = useMemo(() => {
    const inSector = sector ? marketAssets.filter((asset) => asset.sector === sector) : marketAssets;
    return sortSurgeAssets(inSector, sort, lang).slice(0, topN);
  }, [marketAssets, sector, sort, lang, topN]);

  const activeFeed = feeds[market];

  const handlePatch = (patch: Partial<SurgeFilters>) => setFilters((prev) => ({ ...prev, ...patch }));

  const handleMarketChange = (next: AssetClass) => {
    setMarket(next);
    setSector(null);
  };

  const handleReset = () => {
    setFilters(DEFAULT_SURGE_FILTERS);
    setSector(null);
    setTopN(DEFAULT_TOP_N);
  };

  const handleSort = (key: SurgeSortKey) => {
    setSort((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: key === 'name' ? 'asc' : 'desc' };
    });
  };

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-canvas-dark text-neutral-100">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 p-3 sm:gap-5 sm:p-6">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-neutral-50 sm:text-2xl">{t.surge.title}</h1>
            <p className="mt-1 text-sm text-neutral-400">{t.surge.subtitle}</p>
          </div>
          <FeedStatusIndicator status={activeFeed.status} updatedAt={activeFeed.updatedAt} />
        </header>

        <SurgeGuide />

        <SurgeControlPanel
          filters={filters}
          resultCount={matched.length}
          onChange={handlePatch}
          onReset={handleReset}
        />

        <MarketTabs value={market} counts={counts} onChange={handleMarketChange} />

        <SectorBadgeBar
          sectors={sectors}
          totalCount={marketAssets.length}
          activeSector={sector}
          onSelect={setSector}
        />

        <SurgeTable
          title={t.surge.market.ranking[market]}
          rows={rows}
          sort={sort}
          topN={topN}
          onSort={handleSort}
          onTopNChange={setTopN}
          onResetFilters={handleReset}
        />
      </div>
    </div>
  );
}
