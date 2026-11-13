import type { ExchangeAdapter, ExchangeId } from '@/services/scanner/types';
import { binanceUsdtPerp } from '@/services/scanner/exchanges/binanceUsdtPerp';
import { bybitUsdtPerp } from '@/services/scanner/exchanges/bybitUsdtPerp';

export const EXCHANGE_ADAPTERS: Record<ExchangeId, ExchangeAdapter> = {
  binance: binanceUsdtPerp,
  bybit: bybitUsdtPerp,
};
