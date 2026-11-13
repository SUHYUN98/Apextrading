import { useI18n } from '@/i18n/useI18n';

const TOP_N_OPTIONS = [5, 10, 20, 30];

interface TopNSelectorProps {
  value: number;
  onChange: (value: number) => void;
}

export function TopNSelector({ value, onChange }: TopNSelectorProps) {
  const { t } = useI18n();
  const copy = t.surge.table.topN;

  return (
    <div role="radiogroup" aria-label={copy.label} className="flex items-center gap-2">
      <span className="hidden text-2xs text-neutral-500 sm:inline">{copy.label}</span>
      <div className="flex items-center rounded-lg bg-neutral-900 p-0.5">
        {TOP_N_OPTIONS.map((n) => {
          const active = value === n;
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(n)}
              className={`rounded-md px-2.5 py-1 text-2xs font-semibold tabular-nums transition-all duration-200 active:scale-95 ${
                active
                  ? 'bg-neutral-100 text-neutral-950 shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-100'
              }`}
            >
              {copy.option(n)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
