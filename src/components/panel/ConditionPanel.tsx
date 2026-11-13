import { useState } from 'react';
import {
  Plus,
  X,
  ChevronLeft,
  Sliders,
  Activity,
  Trash2,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowUpRight,
  ArrowDownRight,
  AlertCircle,
} from 'lucide-react';
import { useStore, generateConditionId } from '@/store/useStore';
import { BacktestSection } from '@/components/panel/BacktestSection';
import { Section } from '@/components/panel/PanelSection';
import type { ConditionField, ConditionOperator, ScreenerCondition } from '@/types';

const FIELD_OPTIONS: { value: ConditionField; label: string; unit: string }[] = [
  { value: 'volumeRatio', label: 'Volume Ratio (vs 20-avg)', unit: 'x' },
  { value: 'rsi', label: 'RSI (14)', unit: '' },
  { value: 'dayChangePercent', label: 'Daily Change %', unit: '%' },
  { value: 'nearSupport', label: 'Near Support (within %)', unit: '%' },
  { value: 'nearResistance', label: 'Near Resistance (within %)', unit: '%' },
  { value: 'price', label: 'Price', unit: '$' },
  { value: 'ema20', label: 'Price vs EMA20', unit: '' },
  { value: 'ema50', label: 'Price vs EMA50', unit: '' },
];

const OPERATOR_OPTIONS: { value: ConditionOperator; label: string; icon: typeof Plus }[] = [
  { value: '>', label: 'Above', icon: ArrowUpRight },
  { value: '<', label: 'Below', icon: ArrowDownRight },
  { value: '>=', label: 'Above or Equal', icon: ArrowUpRight },
  { value: '<=', label: 'Below or Equal', icon: ArrowDownRight },
];

function buildConditionLabel(field: ConditionField, operator: ConditionOperator, value: number): string {
  const fieldMeta = FIELD_OPTIONS.find((f) => f.value === field);
  const opMeta = OPERATOR_OPTIONS.find((o) => o.value === operator);
  const unit = fieldMeta?.unit || '';
  return `${fieldMeta?.label || field} ${opMeta?.label || operator} ${value}${unit}`;
}

export function ConditionPanel() {
  const {
    conditions,
    addCondition,
    removeCondition,
    clearConditions,
    trendlineRule,
    setTrendlineRule,
    interpretationLog,
    clearInterpretationLog,
    addInterpretationEntry,
    analyses,
    selectedAssetId,
    rightPanelCollapsed,
    toggleRightPanel,
  } = useStore();

  const [showAddForm, setShowAddForm] = useState(false);
  const [newField, setNewField] = useState<ConditionField>('volumeRatio');
  const [newOperator, setNewOperator] = useState<ConditionOperator>('>');
  const [newValue, setNewValue] = useState('1.5');

  const handleAdd = () => {
    const value = parseFloat(newValue);
    if (isNaN(value)) return;
    const condition: ScreenerCondition = {
      id: generateConditionId(),
      field: newField,
      operator: newOperator,
      value,
      label: buildConditionLabel(newField, newOperator, value),
    };
    addCondition(condition);
    setShowAddForm(false);
  };

  const handleRunInterpretation = () => {
    const selected = analyses.find((a) => a.asset.id === selectedAssetId);
    if (!selected) return;
    addInterpretationEntry({
      id: `interp-${Date.now()}`,
      assetId: selected.asset.id,
      symbol: selected.asset.symbol,
      timestamp: Date.now(),
      title: selected.sentiment === 'bullish' ? 'Bullish Signal Detected' : selected.sentiment === 'bearish' ? 'Bearish Signal Detected' : 'Neutral Setup',
      details: selected.interpretation,
      sentiment: selected.sentiment,
      matchedConditions: selected.matchedConditions.map((c) => c.label),
    });
  };

  if (rightPanelCollapsed) {
    return (
      <div className="w-12 border-l border-border-light dark:border-border-dark flex flex-col items-center py-3 gap-3 bg-surface-light dark:bg-surface-dark flex-shrink-0">
        <button
          onClick={toggleRightPanel}
          className="p-1.5 rounded-lg hover:bg-subtle-light dark:hover:bg-subtle-dark transition-all-smooth"
        >
          <ChevronLeft className="w-4 h-4 text-neutral-500" />
        </button>
        <div className="w-6 h-px bg-border-light dark:bg-border-dark" />
        <div className="p-1.5">
          <Sliders className="w-4 h-4 text-neutral-500" />
        </div>
        <div className="p-1.5">
          <Activity className="w-4 h-4 text-neutral-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full lg:w-80 border-l border-border-light dark:border-border-dark flex flex-col bg-surface-light dark:bg-surface-dark flex-shrink-0 animate-slide-in-right">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border-light dark:border-border-dark flex items-center justify-between">
        <h2 className="text-sm font-semibold text-neutral-900 dark:text-white">Analysis</h2>
        <button
          onClick={toggleRightPanel}
          className="p-1.5 rounded-lg hover:bg-subtle-light dark:hover:bg-subtle-dark transition-all-smooth"
        >
          <ChevronLeft className="w-4 h-4 text-neutral-500" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {/* Trendline Settings */}
        <Section title="Trendline Detection" icon={Sliders}>
          <div className="space-y-3">
            <SliderInput
              label="Lookback Period"
              value={trendlineRule.lookbackPeriod}
              min={5}
              max={30}
              onChange={(v) => setTrendlineRule({ lookbackPeriod: v })}
            />
            <SliderInput
              label="Sensitivity"
              value={trendlineRule.sensitivity}
              min={1}
              max={10}
              onChange={(v) => setTrendlineRule({ sensitivity: v })}
            />
            <SliderInput
              label="Min Touches"
              value={trendlineRule.minTouches}
              min={2}
              max={5}
              onChange={(v) => setTrendlineRule({ minTouches: v })}
            />
          </div>
        </Section>

        {/* Condition Builder */}
        <Section title="Condition Builder" icon={Sparkles}>
          <div className="space-y-2">
            {conditions.map((c) => (
              <div
                key={c.id}
                className="group flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg bg-subtle-light dark:bg-subtle-dark border border-border-light/50 dark:border-border-dark/50"
              >
                <span className="text-2xs text-neutral-700 dark:text-neutral-300 leading-tight">
                  {c.label}
                </span>
                <button
                  onClick={() => removeCondition(c.id)}
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-all-smooth flex-shrink-0"
                >
                  <X className="w-3 h-3 text-neutral-500" />
                </button>
              </div>
            ))}

            {showAddForm ? (
              <div className="p-2.5 rounded-lg border border-accent/30 bg-accent-muted/20 space-y-2.5 animate-fade-in">
                <div>
                  <label className="text-2xs text-neutral-500 dark:text-neutral-400 mb-1 block">Field</label>
                  <select
                    value={newField}
                    onChange={(e) => setNewField(e.target.value as ConditionField)}
                    className="w-full px-2 py-1.5 text-2xs bg-white dark:bg-neutral-800 border border-border-light dark:border-border-dark rounded-md text-neutral-900 dark:text-white outline-none focus:border-accent transition-all-smooth"
                  >
                    {FIELD_OPTIONS.map((f) => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-2xs text-neutral-500 dark:text-neutral-400 mb-1 block">Operator</label>
                  <select
                    value={newOperator}
                    onChange={(e) => setNewOperator(e.target.value as ConditionOperator)}
                    className="w-full px-2 py-1.5 text-2xs bg-white dark:bg-neutral-800 border border-border-light dark:border-border-dark rounded-md text-neutral-900 dark:text-white outline-none focus:border-accent transition-all-smooth"
                  >
                    {OPERATOR_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-2xs text-neutral-500 dark:text-neutral-400 mb-1 block">Value</label>
                  <input
                    type="number"
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    step="0.1"
                    className="w-full px-2 py-1.5 text-2xs bg-white dark:bg-neutral-800 border border-border-light dark:border-border-dark rounded-md text-neutral-900 dark:text-white outline-none focus:border-accent transition-all-smooth"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleAdd}
                    className="flex-1 py-1.5 text-2xs font-medium bg-accent text-white rounded-md hover:bg-accent-hover transition-all-smooth"
                  >
                    Add Condition
                  </button>
                  <button
                    onClick={() => setShowAddForm(false)}
                    className="px-2.5 py-1.5 text-2xs font-medium text-neutral-500 rounded-md hover:bg-subtle-light dark:hover:bg-subtle-dark transition-all-smooth"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowAddForm(true)}
                className="w-full flex items-center justify-center gap-1.5 py-2 text-2xs font-medium text-accent border border-dashed border-border-light dark:border-border-dark rounded-lg hover:border-accent hover:bg-accent-muted/10 transition-all-smooth"
              >
                <Plus className="w-3 h-3" />
                Add Condition
              </button>
            )}

            {conditions.length > 0 && (
              <button
                onClick={clearConditions}
                className="w-full flex items-center justify-center gap-1 py-1.5 text-2xs text-neutral-400 hover:text-bearish transition-all-smooth"
              >
                <Trash2 className="w-3 h-3" />
                Clear all
              </button>
            )}
          </div>
        </Section>

        <BacktestSection />

        {/* Interpretation */}
        <Section title="Interpretation" icon={Activity} action={
          <button
            onClick={handleRunInterpretation}
            className="text-2xs font-medium text-accent hover:text-accent-hover transition-all-smooth"
          >
            Run
          </button>
        }>
          {/* Current asset summary */}
          {(() => {
            const selected = analyses.find((a) => a.asset.id === selectedAssetId);
            if (!selected) return null;
            return (
              <div className="mb-3 p-3 rounded-lg border border-border-light dark:border-border-dark bg-subtle-light/50 dark:bg-subtle-dark/50">
                <div className="flex items-center gap-2 mb-1.5">
                  <SentimentBadge sentiment={selected.sentiment} />
                  <span className="text-2xs text-neutral-500 dark:text-neutral-400">{selected.asset.symbol}</span>
                </div>
                <p className="text-2xs text-neutral-700 dark:text-neutral-300 leading-relaxed">
                  {selected.interpretation}
                </p>
                {selected.matchedConditions.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {selected.matchedConditions.map((c) => (
                      <span
                        key={c.id}
                        className="px-1.5 py-0.5 text-2xs font-medium bg-accent-muted/30 dark:bg-accent/15 text-accent rounded"
                      >
                        {c.label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Log */}
          {interpretationLog.length > 0 ? (
            <div className="space-y-2">
              {interpretationLog.map((entry) => (
                <div
                  key={entry.id}
                  className="p-2.5 rounded-lg border border-border-light/50 dark:border-border-dark/50 bg-subtle-light/30 dark:bg-subtle-dark/30 animate-fade-in"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-1.5">
                      <SentimentBadge sentiment={entry.sentiment} small />
                      <span className="text-2xs font-medium text-neutral-700 dark:text-neutral-300">
                        {entry.symbol}
                      </span>
                    </div>
                    <span className="text-2xs text-neutral-400 tabular-nums">
                      {new Date(entry.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-2xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                    {entry.details}
                  </p>
                </div>
              ))}
              <button
                onClick={clearInterpretationLog}
                className="w-full flex items-center justify-center gap-1 py-1.5 text-2xs text-neutral-400 hover:text-bearish transition-all-smooth"
              >
                <Trash2 className="w-3 h-3" />
                Clear log
              </button>
            </div>
          ) : (
            <div className="text-center py-4">
              <AlertCircle className="w-5 h-5 text-neutral-300 dark:text-neutral-700 mx-auto mb-1.5" />
              <p className="text-2xs text-neutral-400">
                Click "Run" to generate an interpretation for the current asset
              </p>
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}

function SliderInput({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-2xs text-neutral-500 dark:text-neutral-400">{label}</span>
        <span className="text-2xs font-semibold tabular-nums text-neutral-900 dark:text-white">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full h-1 bg-border-light dark:bg-border-dark rounded-full appearance-none cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:cursor-pointer
          [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full
          [&::-moz-range-thumb]:bg-accent [&::-moz-range-thumb]:border-none [&::-moz-range-thumb]:cursor-pointer"
      />
    </div>
  );
}

function SentimentBadge({ sentiment, small }: { sentiment: 'bullish' | 'bearish' | 'neutral'; small?: boolean }) {
  const config = {
    bullish: { color: '#34C759', bg: 'rgba(52,199,89,0.12)', label: 'Bullish', icon: TrendingUp },
    bearish: { color: '#FF3B30', bg: 'rgba(255,59,48,0.12)', label: 'Bearish', icon: TrendingDown },
    neutral: { color: '#8E8E93', bg: 'rgba(142,142,147,0.12)', label: 'Neutral', icon: Minus },
  };
  const c = config[sentiment];
  const Icon = c.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-2xs font-medium ${small ? '' : 'px-2 py-0.5'}`}
      style={{ backgroundColor: c.bg, color: c.color }}
    >
      <Icon className={small ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
      {c.label}
    </span>
  );
}
