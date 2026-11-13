import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./diagnostics', () => ({
  logMarketDataError: vi.fn(),
  logMarketDataWarn: vi.fn(),
}));

import { MarketDataHttpError, fetchFutures24hTicker, fetchFuturesKlines } from './binanceFuturesRest';

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const row = (time: number, o: number, h: number, l: number, c: number, v: number) => [
  time,
  String(o),
  String(h),
  String(l),
  String(c),
  String(v),
];

describe('fetchFuturesKlines', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('requests live data without caching and returns valid candles', async () => {
    fetchMock.mockResolvedValue(jsonResponse([row(60_000, 1, 2, 0.5, 1.5, 10), row(120_000, 1.5, 2, 1, 1.8, 3)]));
    const candles = await fetchFuturesKlines('BTCUSDT', '1H');
    expect(candles.map((c) => c.time)).toEqual([60, 120]);
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ cache: 'no-store' });
  });

  it('rejects HTTP 451 instead of treating it as data', async () => {
    fetchMock.mockResolvedValue(new Response('restricted', { status: 451 }));
    await expect(fetchFuturesKlines('BTCUSDT', '1H')).rejects.toBeInstanceOf(MarketDataHttpError);
  });

  it('rejects invalid OHLCV rows', async () => {
    fetchMock.mockResolvedValue(jsonResponse([row(60_000, 1, 0.5, 0.2, 1, 10)]));
    await expect(fetchFuturesKlines('BTCUSDT', '1H')).rejects.toThrow(/Invalid OHLCV/);
    fetchMock.mockResolvedValue(jsonResponse([row(60_000, 1, 2, 0.5, 1, -1)]));
    await expect(fetchFuturesKlines('BTCUSDT', '1H')).rejects.toThrow(/Invalid OHLCV/);
  });

  it('rejects duplicated or reversed candle order', async () => {
    fetchMock.mockResolvedValue(jsonResponse([row(120_000, 1, 2, 0.5, 1, 1), row(60_000, 1, 2, 0.5, 1, 1)]));
    await expect(fetchFuturesKlines('BTCUSDT', '1H')).rejects.toThrow(/out of order/);
    fetchMock.mockResolvedValue(jsonResponse([row(60_000, 1, 2, 0.5, 1, 1), row(60_000, 1, 2, 0.5, 1, 1)]));
    await expect(fetchFuturesKlines('BTCUSDT', '1H')).rejects.toThrow(/out of order/);
  });

  it('aborts a request that exceeds the timeout', async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => reject(new Error('aborted')));
        })
    );
    const pending = fetchFuturesKlines('BTCUSDT', '1H');
    const assertion = expect(pending).rejects.toThrow(/timed out/);
    await vi.advanceTimersByTimeAsync(15_000);
    await assertion;
  });
});

describe('fetchFutures24hTicker', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('rejects a ticker for another symbol or with non-numeric values', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({ symbol: 'ETHUSDT', lastPrice: '1', priceChangePercent: '0', quoteVolume: '1' })
      )
    );
    await expect(fetchFutures24hTicker('BTCUSDT')).rejects.toThrow(/Invalid 24h ticker/);

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({ symbol: 'BTCUSDT', lastPrice: 'abc', priceChangePercent: '0', quoteVolume: '1' })
      )
    );
    await expect(fetchFutures24hTicker('BTCUSDT')).rejects.toThrow(/Invalid 24h ticker/);
  });
});
