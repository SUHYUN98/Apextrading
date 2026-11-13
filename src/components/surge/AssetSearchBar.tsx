import { Search, X } from 'lucide-react';
import { useI18n } from '@/i18n/useI18n';

interface AssetSearchBarProps {
  value: string;
  resultCount: number;
  onChange: (value: string) => void;
}

export function AssetSearchBar({ value, resultCount, onChange }: AssetSearchBarProps) {
  const { t } = useI18n();
  const copy = t.surge.controls.search;

  return (
    <div className="relative">
      <label htmlFor="surge-search" className="sr-only">
        {copy.label}
      </label>
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
      <input
        id="surge-search"
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={copy.placeholder}
        className="w-full rounded-xl border border-neutral-800 bg-neutral-900 py-2.5 pl-10 pr-24 text-sm text-neutral-100 placeholder:text-neutral-500 outline-none transition-all duration-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 [&::-webkit-search-cancel-button]:hidden"
      />
      <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-2">
        {value.trim() && (
          <>
            <span className="hidden text-2xs tabular-nums text-neutral-400 sm:inline">{copy.results(resultCount)}</span>
            <button
              type="button"
              onClick={() => onChange('')}
              aria-label={copy.clear}
              className="rounded-md p-1 text-neutral-400 transition-colors duration-200 hover:bg-neutral-800 hover:text-neutral-100"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
