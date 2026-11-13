import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { useI18n } from '@/i18n/useI18n';
import { formatPrice, formatRvol, formatSignedPct, formatTradingValue, formatUsdMillions } from '@/engine/surge/format';
import type { SurgeAsset, SurgeSort, SurgeSortKey } from '@/types/surge';
import { TopNSelector } from './TopNSelector';

const RVOL_BAR_MAX = 15;

type ColumnId = 'rank' | 'name' | 'sector' | 'price' | 'tradingValue' | 'rvol' | 'volumeChange';

interface Column {
  id: ColumnId;
  sortKey: SurgeSortKey | null;
  align: 'left' | 'right';
}

const COLUMNS: Column[] = [
  { id: 'rank', sortKey: null, align: 'left' },
  { id: 'name', sortKey: 'name', align: 'left' },
  { id: 'sector', sortKey: null, align: 'left' },
  { id: 'price', sortKey: 'changePct', align: 'right' },
  { id: 'tradingValue', sortKey: 'tradingValue', align: 'right' },
  { id: 'rvol', sortKey: 'rvol', align: 'left' },
  { id: 'volumeChange', sortKey: 'volumeChangePct', align: 'right' },
];

interface SurgeTableProps {
  title: string;
  rows: SurgeAsset[];
  sort: SurgeSort;
  topN: number;
  onSort: (key: SurgeSortKey) => void;
  onTopNChange: (value: number) => void;
  onResetFilters: () => void;
}

export function SurgeTable({ title, rows, sort, topN, onSort, onTopNChange, onResetFilters }: SurgeTableProps) {
  const { t } = useI18n();
  const copy = t.surge.table;

  return (
    <section className="overflow-hidden rounded-2xl border border-neutral-800 bg-surface-dark">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800 px-4 py-4 sm:px-5">
        <div className="flex items-baseline gap-3">
          <h2 className="text-sm font-semibold text-neutral-100">{title}</h2>
          <span className="text-xs tabular-nums text-neutral-500">{copy.shown(rows.length)}</span>
        </div>
        <TopNSelector value={topN} onChange={onTopNChange} />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="bg-neutral-900/60 text-xs text-neutral-400">
              {COLUMNS.map((column) => {
                const label = copy.columns[column.id];
                return (
                  <th
                    key={column.id}
                    scope="col"
                    className={`whitespace-nowrap px-4 py-3 font-medium ${column.align === 'right' ? 'text-right' : 'text-left'}`}
                  >
                    {column.sortKey ? (
                      <SortButton
                        label={label}
                        active={sort.key === column.sortKey}
                        direction={sort.direction}
                        alignRight={column.align === 'right'}
                        onClick={() => onSort(column.sortKey as SurgeSortKey)}
                      />
                    ) : (
                      label
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((asset, index) => (
              <SurgeRow key={asset.id} asset={asset} rank={index + 1} />
            ))}
          </tbody>
        </table>

        {rows.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <p className="text-sm text-neutral-300">{copy.empty}</p>
            <p className="text-xs text-neutral-500">{copy.emptyHint}</p>
            <button
              type="button"
              onClick={onResetFilters}
              className="mt-1 rounded-lg border border-neutral-700 px-3 py-1.5 text-xs font-medium text-neutral-300 transition-all duration-200 hover:border-sky-500 hover:text-sky-300"
            >
              {t.surge.controls.reset}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

interface SortButtonProps {
  label: string;
  active: boolean;
  direction: SurgeSort['direction'];
  alignRight: boolean;
  onClick: () => void;
}

function SortButton({ label, active, direction, alignRight, onClick }: SortButtonProps) {
  const Icon = !active ? ArrowUpDown : direction === 'asc' ? ArrowUp : ArrowDown;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`-mx-1 inline-flex items-center gap-1 rounded-md px-1 py-0.5 transition-colors duration-200 hover:text-neutral-100 ${
        alignRight ? 'flex-row-reverse' : ''
      } ${active ? 'text-sky-300' : ''}`}
    >
      <span>{label}</span>
      <Icon className={`h-3 w-3 shrink-0 ${active ? 'opacity-100' : 'opacity-40'}`} />
    </button>
  );
}

function changeColor(value: number): string {
  if (value > 0) return 'text-red-400';
  if (value < 0) return 'text-emerald-400';
  return 'text-neutral-400';
}

interface SurgeRowProps {
  asset: SurgeAsset;
  rank: number;
}

function SurgeRow({ asset, rank }: SurgeRowProps) {
  const { t, lang } = useI18n();
  const rvol = asset.rvol;
  const volumeChange = asset.volumeChangePct;
  const tradingValueText =
    asset.currency === 'USD'
      ? formatUsdMillions(asset.tradingValueLocal, lang)
      : formatTradingValue(asset.tradingValue, lang);
  return (
    <tr className="border-t border-neutral-800 transition-colors duration-200 hover:bg-neutral-900/70">
      <td className="px-4 py-3 text-xs font-semibold tabular-nums text-neutral-500">{rank}</td>
      <td className="px-4 py-3">
        <div className="flex flex-col gap-0.5">
          <span className="whitespace-nowrap font-medium text-neutral-100">{asset.name[lang]}</span>
          <span className="text-2xs tabular-nums text-neutral-500">
            {asset.ticker} · {t.surge.assetClass[asset.assetClass]}
          </span>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className="inline-flex whitespace-nowrap rounded-md bg-neutral-800 px-2 py-0.5 text-2xs text-neutral-300">
          {t.surge.sectors[asset.sector]}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex flex-col items-end">
          <span className="font-medium tabular-nums text-neutral-100">{formatPrice(asset.price, asset.currency, lang)}</span>
          <span className={`text-xs font-medium tabular-nums ${changeColor(asset.changePct)}`}>
            {formatSignedPct(asset.changePct)}
          </span>
        </div>
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-neutral-200">
        {tradingValueText}
      </td>
      <td className="px-4 py-3">
        <div className="flex w-28 flex-col gap-1.5">
          <span className="inline-flex w-fit rounded-md border border-sky-500/40 bg-sky-500/15 px-2 py-0.5 text-xs font-semibold tabular-nums text-sky-200">
            {formatRvol(rvol)}
          </span>
          <div className="h-1 w-full overflow-hidden rounded-full bg-neutral-800">
            <div
              className="h-full rounded-full bg-sky-400 transition-all duration-500"
              style={{ width: `${Math.min(rvol / RVOL_BAR_MAX, 1) * 100}%` }}
            />
          </div>
        </div>
      </td>
      <td className={`px-4 py-3 text-right text-xs font-medium tabular-nums ${changeColor(volumeChange)}`}>
        {formatSignedPct(volumeChange, 1)}
      </td>
    </tr>
  );
}
