import { useI18n } from '@/i18n/useI18n';
import type { SectorSummary } from '@/engine/surge/surgeFilter';
import type { SectorId } from '@/types/surge';

interface SectorBadgeBarProps {
  sectors: SectorSummary[];
  totalCount: number;
  activeSector: SectorId | null;
  onSelect: (sector: SectorId | null) => void;
}

export function SectorBadgeBar({ sectors, totalCount, activeSector, onSelect }: SectorBadgeBarProps) {
  const { t } = useI18n();
  const copy = t.surge.sectorBar;

  return (
    <section className="rounded-2xl border border-neutral-800 bg-surface-dark p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-neutral-100">{copy.title}</h2>
        <span className="text-xs tabular-nums text-neutral-500">{copy.total(totalCount)}</span>
      </div>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        <SectorBadge label={copy.all} active={activeSector === null} onClick={() => onSelect(null)} />
        {sectors.map((summary) => (
          <SectorBadge
            key={summary.sector}
            label={`${t.surge.sectors[summary.sector]} (${copy.badge(summary.count, summary.avgRvol.toFixed(1))})`}
            active={activeSector === summary.sector}
            onClick={() => onSelect(activeSector === summary.sector ? null : summary.sector)}
          />
        ))}
        {sectors.length === 0 && <span className="py-1.5 text-xs text-neutral-500">{copy.empty}</span>}
      </div>
    </section>
  );
}

interface SectorBadgeProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

function SectorBadge({ label, active, onClick }: SectorBadgeProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`shrink-0 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all duration-200 active:scale-95 ${
        active
          ? 'border-sky-400 bg-sky-500/15 text-sky-200'
          : 'border-neutral-700 bg-neutral-900 text-neutral-300 hover:border-neutral-500 hover:text-neutral-100'
      }`}
    >
      {label}
    </button>
  );
}
