import { useMemo, useState, useCallback } from 'react';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Bitcoin,
  LineChart,
  Loader2,
  AlertCircle,
  Wifi,
  Database,
  Plus,
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { formatPrice, formatVolume, formatMarketCap } from '@/services/api/mockData';
import type { AssetType } from '@/types';
import { PipelineList, PipelineTabs, type ListView } from '@/components/sidebar/PipelineList';

export function ScreenerSidebar() {
  const {
    analyses,
    selectedAssetId,
    selectAsset,
    assetFilter,
    setAssetFilter,
    sidebarCollapsed,
    toggleSidebar,
    conditions,
    assetStates,
    assetOrder,
    addCustomAsset,
  } = useStore();

  const [search, setSearch] = useState('');
  const [view, setView] = useState<ListView>('all');
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const handleAddAsset = useCallback(async () => {
    const trimmed = search.trim();
    if (!trimmed) return;
    setIsAdding(true);
    setAddError(null);
    try {
      const id = await addCustomAsset(trimmed);
      if (!id) {
        setAddError('Could not load. Check the ticker.');
      } else {
        setSearch('');
      }
    } catch {
      setAddError('Failed to load asset.');
    } finally {
      setIsAdding(false);
    }
  }, [search, addCustomAsset]);

  const filtered = useMemo(() => {
    return analyses.filter((a) => {
      if (assetFilter !== 'all' && a.asset.type !== assetFilter) return false;
      return true;
    });
  }, [analyses, assetFilter]);

  if (sidebarCollapsed) {
    return (
      <div className="w-12 border-r border-border-light dark:border-border-dark flex flex-col items-center py-3 gap-3 bg-surface-light dark:bg-surface-dark flex-shrink-0">
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-lg hover:bg-subtle-light dark:hover:bg-subtle-dark transition-all-smooth"
        >
          <ChevronRight className="w-4 h-4 text-neutral-500" />
        </button>
        <div className="w-6 h-px bg-border-light dark:bg-border-dark" />
        <button
          onClick={() => setAssetFilter('all')}
          className="p-1.5 rounded-lg transition-all-smooth"
          style={{ background: assetFilter === 'all' ? 'rgba(0,113,227,0.1)' : 'transparent' }}
        >
          <LineChart className="w-4 h-4" style={{ color: assetFilter === 'all' ? '#0071E3' : '#737373' }} />
        </button>
        <button
          onClick={() => setAssetFilter('crypto')}
          className="p-1.5 rounded-lg transition-all-smooth"
          style={{ background: assetFilter === 'crypto' ? 'rgba(0,113,227,0.1)' : 'transparent' }}
        >
          <Bitcoin className="w-4 h-4" style={{ color: assetFilter === 'crypto' ? '#0071E3' : '#737373' }} />
        </button>
        <button
          onClick={() => setAssetFilter('stock')}
          className="p-1.5 rounded-lg transition-all-smooth"
          style={{ background: assetFilter === 'stock' ? 'rgba(0,113,227,0.1)' : 'transparent' }}
        >
          <TrendingUp className="w-4 h-4" style={{ color: assetFilter === 'stock' ? '#0071E3' : '#737373' }} />
        </button>
      </div>
    );
  }

  return (
    <div className="w-full lg:w-72 border-r border-border-light dark:border-border-dark flex flex-col bg-surface-light dark:bg-surface-dark flex-shrink-0 animate-slide-in-left">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border-light dark:border-border-dark flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-white">Screener</h2>
          <p className="text-2xs text-neutral-500 dark:text-neutral-400">
            {filtered.length} asset{filtered.length !== 1 ? 's' : ''}
            {conditions.length > 0 && ` · ${conditions.length} filter${conditions.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-lg hover:bg-subtle-light dark:hover:bg-subtle-dark transition-all-smooth"
        >
          <ChevronLeft className="w-4 h-4 text-neutral-500" />
        </button>
      </div>

      {/* Search + Add Asset */}
      <div className="px-3 py-2.5 border-b border-border-light dark:border-border-dark">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setAddError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && search.trim()) {
                handleAddAsset();
              }
            }}
            placeholder="Add ticker (PEPEUSDT, META...)"
            className="w-full pl-8 pr-20 py-1.5 text-xs bg-subtle-light dark:bg-subtle-dark border border-transparent focus:border-accent rounded-lg outline-none text-neutral-900 dark:text-white placeholder:text-neutral-400 transition-all-smooth"
          />
          <button
            onClick={handleAddAsset}
            disabled={!search.trim() || isAdding}
            className="absolute right-1 top-1/2 -translate-y-1/2 px-2 py-0.5 text-2xs font-medium bg-accent text-white rounded-md hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-all-smooth flex items-center gap-1"
          >
            {isAdding ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Plus className="w-2.5 h-2.5" />}
            Add
          </button>
        </div>
        {addError && (
          <p className="text-2xs text-bearish mt-1.5 flex items-center gap-1">
            <AlertCircle className="w-2.5 h-2.5" />
            {addError}
          </p>
        )}
        <p className="text-2xs text-neutral-400 mt-1.5">
          Type any crypto pair or stock ticker, then press Enter
        </p>
      </div>

      {/* Asset type filter */}
      <div className="px-3 py-2 border-b border-border-light dark:border-border-dark">
        <div className="flex items-center gap-0.5 bg-subtle-light dark:bg-subtle-dark rounded-lg p-0.5">
          <FilterButton active={assetFilter === 'all'} onClick={() => setAssetFilter('all')} label="All" />
          <FilterButton active={assetFilter === 'crypto'} onClick={() => setAssetFilter('crypto')} label="Crypto" />
          <FilterButton active={assetFilter === 'stock'} onClick={() => setAssetFilter('stock')} label="Stocks" />
        </div>
      </div>

      <PipelineTabs view={view} onChange={setView} />

      {/* Asset list */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {view !== 'all' && <PipelineList stage={view} />}
        {view === 'all' && assetOrder.map((id) => {
          const state = assetStates.get(id);
          if (!state) return null;
          const analysis = analyses.find((a) => a.asset.id === id);
          const asset = state.asset;

          // Filter by type
          if (assetFilter !== 'all' && state.def.type !== assetFilter) return null;

          const isSelected = id === selectedAssetId;

          if (!asset) {
            return (
              <div
                key={id}
                className={`w-full px-3 py-2.5 flex items-center gap-2.5 border-b border-border-light/50 dark:border-border-dark/50 ${
                  isSelected ? 'bg-accent-muted/40 dark:bg-accent/10' : ''
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-subtle-light dark:bg-subtle-dark flex items-center justify-center flex-shrink-0">
                  {state.status === 'error' ? (
                    <AlertCircle className="w-4 h-4 text-bearish" />
                  ) : (
                    <Loader2 className="w-3.5 h-3.5 text-neutral-400 animate-spin" />
                  )}
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-semibold text-neutral-900 dark:text-white">
                    {state.def.displaySymbol}
                  </span>
                  <span className="text-2xs text-neutral-400 block">
                    {state.status === 'error' ? 'Failed to load' : 'Loading...'}
                  </span>
                </div>
              </div>
            );
          }

          const isUp = asset.dayChangePercent >= 0;
          const hasMatch = analysis && analysis.matchedConditions.length > 0;
          const statusIcon = getStatusIcon(state.status, state.cached, state.def.type);

          return (
            <button
              key={id}
              onClick={() => selectAsset(id)}
              className={`w-full px-3 py-2.5 flex items-center justify-between gap-2 border-b border-border-light/50 dark:border-border-dark/50 transition-all-smooth text-left ${
                isSelected
                  ? 'bg-accent-muted/40 dark:bg-accent/10'
                  : 'hover:bg-subtle-light dark:hover:bg-subtle-dark'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  asset.type === 'crypto'
                    ? 'bg-amber-50 dark:bg-amber-500/10'
                    : 'bg-blue-50 dark:bg-blue-500/10'
                }`}>
                  {asset.type === 'crypto' ? (
                    <Bitcoin className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  ) : (
                    <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-neutral-900 dark:text-white truncate">
                      {asset.symbol}
                    </span>
                    {hasMatch && (
                      <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse-subtle flex-shrink-0" />
                    )}
                    {statusIcon}
                  </div>
                  <span className="text-2xs text-neutral-500 dark:text-neutral-400 truncate block">
                    {asset.name}
                  </span>
                </div>
              </div>

              <div className="text-right flex-shrink-0">
                <div className="text-xs font-semibold tabular-nums text-neutral-900 dark:text-white">
                  {formatPrice(asset.currentPrice)}
                </div>
                <div className={`flex items-center justify-end gap-0.5 text-2xs font-medium tabular-nums ${
                  isUp ? 'text-bullish' : 'text-bearish'
                }`}>
                  {isUp ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                  {isUp ? '+' : ''}{asset.dayChangePercent.toFixed(2)}%
                </div>
              </div>
            </button>
          );
        })}
        {view === 'all' && filtered.length === 0 && assetOrder.length === 0 && (
          <div className="px-4 py-8 text-center">
            <p className="text-xs text-neutral-400">No assets loaded yet</p>
          </div>
        )}
      </div>

      {/* Footer stats */}
      <div className="px-3 py-2.5 border-t border-border-light dark:border-border-dark bg-subtle-light/50 dark:bg-subtle-dark/50">
        <div className="flex items-center justify-between text-2xs text-neutral-500 dark:text-neutral-400">
          <span>Volume (24h)</span>
          <span className="tabular-nums">{formatVolume(analyses.reduce((s, a) => s + a.asset.volume24h, 0))}</span>
        </div>
        <div className="flex items-center justify-between text-2xs text-neutral-500 dark:text-neutral-400 mt-1">
          <span>Total Mkt Cap</span>
          <span className="tabular-nums">{formatMarketCap(analyses.reduce((s, a) => s + a.asset.marketCap, 0))}</span>
        </div>
      </div>
    </div>
  );
}

function getStatusIcon(status: string, cached: boolean, type: string) {
  if (status === 'loading') {
    return <Loader2 className="w-2.5 h-2.5 text-accent animate-spin flex-shrink-0" />;
  }
  if (status === 'error') {
    return <AlertCircle className="w-2.5 h-2.5 text-bearish flex-shrink-0" />;
  }
  if (cached) {
    return <Database className="w-2.5 h-2.5 text-amber-500 flex-shrink-0" />;
  }
  if (status === 'live' && type === 'crypto') {
    return <Wifi className="w-2.5 h-2.5 text-bullish flex-shrink-0" />;
  }
  return null;
}

function FilterButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-1 text-2xs font-medium rounded-md transition-all-smooth ${
        active
          ? 'bg-white dark:bg-white/10 text-neutral-900 dark:text-white shadow-sm'
          : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'
      }`}
    >
      {label}
    </button>
  );
}
