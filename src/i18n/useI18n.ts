import { useStore } from '@/store/useStore';
import { DICTIONARY } from '@/i18n/dictionary';

export function useI18n() {
  const lang = useStore((s) => s.language);
  const setLanguage = useStore((s) => s.setLanguage);
  return { lang, t: DICTIONARY[lang], setLanguage };
}
