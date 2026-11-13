import { TrendingUp, TrendingDown, History } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { BACKTEST_HOLD_BARS } from '@/engine/screener/backtest';
import { formatPrice } from '@/services/api/mockData';
import type { BacktestDirection, BacktestTrade } from '@/types';
import { Section } from '@/components/panel/PanelSection';

const DIRECTION_OPTIONS: { value: BacktestDirection; label: string; icon: typeof TrendingUp; tone: string }[] = [
  { value: 'long', label: 'Long', icon: TrendingUp, tone: 'text-bullish' },
  { value: 'short', label: 'Short', icon: TrendingDown, tone: 'text-bearish' },
];

const RECENT_TRADE_LIMIT = 10;

function formatPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

function formatTradeTime(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleString('en-US', {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function BacktestSection() {
  const backtestDirection = useStore((s) => s.backtestDirection);
  const setBacktestDirection = useStore((s) => s.setBacktestDirection);
  const selectedAssetId = useStore((s) => s.selectedAssetId);
  const backtests = useStore((s) => s.backtests);
  const result = backtests.get(selectedAssetId);

  const winRate = result && result.signals > 0 ? (result.wins / result.signals) * 100 : 0;
  const avgReturn = result && result.signals > 0 ? result.returnSum / result.signals : 0;
  const recentTrades = result ? [...result.trades].reverse().slice(0, RECENT_TRADE_LIMIT) : [];

  return (
    <Section title="Backtest" icon={TrendingUp}>
      <div className="grid grid-cols-2 gap-0.5 bg-subtle-light dark:bg-subtle-dark rounded-lg p-0.5 mb-3">
        {DIRECTION_OPTIONS.map((option) => {
          const active = backtestDirection === option.value;
          const Icon = option.icon;
          return (
            <button
              key={option.value}
              onClick={() => setBacktestDirection(option.value)}
              className={`flex items-center justify-center gap-1 py-1 text-2xs font-medium rounded-md transition-all-smooth ${
                active
                  ? 'bg-white dark:bg-white/10 shadow-sm ' + option.tone
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'
              }`}
            >
              <Icon className="w-3 h-3" />
              {option.label}
            </button>
          );
        })}
      </div>

      <p className="text-2xs text-neutral-400 leading-relaxed mb-3">
        Enters at the close of each bar that meets your conditions, exits {BACKTEST_HOLD_BARS} bars later.
        {backtestDirection === 'short' ? ' Profits when price falls.' : ' Profits when price rises.'}
      </p>

      {!result || result.signals === 0 ? (
        <div className="text-center py-4">
          <History className="w-5 h-5 text-neutral-300 dark:text-neutral-700 mx-auto mb-1.5" />
          <p className="text-2xs text-neutral-400">No historical signals for this asset yet.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2 mb-3">
            <Stat label="Trades" value={result.signals.toString()} />
            <Stat label="Win rate" value={`${winRate.toFixed(0)}%`} />
            <Stat
              label="Avg return"
              value={formatPercent(avgReturn)}
              tone={avgReturn >= 0 ? 'text-bullish' : 'text-bearish'}
            />
          </div>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <Stat label="Best" value={formatPercent(result.bestReturn)} tone="text-bullish" />
            <Stat label="Worst" value={formatPercent(result.worstReturn)} tone="text-bearish" />
          </div>

          <h4 className="text-2xs font-medium text-neutral-500 dark:text-neutral-400 mb-1.5">
            Recent trades
          </h4>
          <div className="space-y-1.5">
            {recentTrades.map((trade) => (
              <TradeRow key={trade.entryTime} trade={trade} />
            ))}
          </div>
          {result.signals > RECENT_TRADE_LIMIT && (
            <p className="mt-2 text-2xs text-neutral-400">
              Showing the latest {RECENT_TRADE_LIMIT} of {result.signals} trades.
            </p>
          )}
        </>
      )}
    </Section>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="p-2 rounded-lg bg-subtle-light/50 dark:bg-subtle-dark/50 border border-border-light/50 dark:border-border-dark/50">
      <div className="text-2xs text-neutral-500 dark:text-neutral-400">{label}</div>
      <div className={`text-xs font-semibold tabular-nums ${tone ?? 'text-neutral-900 dark:text-white'}`}>{value}</div>
    </div>
  );
}

function TradeRow({ trade }: { trade: BacktestTrade }) {
  const isWin = trade.returnPercent > 0;
  return (
    <div className="px-2.5 py-2 rounded-lg border border-border-light/50 dark:border-border-dark/50 bg-subtle-light/30 dark:bg-subtle-dark/30">
      <div className="flex items-center justify-between gap-2">
        <span className="text-2xs text-neutral-500 dark:text-neutral-400 tabular-nums">
          {formatTradeTime(trade.entryTime)} to {formatTradeTime(trade.exitTime)}
        </span>
        <span className={`text-2xs font-semibold tabular-nums ${isWin ? 'text-bullish' : 'text-bearish'}`}>
          {formatPercent(trade.returnPercent)}
        </span>
      </div>
      <div className="mt-1 text-2xs text-neutral-700 dark:text-neutral-300 tabular-nums">
        {formatPrice(trade.entryPrice)} to {formatPrice(trade.exitPrice)}
      </div>
    </div>
  );
}
