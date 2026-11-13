import { useState } from 'react';
import { ChevronDown, ExternalLink } from 'lucide-react';
import type { Lang } from '@/i18n/types';
import { formatPrice } from '@/services/api/mockData';
import type { ScannerSignal, SignalDirection } from '@/types/scanner';
import { EXCHANGE_NAME, SCANNER_TEXT, type ScannerTextKey } from './scannerText';

const DIRECTION_STYLE: Record<SignalDirection, string> = {
  long: 'bg-bullish/15 text-bullish',
  short: 'bg-bearish/15 text-bearish',
  undetermined: 'bg-white/10 text-neutral-300',
};

function formatSignalTime(ms: number, lang: Lang): string {
  return new Date(ms).toLocaleString(lang === 'KR' ? 'ko-KR' : 'en-US', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function SignalRow({ signal, lang }: { signal: ScannerSignal; lang: Lang }) {
  const [open, setOpen] = useState(false);
  const t = (key: ScannerTextKey) => SCANNER_TEXT[key][lang];

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] transition-all-smooth hover:border-white/20">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 text-left"
      >
        <div className="min-w-[150px] flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-semibold text-neutral-50">{signal.baseAsset}</span>
            <span className="text-2xs text-neutral-500">
              {EXCHANGE_NAME[signal.exchange]} · {signal.symbol}
            </span>
          </div>
          <div className="mt-0.5 text-xs text-neutral-400">{t(signal.kind)}</div>
        </div>

        <span className={`rounded-md px-2 py-1 text-2xs font-semibold ${DIRECTION_STYLE[signal.direction]}`}>
          {t(signal.direction)}
        </span>

        <div className="flex w-32 items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-accent transition-all duration-500" style={{ width: `${signal.score}%` }} />
          </div>
          <span className="w-8 text-right text-xs font-semibold tabular-nums text-neutral-100">{signal.score}</span>
        </div>

        <span className="text-2xs tabular-nums text-neutral-500">{formatSignalTime(signal.signalTime, lang)}</span>

        <ChevronDown
          className={`h-4 w-4 text-neutral-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="grid gap-5 border-t border-white/10 px-4 py-4 sm:grid-cols-2 animate-fade-in">
          <div>
            <h4 className="mb-2 text-2xs font-semibold uppercase tracking-wider text-neutral-500">{t('readings')}</h4>
            <dl className="grid grid-cols-2 gap-2">
              {signal.readings.map((reading) => (
                <div key={reading.label.EN} className="rounded-lg bg-white/[0.04] px-3 py-2">
                  <dt className="text-2xs text-neutral-400">{reading.label[lang]}</dt>
                  <dd className="text-sm font-semibold tabular-nums text-neutral-100">{reading.value}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-2xs text-neutral-400">
              <span>
                {t('price')}: <span className="tabular-nums text-neutral-200">{formatPrice(signal.price)}</span>
              </span>
              <span>
                {t('signalCandle')}: <span className="tabular-nums text-neutral-200">{formatSignalTime(signal.signalTime, lang)}</span>
              </span>
            </div>
          </div>

          <div>
            <h4 className="mb-2 text-2xs font-semibold uppercase tracking-wider text-neutral-500">{t('evidence')}</h4>
            {signal.evidence.length === 0 ? (
              <p className="text-xs text-neutral-400">{t('noEvidence')}</p>
            ) : (
              <ul className="space-y-1.5 text-xs leading-relaxed text-neutral-200">
                {signal.evidence.map((item) => (
                  <li key={item.EN} className="flex gap-2">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent" />
                    <span>{item[lang]}</span>
                  </li>
                ))}
              </ul>
            )}
            <h4 className="mb-2 mt-4 text-2xs font-semibold uppercase tracking-wider text-neutral-500">{t('invalidation')}</h4>
            <p className="text-xs leading-relaxed text-neutral-200">
              {signal.invalidation.price !== null && (
                <span className="mr-1 tabular-nums text-neutral-100">{formatPrice(signal.invalidation.price)}</span>
              )}
              {signal.invalidation.text[lang]}
            </p>
          </div>

          <div className="sm:col-span-2">
            <a
              href={signal.chartUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-2 text-xs font-medium text-neutral-100 transition-colors hover:border-accent hover:text-accent"
            >
              {t('openChart')}
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
