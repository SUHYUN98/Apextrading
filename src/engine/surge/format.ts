import { DICTIONARY } from '@/i18n/dictionary';
import type { Lang } from '@/i18n/types';
import type { Currency } from '@/types/surge';

export function formatPrice(price: number, currency: Currency, lang: Lang): string {
  const { locale, format } = DICTIONARY[lang];
  if (currency === 'USD') {
    const text = price.toLocaleString(locale, {
      minimumFractionDigits: price < 1 ? 0 : 2,
      maximumFractionDigits: price < 1 ? 6 : 2,
    });
    return `$${text}`;
  }
  return format.krwPrice(price.toLocaleString(locale));
}

export function formatTradingValue(eok: number, lang: Lang): string {
  return DICTIONARY[lang].format.tradingValue(eok);
}

export function formatUsdMillions(usd: number, lang: Lang): string {
  const millions = usd / 1_000_000;
  return `${millions.toLocaleString(DICTIONARY[lang].locale, { maximumFractionDigits: 0 })}M`;
}

export function formatSignedPct(value: number, digits = 2): string {
  return `${value > 0 ? '+' : ''}${value.toFixed(digits)}%`;
}

export function formatRvol(value: number): string {
  return `${value.toFixed(1)}x`;
}
