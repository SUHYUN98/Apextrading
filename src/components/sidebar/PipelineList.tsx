import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { useStore } from '@/store/useStore';
import { formatPrice } from '@/services/api/mockData';
import { BACKTEST_HOLD_BARS, summarizeBacktests } from '@/engine/screener/backtest';
import {
  selectVolumeCandidates,
  selectConditionMatches,
  selectBacktestRows,
} from '@/engine/screener/pipeline';
import type { AssetAnalysis, PipelineStage } from '@/types';

export type ListView = 'all' | PipelineStage;

const VIEW_TABS: { id: ListView; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 1, label: '1 Volume' },
  { id: 2, label: '2 Filter' },
  { id: 3, label: '3 Backtest' },
];

export function PipelineTabs({ view, onChange }: { view: ListView; onChange: (view: ListView) => void }) {
  return (
    <div className="px-3 py-2 border-b border-border-light dark:border-border-dark">
      <div className="grid grid-cols-4 gap-0.5 bg-subtle-light dark:bg-subtle-dark rounded-lg p-0.5">
        {VIEW_TABS.map((tab) => {
          const active = view === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={`py-1 text-2xs font-medium rounded-md transition-all-smooth truncate ${
                active
                  ? 'bg-white dark:bg-white/10 text-neutral-900 dark:text-white shadow-sm'
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function PipelineList({ stage }: { stage: PipelineStage }) {
  const analyses = useStore((s) => s.analyses);
  const backtests = useStore((s) => s.backtests);
  const backtestDirection = useStore((s) => s.backtestDirection);
  const conditions = useStore((s) => s.conditions);
  const threshold = useStore((s) => s.volumeSpikeThreshold);
  const setThreshold = useStore((s) => s.setVolumeSpikeThreshold);
  const pipelineUpdatedAt = useStore((s) => s.pipelineUpdatedAt);
  const assetFilter = useStore((s) => s.assetFilter);
  const selectedAssetId = useStore((s) => s.selectedAssetId);
  const selectAsset = useStore((s) => s.selectAsset);

  const volumeCandidates = useMemo(
    () => selectVolumeCandidates(analyses, threshold, assetFilter),
    [analyses, threshold, assetFilter]
  );
  const conditionMatches = useMemo(
    () => selectConditionMatches(volumeCandidates, conditions),
    [volumeCandidates, conditions]
  );
  const backtestRows = useMemo(
    () => selectBacktestRows(analyses, backtests, assetFilter),
    [analyses, backtests, assetFilter]
  );

  if (analyses.length === 0) {
    return <EmptyState text="Waiting for market data..." />;
  }

  const updatedLabel = pipelineUpdatedAt
    ? new Date(pipelineUpdatedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '--:--:--';

  const rowProps = (analysis: AssetAnalysis) => ({
    analysis,
    selected: analysis.asset.id === selectedAssetId,
    onSelect: () => selectAsset(analysis.asset.id),
  });

  if (stage === 1) {
    return (
      <>
        <StageHeader
          title={`Volume spike (${volumeCandidates.length})`}
          description="Assets trading at or above this multiple of their 20-bar average volume."
          updatedLabel={updatedLabel}
        >
          <ThresholdInput value={threshold} onCommit={setThreshold} />
        </StageHeader>
        {volumeCandidates.length === 0 ? (
          <EmptyState text="No assets are spiking above this threshold right now." />
        ) : (
          volumeCandidates.map((a) => (
            <StageRow
              key={a.asset.id}
              {...rowProps(a)}
              right={
                <>
                  <div className="text-xs font-semibold tabular-nums text-accent">{a.volumeRatio.toFixed(1)}x</div>
                  <DayChange analysis={a} />
                </>
              }
            />
          ))
        )}
      </>
    );
  }

  if (stage === 2) {
    const description =
      conditions.length > 0
        ? `Volume spikes that also meet all ${conditions.length} condition${conditions.length > 1 ? 's' : ''}. Edit them in the Analysis panel.`
        : 'No conditions set, so every volume spike passes. Add conditions in the Analysis panel.';
    return (
      <>
        <StageHeader title={`Filtered by conditions (${conditionMatches.length})`} description={description} updatedLabel={updatedLabel} />
        {conditionMatches.length === 0 ? (
          <EmptyState
            text={
              volumeCandidates.length === 0
                ? 'No volume spikes to filter yet.'
                : 'No volume spikes meet every condition right now.'
            }
          />
        ) : (
          conditionMatches.map((a) => (
            <StageRow
              key={a.asset.id}
              {...rowProps(a)}
              right={
                <>
                  <div className="text-xs font-semibold tabular-nums text-neutral-900 dark:text-white">
                    {formatPrice(a.asset.currentPrice)}
                  </div>
                  <DayChange analysis={a} />
                </>
              }
            />
          ))
        )}
      </>
    );
  }

  const summary = summarizeBacktests(backtestRows.map((r) => r.result));
  const skipped = Array.from(backtests.values())[0]?.skippedConditions ?? [];
  return (
    <>
      <StageHeader
        title={`Backtest results (${backtestRows.length})`}
        description={`Replays the current rule as a ${backtestDirection === 'long' ? 'long' : 'short'} trade over each asset's history. Enter on signal, exit after ${BACKTEST_HOLD_BARS} bars.`}
        updatedLabel={updatedLabel}
      >
        <div className="mt-3 grid grid-cols-3 gap-2">
          <Metric label="Signals" value={summary.signals.toString()} />
          <Metric label="Win rate" value={`${summary.winRate.toFixed(0)}%`} />
          <Metric
            label="Avg return"
            value={formatSigned(summary.avgReturn, '%')}
            tone={summary.avgReturn >= 0 ? 'bullish' : 'bearish'}
          />
        </div>
        {skipped.length > 0 && (
          <p className="mt-2 text-2xs text-neutral-400 leading-relaxed">
            Not included in backtest: {skipped.join(', ')}
          </p>
        )}
      </StageHeader>
      {backtestRows.length === 0 ? (
        <EmptyState text="No historical signals for this rule yet." />
      ) : (
        backtestRows.map(({ analysis, result }) => {
          const winRate = (result.wins / result.signals) * 100;
          const avgReturn = result.returnSum / result.signals;
          return (
            <StageRow
              key={analysis.asset.id}
              {...rowProps(analysis)}
              right={
                <>
                  <div className="text-xs font-semibold tabular-nums text-neutral-900 dark:text-white">
                    {winRate.toFixed(0)}% win
                  </div>
                  <div className={`text-2xs font-medium tabular-nums ${avgReturn >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                    {result.signals} trade{result.signals > 1 ? 's' : ''} · {formatSigned(avgReturn, '%')}
                  </div>
                </>
              }
            />
          );
        })
      )}
    </>
  );
}

function StageHeader({
  title,
  description,
  updatedLabel,
  children,
}: {
  title: string;
  description: string;
  updatedLabel: string;
  children?: ReactNode;
}) {
  return (
    <div className="px-4 py-3 border-b border-border-light dark:border-border-dark">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold text-neutral-900 dark:text-white">{title}</h3>
        <span className="text-2xs text-neutral-400 tabular-nums">Updated {updatedLabel}</span>
      </div>
      <p className="text-2xs text-neutral-500 dark:text-neutral-400 mt-1 leading-relaxed">{description}</p>
      {children}
    </div>
  );
}

function StageRow({
  analysis,
  selected,
  onSelect,
  right,
}: {
  analysis: AssetAnalysis;
  selected: boolean;
  onSelect: () => void;
  right: ReactNode;
}) {
  return (
    <button
      onClick={onSelect}
      className={`w-full px-3 py-2.5 flex items-center justify-between gap-2 border-b border-border-light/50 dark:border-border-dark/50 transition-all-smooth text-left ${
        selected ? 'bg-accent-muted/40 dark:bg-accent/10' : 'hover:bg-subtle-light dark:hover:bg-subtle-dark'
      }`}
    >
      <div className="min-w-0">
        <span className="block text-xs font-semibold text-neutral-900 dark:text-white truncate">
          {analysis.asset.symbol}
        </span>
        <span className="block text-2xs text-neutral-500 dark:text-neutral-400 truncate">{analysis.asset.name}</span>
      </div>
      <div className="text-right flex-shrink-0">{right}</div>
    </button>
  );
}

function DayChange({ analysis }: { analysis: AssetAnalysis }) {
  const change = analysis.asset.dayChangePercent;
  return (
    <div className={`text-2xs font-medium tabular-nums ${change >= 0 ? 'text-bullish' : 'text-bearish'}`}>
      {formatSigned(change, '%')}
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: 'bullish' | 'bearish' }) {
  return (
    <div className="px-2 py-1.5 rounded-lg bg-subtle-light dark:bg-subtle-dark">
      <div className="text-2xs text-neutral-500 dark:text-neutral-400">{label}</div>
      <div
        className={`text-xs font-semibold tabular-nums ${
          tone === 'bullish' ? 'text-bullish' : tone === 'bearish' ? 'text-bearish' : 'text-neutral-900 dark:text-white'
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function ThresholdInput({ value, onCommit }: { value: number; onCommit: (value: number) => void }) {
  return (
    <label className="mt-3 flex items-center gap-2 text-2xs text-neutral-500 dark:text-neutral-400">
      Volume at least
      <input
        type="number"
        min={0.1}
        step={0.1}
        defaultValue={value}
        onBlur={(e) => {
          const parsed = parseFloat(e.currentTarget.value);
          if (Number.isFinite(parsed) && parsed > 0) onCommit(parsed);
          else e.currentTarget.value = String(value);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
        }}
        className="w-16 px-2 py-1 text-2xs bg-white dark:bg-neutral-800 border border-border-light dark:border-border-dark rounded-md text-neutral-900 dark:text-white outline-none focus:border-accent tabular-nums transition-all-smooth"
      />
      x the 20-bar average
    </label>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="px-4 py-8 text-center">
      <p className="text-xs text-neutral-400">{text}</p>
    </div>
  );
}

function formatSigned(value: number, suffix: string): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}${suffix}`;
}
