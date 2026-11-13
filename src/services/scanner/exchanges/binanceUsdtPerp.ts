import type { CandleData } from '@/types';
import { MARKET_REST } from '@/services/api/binance';
import type { ExchangeAdapter, PerpMarket, ScannerTimeframe } from '@/services/scanner/types';
import { asArray, asRecord, fetchJson, parseJsonRecord, spreadPercent } from '@/services/scanner/utils';
import { openReconnectingSocket } from '@/services/scanner/socket';

const REST = MARKET_REST.futures;
const WS_BASE = 'wss://fstream.binance.com/ws';
const INTERVAL: Record<ScannerTimeframe, string> = { '15m': '15m', '1H': '1h', '4H': '4h' };
const MAX_KLINES = 1500;

function toCandle(row: unknown): CandleData {
  const values = Array.isArray(row) ? row : [];
  return {
    time: Math.floor(Number(values[0]) / 1000),
    open: Number(values[1]),
    high: Number(values[2]),
    low: Number(values[3]),
    close: Number(values[4]),
    volume: Number(values[5]),
  };
}

export const binanceUsdtPerp: ExchangeAdapter = {
  id: 'binance',

  async listMarkets(): Promise<PerpMarket[]> {
    const [info, tickers, books] = await Promise.all([
      fetchJson(`${REST}/exchangeInfo`),
      fetchJson(`${REST}/ticker/24hr`),
      fetchJson(`${REST}/ticker/bookTicker`),
    ]);
    const symbols = asArray(asRecord(info).symbols, 'Binance exchangeInfo');
    const tickerBySymbol = new Map(asArray(tickers, 'Binance 24h ticker').map((r) => [String(asRecord(r).symbol), asRecord(r)]));
    const bookBySymbol = new Map(asArray(books, 'Binance book ticker').map((r) => [String(asRecord(r).symbol), asRecord(r)]));

    const markets: PerpMarket[] = [];
    for (const raw of symbols) {
      const s = asRecord(raw);
      if (s.quoteAsset !== 'USDT' || s.contractType !== 'PERPETUAL' || s.status !== 'TRADING') continue;
      const symbol = String(s.symbol);
      const ticker = tickerBySymbol.get(symbol);
      const book = bookBySymbol.get(symbol);
      markets.push({
        exchange: 'binance',
        symbol,
        baseAsset: String(s.baseAsset),
        listedAt: Number(s.onboardDate),
        quoteVolume24h: Number(ticker?.quoteVolume) || 0,
        lastPrice: Number(ticker?.lastPrice) || 0,
        spreadPct: book ? spreadPercent(Number(book.bidPrice), Number(book.askPrice)) : null,
      });
    }
    return markets;
  },

  async fetchCandles(symbol, timeframe, limit): Promise<CandleData[]> {
    const url = `${REST}/klines?symbol=${encodeURIComponent(symbol)}&interval=${INTERVAL[timeframe]}&limit=${Math.min(limit, MAX_KLINES)}`;
    return asArray(await fetchJson(url), 'Binance klines').map(toCandle);
  },

  subscribeClosedCandles(symbol, timeframe, handlers) {
    return openReconnectingSocket({
      url: `${WS_BASE}/${symbol.toLowerCase()}@kline_${INTERVAL[timeframe]}`,
      onMessage: (data) => {
        const message = parseJsonRecord(data);
        const kline = asRecord(message.k);
        if (message.e !== 'kline' || kline.x !== true) return;
        handlers.onCandle({
          time: Math.floor(Number(kline.t) / 1000),
          open: Number(kline.o),
          high: Number(kline.h),
          low: Number(kline.l),
          close: Number(kline.c),
          volume: Number(kline.v),
        });
      },
      onError: handlers.onError,
    });
  },
};
