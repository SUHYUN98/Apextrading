import { useMemo, useState, type ReactNode } from 'react';
import { AlertCircle, Radar, RefreshCw, SlidersHorizontal } from 'lucide-react';
import { DEFAULT_SCANNER_SETTINGS } from '@/engine/scanner/settings';
import { useI18n } from '@/i18n/useI18n';
import type { ExchangeId, ScannerTimeframe } from '@/services/scanner/types';
import type { ScannerSettings, SignalDirection, SignalKind } from '@/types/scanner';
import { EXCHANGE_NAME, SCANNER_TEXT, SKIP_REASON_TEXT, type ScannerTextKey } from './scannerText';
import { ScannerSettingsPanel } from './ScannerSettingsPanel';
import { SignalRow } from './SignalRow';
import { useScanner } from './useScanner';

type KindFilter = 'all' | SignalKind;
type ExchangeFilter = 'all' | ExchangeId;
type DirectionFilter = 'all' | SignalDirection;

const TIMEFRAMES: ScannerTimeframe[] = ['15m', '1H', '4H'];
const KIND_FILTERS: KindFilter[] = ['all', 'volatility', 'reversal', 'continuation'];
const EXCHANGE_FILTERS: ExchangeFilter[] = ['all', 'binance', 'bybit'];
const DIRECTION_FILTERS: DirectionFilter[] = ['all', 'long', 'short', 'undetermined'];
const EXCHANGE_IDS: ExchangeId[] = ['binance', 'bybit'];

const KIND_HINT: Record<SignalKind, ScannerTextKey> = {
  volatility: 'volatilityHint',
  reversal: 'reversalHint',
  continuation: 'continuationHint',
};

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? 'border-accent bg-accent/15 text-accent'
          : 'border-white/15 text-neutral-300 hover:border-white/30 hover:text-neutral-100'
      }`}
    >
      {children}
    </button>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
      <div className="text-2xs text-neutral-400">{label}</div>
      <div className="mt-1 text-xl font-semibold tabular-nums text-neutral-50">{value}</div>
    </div>
  );
}

export function ScannerScreen() {
  const { lang } = useI18n();
  const t = (key: ScannerTextKey) => SCANNER_TEXT[key][lang];

  const [settings, setSettings] = useState<ScannerSettings>(DEFAULT_SCANNER_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);
  const [kind, setKind] = useState<KindFilter>('all');
  const [exchange, setExchange] = useState<ExchangeFilter>('all');
  const [direction, setDirection] = useState<DirectionFilter>('all');

  const { state, scan } = useScanner(settings);
  const outcome = state.outcome;

  const visibleSignals = useMemo(
    () =>
      (outcome?.signals ?? []).filter(
        (signal) =>
          (kind === 'all' || signal.kind === kind) &&
          (exchange === 'all' || signal.exchange === exchange) &&
          (direction === 'all' || signal.direction === direction)
      ),
    [outcome, kind, exchange, direction]
  );

  const excludedCount = outcome
    ? Object.values(outcome.skipped).reduce((sum, count) => sum + (count ?? 0), 0)
    : 0;
  const failedExchanges = outcome ? EXCHANGE_IDS.filter((id) => outcome.exchangeErrors[id]) : [];
  const allExchangesFailed = failedExchanges.length === EXCHANGE_IDS.length;
  const updatedLabel = outcome
    ? new Date(outcome.finishedAt).toLocaleTimeString(lang === 'KR' ? 'ko-KR' : 'en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : '-';

  const skipEntries = outcome
    ? (Object.entries(outcome.skipped) as [keyof typeof SKIP_REASON_TEXT, number][]).filter(([, count]) => count > 0)
    : [];

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-canvas-dark text-neutral-100">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 p-3 sm:gap-5 sm:p-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-accent">
              <Radar className="h-5 w-5" />
              <span className="text-2xs font-semibold uppercase tracking-widest">{t('title')}</span>
            </div>
            <h1 className="mt-2 text-2xl font-semibold leading-tight text-neutral-50 sm:text-3xl">{t('title')}</h1>
            <p className="mt-2 text-sm leading-relaxed text-neutral-400">{t('subtitle')}</p>
          </div>
          <div className="flex flex-col items-start gap-2 sm:items-end">
            <button
              type="button"
              onClick={() => void scan()}
              disabled={state.status === 'scanning'}
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-neutral-950 transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${state.status === 'scanning' ? 'animate-spin' : ''}`} />
              {state.status === 'scanning' ? t('scanning') : t('scanNow')}
            </button>
            <span className="text-2xs text-neutral-500">
              {t('updatedAt')}: <span className="tabular-nums text-neutral-300">{updatedLabel}</span> · {t('autoRefresh')}
            </span>
          </div>
        </header>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-lg border border-white/10 bg-white/[0.03] p-1">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf}
                type="button"
                onClick={() => setSettings((prev) => ({ ...prev, timeframe: tf }))}
                aria-pressed={settings.timeframe === tf}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  settings.timeframe === tf ? 'bg-white/15 text-neutral-50' : 'text-neutral-400 hover:text-neutral-100'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setShowSettings((v) => !v)}
            aria-expanded={showSettings}
            className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-xs font-medium text-neutral-200 transition-colors hover:border-white/30 hover:text-neutral-50"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            {t('settings')}
          </button>
        </div>

        {showSettings && (
          <ScannerSettingsPanel
            lang={lang}
            value={settings}
            onApply={(next) => {
              setSettings(next);
              setShowSettings(false);
            }}
          />
        )}

        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <SummaryTile label={t('scanned')} value={outcome ? String(outcome.scanned) : '-'} />
          <SummaryTile label={t('signals')} value={outcome ? String(outcome.signals.length) : '-'} />
          <SummaryTile label={t('excluded')} value={outcome ? String(excludedCount) : '-'} />
        </div>

        {skipEntries.length > 0 && (
          <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
            <div className="mb-2 text-2xs font-semibold uppercase tracking-wider text-neutral-500">{t('excludedBreakdown')}</div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-400">
              {skipEntries.map(([reason, count]) => (
                <span key={reason}>
                  {SKIP_REASON_TEXT[reason][lang]}: <span className="tabular-nums text-neutral-200">{count}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {failedExchanges.map((id) => (
          <div key={id} className="flex items-start gap-2 rounded-xl border border-bearish/40 bg-bearish/10 px-4 py-3 text-xs text-neutral-100">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-bearish" />
            <span>
              {EXCHANGE_NAME[id]}: {t('exchangeError')}
            </span>
          </div>
        ))}

        {state.status === 'error' && (
          <div className="flex items-start gap-2 rounded-xl border border-bearish/40 bg-bearish/10 px-4 py-3 text-xs text-neutral-100">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-bearish" />
            <div>
              <div className="font-semibold">{t('errorTitle')}</div>
              <div className="mt-0.5 text-neutral-300">{t('errorBody')}</div>
            </div>
          </div>
        )}

        <section className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3 sm:p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-6">
            <FilterRow label={t('filterKind')}>
              {KIND_FILTERS.map((value) => (
                <Chip key={value} active={kind === value} onClick={() => setKind(value)}>
                  {value === 'all' ? t('all') : t(value)}
                </Chip>
              ))}
            </FilterRow>
            <FilterRow label={t('filterExchange')}>
              {EXCHANGE_FILTERS.map((value) => (
                <Chip key={value} active={exchange === value} onClick={() => setExchange(value)}>
                  {value === 'all' ? t('all') : EXCHANGE_NAME[value]}
                </Chip>
              ))}
            </FilterRow>
          </div>
          <FilterRow label={t('filterDirection')}>
            {DIRECTION_FILTERS.map((value) => (
              <Chip key={value} active={direction === value} onClick={() => setDirection(value)}>
                {value === 'all' ? t('all') : t(value)}
              </Chip>
            ))}
          </FilterRow>
          {kind !== 'all' && <p className="text-2xs text-neutral-500">{t(KIND_HINT[kind])}</p>}
        </section>

        <section className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-semibold text-neutral-100">{t('signalList')}</h2>
            <span className="text-2xs tabular-nums text-neutral-500">{visibleSignals.length}</span>
          </div>

          {!outcome && state.status !== 'error' && (
            <div className="rounded-xl border border-white/10 bg-white/[0.02] px-6 py-10 text-center">
              <div className="text-sm font-medium text-neutral-200">{t('scanning')}</div>
              <p className="mt-1 text-xs text-neutral-500">{t('scanningBody')}</p>
            </div>
          )}

          {outcome && !allExchangesFailed && visibleSignals.length === 0 && (
            <div className="rounded-xl border border-white/10 bg-white/[0.02] px-6 py-10 text-center">
              <div className="text-sm font-medium text-neutral-200">{t('emptyTitle')}</div>
              <p className="mt-1 text-xs text-neutral-500">{t('emptyBody')}</p>
            </div>
          )}

          {visibleSignals.map((signal) => (
            <SignalRow key={signal.id} signal={signal} lang={lang} />
          ))}
        </section>
      </div>
    </div>
  );
}

function FilterRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-20 shrink-0 text-2xs font-semibold uppercase tracking-wider text-neutral-500">{label}</span>
      {children}
    </div>
  );
}
