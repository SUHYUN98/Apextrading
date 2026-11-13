import { fetchYahooChartSnapshot } from '@/services/api/yahoo';

// Used only when the live FX quote cannot be reached
const FALLBACK_KRW_PER_USD = 1400;

export async function fetchKrwPerUsd(signal?: AbortSignal): Promise<number> {
  try {
    const snapshot = await fetchYahooChartSnapshot('KRW=X', '5d', '1d', signal);
    return snapshot.price > 0 ? snapshot.price : FALLBACK_KRW_PER_USD;
  } catch {
    return FALLBACK_KRW_PER_USD;
  }
}
