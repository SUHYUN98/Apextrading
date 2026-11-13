import type { AssetAnalysis, Timeframe } from '@/types';
import { useStore } from '@/store/useStore';
import { getTradingViewSymbol, getTradingViewInterval } from './tradingviewHelpers';
import { TradingViewChart } from './TradingViewChart';
import type { AssetDefinition } from '@/services/api';
import { MarketSourceStatus } from './MarketSourceStatus';

interface ChartCanvasProps {
  analysis: AssetAnalysis | null;
  assetDef: AssetDefinition | null;
}

const TIMEFRAMES: Timeframe[] = ['5m', '15m', '1H', '4H', '1D'];

export function ChartCanvas({ analysis, assetDef }: ChartCanvasProps) {
  const darkMode = useStore((s) => s.darkMode);
  const timeframe = useStore((s) => s.timeframe);
  const setTimeframe = useStore((s) => s.setTimeframe);
  const indicatorSettings = useStore((s) => s.indicatorSettings);
  const toggleIndicator = useStore((s) => s.toggleIndicator);
  const selectedAssetId = useStore((s) => s.selectedAssetId);
  const assetStates = useStore((s) => s.assetStates);
  const selectedState = assetStates.get(selectedAssetId);

  const studies: string[] = [];
  if (indicatorSettings.ema.enabled) studies.push('MAExp@tv-basicstudies');
  if (indicatorSettings.rsi.enabled) studies.push('RSI@tv-basicstudies');
  if (indicatorSettings.volume.enabled) studies.push('Volume@tv-basicstudies');

  const tvSymbol = assetDef ? getTradingViewSymbol(assetDef) : null;
  const priceColor = analysis && analysis.asset.dayChangePercent < 0 ? '#FF3B30' : '#34C759';

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex items-center justify-between px-3 sm:px-4 py-2 border-b border-border-light dark:border-border-dark flex-shrink-0 gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-lg font-semibold text-neutral-900 dark:text-white">
              {assetDef?.displaySymbol ?? '—'}
            </span>
            {analysis && (
              <span className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{analysis.asset.name}</span>
            )}
            <MarketSourceStatus def={assetDef} cached={selectedState?.cached ?? false} />
          </div>
          {analysis && (
            <>
              <div className="h-5 w-px bg-border-light dark:bg-border-dark" />
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold tabular-nums" style={{ color: priceColor }}>
                  {formatPriceDisplay(analysis.asset.currentPrice)}
                </span>
                <span className="text-xs font-medium tabular-nums" style={{ color: priceColor }}>
                  {analysis.asset.dayChangePercent >= 0 ? '+' : ''}
                  {analysis.asset.dayChangePercent.toFixed(2)}%
                </span>
              </div>
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-1">
            <IndicatorToggle label="EMA" active={indicatorSettings.ema.enabled} onClick={() => toggleIndicator('ema')} color="#F59E0B" />
            <IndicatorToggle label="RSI" active={indicatorSettings.rsi.enabled} onClick={() => toggleIndicator('rsi')} color="#14B8A6" />
            <IndicatorToggle label="VOL" active={indicatorSettings.volume.enabled} onClick={() => toggleIndicator('volume')} color="#3B82F6" />
          </div>

          <div className="h-5 w-px bg-border-light dark:bg-border-dark" />

          <div className="flex items-center gap-0.5 bg-subtle-light dark:bg-subtle-dark rounded-lg p-0.5">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all-smooth ${
                  timeframe === tf
                    ? 'bg-white dark:bg-white/10 text-neutral-900 dark:text-white shadow-sm'
                    : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>
      </div>

      {tvSymbol ? (
        <TradingViewChart
          symbol={tvSymbol}
          interval={getTradingViewInterval(timeframe)}
          theme={darkMode ? 'dark' : 'light'}
          studies={studies}
        />
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-neutral-500">Select an asset to view chart</p>
        </div>
      )}
    </div>
  );
}

function IndicatorToggle({
  label,
  active,
  onClick,
  color,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  color: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-2 py-1 text-2xs font-medium rounded-md transition-all-smooth ${
        active
          ? 'bg-white dark:bg-white/10 text-neutral-900 dark:text-white shadow-sm'
          : 'text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300'
      }`}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: active ? color : 'currentColor', opacity: active ? 1 : 0.3 }} />
      {label}
    </button>
  );
}

function formatPriceDisplay(price: number): string {
  if (price >= 10000) return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (price >= 100) return `$${price.toFixed(2)}`;
  return `$${price.toFixed(4)}`;
}
