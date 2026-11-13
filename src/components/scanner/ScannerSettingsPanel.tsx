import { useState } from 'react';
import type { Lang, LocalizedText } from '@/i18n/types';
import type { ScannerSettings } from '@/types/scanner';
import { SCANNER_TEXT } from './scannerText';

type NumericSettingKey = Exclude<keyof ScannerSettings, 'timeframe'>;

interface SettingField {
  key: NumericSettingKey;
  label: LocalizedText;
  min: number;
  max: number;
  step: number;
}

const FIELDS: SettingField[] = [
  { key: 'minQuoteVolume24h', label: { KR: '24시간 최소 거래대금 (USDT)', EN: 'Min 24h quote volume (USDT)' }, min: 0, max: 100_000_000_000, step: 1_000_000 },
  { key: 'maxSpreadPct', label: { KR: '최대 호가 스프레드 (%)', EN: 'Max bid-ask spread (%)' }, min: 0, max: 5, step: 0.01 },
  { key: 'minCandles', label: { KR: '최소 완료 캔들 수', EN: 'Min completed candles' }, min: 250, max: 300, step: 1 },
  { key: 'minListingDays', label: { KR: '최소 상장 기간 (일)', EN: 'Min days since listing' }, min: 0, max: 3650, step: 1 },
  { key: 'universeSize', label: { KR: '거래소별 검사 종목 수 (거래대금 순)', EN: 'Markets per exchange (by volume)' }, min: 5, max: 100, step: 5 },
  { key: 'minRvol', label: { KR: '급변동 최소 RVOL', EN: 'Volatility min RVOL' }, min: 1, max: 5, step: 0.1 },
  { key: 'volatilityThreshold', label: { KR: '급변동 기준 점수', EN: 'Volatility score cutoff' }, min: 0, max: 100, step: 1 },
  { key: 'reversalThreshold', label: { KR: '추세전환 기준 점수', EN: 'Reversal score cutoff' }, min: 0, max: 100, step: 1 },
  { key: 'continuationThreshold', label: { KR: '추세지속 기준 점수', EN: 'Continuation score cutoff' }, min: 0, max: 100, step: 1 },
];

interface ScannerSettingsPanelProps {
  lang: Lang;
  value: ScannerSettings;
  onApply: (next: ScannerSettings) => void;
}

export function ScannerSettingsPanel({ lang, value, onApply }: ScannerSettingsPanelProps) {
  const [draft, setDraft] = useState<Record<NumericSettingKey, string>>(() => {
    const entries = FIELDS.map((field) => [field.key, String(value[field.key])] as const);
    return Object.fromEntries(entries) as Record<NumericSettingKey, string>;
  });

  const parsed = FIELDS.map((field) => {
    const number = Number(draft[field.key]);
    const valid = draft[field.key].trim() !== '' && Number.isFinite(number) && number >= field.min && number <= field.max;
    return { field, number, valid };
  });
  const allValid = parsed.every((entry) => entry.valid);

  const apply = () => {
    if (!allValid) return;
    const next = { ...value };
    for (const { field, number } of parsed) next[field.key] = number;
    onApply(next);
  };

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 animate-fade-in">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {parsed.map(({ field, valid }) => (
          <label key={field.key} className="flex flex-col gap-1.5">
            <span className="text-2xs text-neutral-400">{field.label[lang]}</span>
            <input
              type="number"
              inputMode="decimal"
              min={field.min}
              max={field.max}
              step={field.step}
              value={draft[field.key]}
              onChange={(e) => setDraft((prev) => ({ ...prev, [field.key]: e.target.value }))}
              className={`rounded-lg border bg-black/30 px-3 py-2 text-sm tabular-nums text-neutral-100 outline-none transition-colors focus:border-accent ${
                valid ? 'border-white/15' : 'border-bearish'
              }`}
            />
          </label>
        ))}
      </div>
      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={apply}
          disabled={!allValid}
          className="rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-neutral-950 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {SCANNER_TEXT.settingsApply[lang]}
        </button>
      </div>
    </div>
  );
}
