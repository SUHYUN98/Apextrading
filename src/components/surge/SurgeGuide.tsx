import { useState } from 'react';
import { BookOpen, ChevronDown } from 'lucide-react';
import { useI18n } from '@/i18n/useI18n';

export function SurgeGuide() {
  const { t } = useI18n();
  const copy = t.surge.guide;
  const [open, setOpen] = useState(false);

  return (
    <section className="rounded-2xl border border-neutral-800 bg-surface-dark">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left sm:px-5"
      >
        <span className="flex items-center gap-2.5 text-sm font-semibold text-neutral-100">
          <BookOpen className="h-4 w-4 text-sky-400" />
          {copy.toggle}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-neutral-400 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      <div
        className={`grid transition-all duration-300 ease-out ${open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
      >
        <div className="overflow-hidden">
          <div className="grid gap-5 border-t border-neutral-800 px-4 py-5 sm:px-5 lg:grid-cols-2">
            <div className="flex flex-col gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-sky-300">{copy.overviewTitle}</h3>
              <p className="text-sm leading-relaxed text-neutral-300">{copy.overview}</p>

              <h3 className="mt-3 text-xs font-semibold uppercase tracking-wide text-sky-300">{copy.tipsTitle}</h3>
              <ul className="flex flex-col gap-2">
                {copy.tips.map((tip) => (
                  <li key={tip} className="flex gap-2 text-sm leading-relaxed text-neutral-300">
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-sky-400" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col gap-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-sky-300">{copy.filtersTitle}</h3>
              {copy.filters.map((item) => (
                <div key={item.name} className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-3.5">
                  <p className="text-sm font-semibold text-neutral-100">{item.name}</p>
                  <p className="mt-1 text-xs leading-relaxed text-neutral-400">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
