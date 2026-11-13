import type { Timeframe, AssetType } from '@/types';
import type { AssetDefinition } from '@/services/api';

const EXCHANGE_MAP: Record<AssetType, string> = {
  crypto: 'BINANCE',
  stock: 'NASDAQ',
};

const TIMEFRAME_TO_TV: Record<Timeframe, string> = {
  '5m': '5',
  '15m': '15',
  '1H': '60',
  '4H': '240',
  '1D': 'D',
};

export function getTradingViewSymbol(def: AssetDefinition): string {
  const exchange = EXCHANGE_MAP[def.type];
  const perpetualSuffix = def.type === 'crypto' && def.market === 'futures' ? '.P' : '';
  return `${exchange}:${def.symbol}${perpetualSuffix}`;
}

export function getTradingViewInterval(timeframe: Timeframe): string {
  return TIMEFRAME_TO_TV[timeframe] || '240';
}
