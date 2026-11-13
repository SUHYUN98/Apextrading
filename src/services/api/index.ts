import type { Asset, CandleData, Timeframe, DataStatus } from '@/types';
import {
  DEFAULT_CRYPTO_ASSETS,
  normalizeBinanceSymbol,
  type BinanceMarket,
} from '@/services/api/binance';
import { fetchFuturesKlines, fetchFutures24hTicker } from '@/services/marketData/binanceFuturesRest';
import {
  fetchYahooCandles,
  fetchYahooQuote,
  DEFAULT_STOCK_ASSETS,
} from '@/services/api/yahoo';

export interface AssetDefinition {
  id: string;
  symbol: string;
  name: string;
  displaySymbol: string;
  type: 'crypto' | 'stock';
  market?: BinanceMarket;
}

export const DEFAULT_ASSETS: AssetDefinition[] = [
  ...DEFAULT_CRYPTO_ASSETS.map((a) => ({
    ...a,
    displaySymbol: a.displaySymbol,
    type: 'crypto' as const,
    market: 'futures' as const,
  })),
  ...DEFAULT_STOCK_ASSETS.map((a) => ({
    ...a,
    displaySymbol: a.symbol,
    type: 'stock' as const,
  })),
];

export interface FetchResult {
  candles: CandleData[];
  asset: Asset;
  cached: boolean;
  status: DataStatus;
}

function buildAsset(
  def: AssetDefinition,
  price: number,
  changePercent: number,
  volume: number,
  marketCap: number
): Asset {
  return {
    id: def.id,
    symbol: def.displaySymbol,
    name: def.name,
    type: def.type,
    exchange: def.type === 'crypto' ? (def.market === 'futures' ? 'Binance Futures' : 'Binance') : 'NASDAQ',
    currentPrice: price,
    dayChangePercent: changePercent,
    marketCap,
    volume24h: volume,
  };
}

export async function fetchCryptoAsset(
  def: AssetDefinition,
  timeframe: Timeframe
): Promise<FetchResult> {
  const [candles, ticker24h] = await Promise.all([
    fetchFuturesKlines(def.symbol, timeframe),
    fetchFutures24hTicker(def.symbol).catch(() => null),
  ]);
  if (candles.length === 0) throw new Error(`No candles returned for ${def.symbol}`);

  const lastClose = candles.length > 0 ? candles[candles.length - 1].close : 0;
  const price = ticker24h?.lastPrice ?? lastClose;
  const changePercent = ticker24h?.priceChangePercent ?? 0;
  const volume = ticker24h?.quoteVolume ?? 0;

  return {
    candles,
    asset: buildAsset(def, price, changePercent, volume, 0),
    cached: false,
    status: 'live',
  };
}

export async function fetchStockAsset(
  def: AssetDefinition,
  timeframe: Timeframe
): Promise<FetchResult> {
  const { candles, cached } = await fetchYahooCandles(def.symbol, timeframe);
  const quote = await fetchYahooQuote(def.symbol).catch(() => null);

  const lastClose = candles.length > 0 ? candles[candles.length - 1].close : 0;
  const price = quote?.regularMarketPrice ?? lastClose;
  const changePercent = quote?.regularMarketChangePercent ?? 0;
  const volume = quote?.regularMarketVolume ?? 0;

  return {
    candles,
    asset: buildAsset(def, price, changePercent, volume, quote?.marketCap ?? 0),
    cached,
    status: cached ? 'cached' : 'live',
  };
}

export async function fetchAssetData(
  def: AssetDefinition,
  timeframe: Timeframe
): Promise<FetchResult> {
  if (def.type === 'crypto') {
    return fetchCryptoAsset(def, timeframe);
  }
  return fetchStockAsset(def, timeframe);
}

// Create asset definition for a custom searched ticker
export function createCryptoAssetDefinition(query: string, market: BinanceMarket): AssetDefinition {
  const clean = normalizeBinanceSymbol(query);
  const displaySymbol = clean.length > 3 && clean.endsWith('USDT')
    ? `${clean.slice(0, -4)}/USDT`
    : clean;
  return {
    id: `crypto-${clean.toLowerCase()}`,
    symbol: clean,
    name: clean,
    displaySymbol,
    type: 'crypto',
    market,
  };
}

export function createStockAssetDefinition(ticker: string): AssetDefinition {
  const clean = ticker.replace(/[^a-zA-Z]/g, '').toUpperCase();
  return {
    id: `stock-${clean.toLowerCase()}`,
    symbol: clean,
    name: clean,
    displaySymbol: clean,
    type: 'stock',
  };
}

// Detect if a search query is likely a crypto pair or stock ticker
export function detectAssetType(query: string): 'crypto' | 'stock' {
  const upper = query.toUpperCase().trim();
  // If it contains USDT, BTC, ETH, BUSD, or ends with common crypto quote currencies
  if (upper.includes('USDT') || upper.includes('BTC') && !upper.startsWith('B')) {
    return 'crypto';
  }
  // Common crypto suffixes
  if (/(USDT|USDC|BUSD|TUSD|FDUSD|BTC|ETH|BNB|SOL)$/.test(upper)) {
    return 'crypto';
  }
  // If contains slash (e.g. BTC/USDT)
  if (query.includes('/') || query.includes('-') || query.includes('_')) {
    return 'crypto';
  }
  // Default to stock for short uppercase tickers
  return 'stock';
}
