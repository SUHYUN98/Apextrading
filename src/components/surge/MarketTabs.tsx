import { Coins, TrendingUp, type LucideIcon } from 'lucide-react';
import { useI18n } from '@/i18n/useI18n';
import type { AssetClass } from '@/types/surge';

const MARKETS: AssetClass[] = ['stock', 'crypto'];

const MARKET_ICONS: Record<AssetClass, LucideIcon> = {
  stock: TrendingUp,
  crypto: Coins,
};

interface MarketTabsProps {
  value: AssetClass;
  counts: Record<AssetClass, number>;
  onChange: (market: AssetClass) => void;
}

export function MarketTabs({ value, counts, onChange }: MarketTabsProps) {
  const { t } = useI18n();
  const copy = t.surge.market;

  return (
    <div
      role="tablist"
      aria-label={copy.label}
      className="grid grid-cols-2 gap-1.5 rounded-2xl border border-neutral-800 bg-surface-dark p-1.5"
    >
      {MARKETS.map((market) => {
        const active = value === market;
        const Icon = MARKET_ICONS[market];
        return (
          <button
            key={market}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(market)}
            className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200 active:scale-[0.98] ${
              active
                ? 'bg-sky-500 text-neutral-950 shadow-md shadow-sky-500/20'
                : 'text-neutral-400 hover:bg-neutral-900 hover:text-neutral-100'
            }`}
          >
            <Icon className="h-4 w-4" />
            <span>{copy.tabs[market]}</span>
            <span
              className={`rounded-md px-1.5 py-0.5 text-2xs tabular-nums ${
                active ? 'bg-neutral-950/15 text-neutral-950' : 'bg-neutral-800 text-neutral-400'
              }`}
            >
              {counts[market]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
