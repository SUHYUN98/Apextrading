import type { ReactNode } from 'react';
import { Info, RotateCcw } from 'lucide-react';
import { useI18n } from '@/i18n/useI18n';
import { formatTradingValue } from '@/engine/surge/format';
import { CHANGE_BOUNDS, LIQUIDITY_FLOOR, RVOL_FLOOR } from '@/engine/surge/surgeFilter';
import type { SurgeFilters, SurgeTimeframe } from '@/types/surge';
import { AssetSearchBar } from './AssetSearchBar';
import { DualRangeSlider, RangeSlider } from './RangeSlider';

const TIMEFRAMES: SurgeTimeframe[] = ['15m', '1h', '4h', '1D'];

interface SurgeControlPanelProps {
  filters: SurgeFilters;
  resultCount: number;
  onChange: (patch: Partial<SurgeFilters>) => void;
  onReset: () => void;
}

export function SurgeControlPanel({ filters, resultCount, onChange, onReset }: SurgeControlPanelProps) {
  const { t, lang } = useI18n();
  const copy = t.surge.controls;

  const liquidityText =
    filters.minTradingValue <= LIQUIDITY_FLOOR
      ? copy.liquidity.all
      : copy.liquidity.atLeast(formatTradingValue(filters.minTradingValue, lang));

  return (
    <section className="rounded-2xl border border-neutral-800 bg-surface-dark p-4 sm:p-5">
      <header className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-neutral-100">{copy.panelTitle}</h2>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-700 px-3 py-1.5 text-xs font-medium text-neutral-300 transition-all duration-200 hover:border-sky-500 hover:text-sky-300 active:scale-95"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          {copy.reset}
        </button>
      </header>

      <div className="flex flex-col gap-5">
        <AssetSearchBar
          value={filters.query}
          resultCount={resultCount}
          onChange={(query) => onChange({ query })}
        />

        <ControlField label={copy.timeframe.label}>
          <div role="radiogroup" aria-label={copy.timeframe.label} className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {TIMEFRAMES.map((value) => {
              const active = filters.timeframe === value;
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => onChange({ timeframe: value })}
                  className={`rounded-lg px-3 py-2 text-xs font-medium transition-all duration-200 active:scale-95 ${
                    active
                      ? 'bg-sky-500 text-neutral-950 shadow-md shadow-sky-500/20'
                      : 'bg-neutral-900 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100'
                  }`}
                >
                  {copy.timeframe.options[value]}
                </button>
              );
            })}
          </div>
        </ControlField>

        <div className="grid gap-5 md:grid-cols-3">
          <ControlField
            label={copy.rvol.label}
            value={copy.rvol.atLeast(`${filters.minRvol.toFixed(1)}x`)}
            tooltip={copy.rvol.tooltip}
          >
            <RangeSlider
              label={copy.rvol.label}
              min={RVOL_FLOOR}
              max={15}
              step={0.5}
              value={filters.minRvol}
              onChange={(minRvol) => onChange({ minRvol })}
            />
          </ControlField>

          <ControlField label={copy.liquidity.label} value={liquidityText}>
            <RangeSlider
              label={copy.liquidity.label}
              min={10}
              max={1000}
              step={10}
              value={filters.minTradingValue}
              onChange={(minTradingValue) => onChange({ minTradingValue })}
            />
            <div className="mt-3 flex flex-wrap gap-1.5">
              {copy.liquidity.presets.map((preset) => {
                const active = filters.minTradingValue === preset.value;
                return (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => onChange({ minTradingValue: preset.value })}
                    className={`rounded-md px-2.5 py-1 text-2xs font-medium transition-all duration-200 active:scale-95 ${
                      active
                        ? 'bg-neutral-100 text-neutral-950'
                        : 'bg-neutral-900 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </ControlField>

          <ControlField label={copy.change.label} value={formatSignedRange(filters.changeRange)}>
            <DualRangeSlider
              label={copy.change.label}
              lowLabel={copy.change.lowThumb}
              highLabel={copy.change.highThumb}
              min={CHANGE_BOUNDS.min}
              max={CHANGE_BOUNDS.max}
              step={CHANGE_BOUNDS.step}
              value={filters.changeRange}
              onChange={(changeRange) => onChange({ changeRange })}
            />
            <div className="mt-2 flex justify-between text-2xs tabular-nums text-neutral-500">
              <span>{CHANGE_BOUNDS.min.toFixed(1)}%</span>
              <span>+{CHANGE_BOUNDS.max.toFixed(1)}%</span>
            </div>
          </ControlField>
        </div>
      </div>
    </section>
  );
}

function formatSignedRange([low, high]: [number, number]): string {
  const sign = (v: number) => (v > 0 ? '+' : '') + v.toFixed(1);
  return `${sign(low)}% ~ ${sign(high)}%`;
}

interface ControlFieldProps {
  label: string;
  value?: string;
  tooltip?: string;
  children: ReactNode;
}

function ControlField({ label, value, tooltip, children }: ControlFieldProps) {
  return (
    <div className="flex min-w-0 flex-col gap-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-xs font-medium text-neutral-400">{label}</span>
          {tooltip && (
            <span className="group relative inline-flex shrink-0">
              <Info className="h-3.5 w-3.5 text-neutral-500 transition-colors hover:text-sky-400" aria-label={tooltip} />
              <span
                role="tooltip"
                className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 w-60 -translate-x-1/2 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-2xs leading-relaxed text-neutral-200 opacity-0 shadow-xl transition-opacity duration-200 group-hover:opacity-100"
              >
                {tooltip}
              </span>
            </span>
          )}
        </div>
        {value && <span className="whitespace-nowrap text-xs font-semibold tabular-nums text-sky-300">{value}</span>}
      </div>
      {children}
    </div>
  );
}
