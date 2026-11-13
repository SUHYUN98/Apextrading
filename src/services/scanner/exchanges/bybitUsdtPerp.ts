import type { CandleData } from '@/types';
import type { ExchangeAdapter, PerpMarket, ScannerTimeframe } from '@/services/scanner/types';
import { asArray, asRecord, fetchJson, parseJsonRecord, spreadPercent, type Row } from '@/services/scanner/utils';
import { openReconnectingSocket } from '@/services/scanner/socket';

const REST = 'https://api.bybit.com/v5/market';
const WS_URL = 'wss://stream.bybit.com/v5/public/linear';
const INTERVAL: Record<ScannerTimeframe, string> = { '15m': '15', '1H': '60', '4H': '240' };
const MAX_KLINES = 1000;
const PING_INTERVAL_MS = 20_000;

function unwrap(payload: unknown): Row {
  const body = asRecord(payload);
  if (body.retCode !== 0) throw new Error(`Bybit API error: ${String(body.retMsg ?? 'unknown')}`);
  return asRecord(body.result);
}

async function fetchInstruments(): Promise<Row[]> {
  const instruments: Row[] = [];
  let cursor = '';
  do {
    const cursorParam = cursor ? `&cursor=${encodeURIComponent(cursor)}` : '';
    const result = unwrap(await fetchJson(`${REST}/instruments-info?category=linear&limit=1000${cursorParam}`));
    instruments.push(...asArray(result.list, 'Bybit instruments').map(asRecord));
    cursor = typeof result.nextPageCursor === 'string' ? result.nextPageCursor : '';
  } while (cursor);
  return instruments;
}

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

export const bybitUsdtPerp: ExchangeAdapter = {
  id: 'bybit',

  async listMarkets(): Promise<PerpMarket[]> {
    const [instruments, tickerPayload] = await Promise.all([
      fetchInstruments(),
      fetchJson(`${REST}/tickers?category=linear`),
    ]);
    const tickers = asArray(unwrap(tickerPayload).list, 'Bybit tickers').map(asRecord);
    const tickerBySymbol = new Map(tickers.map((t) => [String(t.symbol), t]));

    return instruments
      .filter((i) => i.quoteCoin === 'USDT' && i.contractType === 'LinearPerpetual' && i.status === 'Trading')
      .map((i) => {
        const symbol = String(i.symbol);
        const ticker = tickerBySymbol.get(symbol);
        return {
          exchange: 'bybit',
          symbol,
          baseAsset: String(i.baseCoin),
          listedAt: Number(i.launchTime),
          quoteVolume24h: Number(ticker?.turnover24h) || 0,
          lastPrice: Number(ticker?.lastPrice) || 0,
          spreadPct: ticker ? spreadPercent(Number(ticker.bid1Price), Number(ticker.ask1Price)) : null,
        };
      });
  },

  async fetchCandles(symbol, timeframe, limit): Promise<CandleData[]> {
    const url = `${REST}/kline?category=linear&symbol=${encodeURIComponent(symbol)}&interval=${INTERVAL[timeframe]}&limit=${Math.min(limit, MAX_KLINES)}`;
    const rows = asArray(unwrap(await fetchJson(url)).list, 'Bybit klines');
    return rows.map(toCandle).reverse();
  },

  subscribeClosedCandles(symbol, timeframe, handlers) {
    const topic = `kline.${INTERVAL[timeframe]}.${symbol}`;
    return openReconnectingSocket({
      url: WS_URL,
      onOpen: (socket) => socket.send(JSON.stringify({ op: 'subscribe', args: [topic] })),
      heartbeat: { intervalMs: PING_INTERVAL_MS, payload: JSON.stringify({ op: 'ping' }) },
      onMessage: (data) => {
        const message = parseJsonRecord(data);
        if (message.topic !== topic || !Array.isArray(message.data)) return;
        for (const raw of message.data) {
          const kline = asRecord(raw);
          if (kline.confirm !== true) continue;
          handlers.onCandle({
            time: Math.floor(Number(kline.start) / 1000),
            open: Number(kline.open),
            high: Number(kline.high),
            low: Number(kline.low),
            close: Number(kline.close),
            volume: Number(kline.volume),
          });
        }
      },
      onError: handlers.onError,
    });
  },
};
