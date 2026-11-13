import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Asset, CandleData } from '@/types';
import { fetchAssetData, type AssetDefinition } from '@/services/api';
import type { FuturesKlineUpdate } from '@/services/marketData/binanceFuturesSocket';
import { useStore } from './useStore';

vi.mock('@/services/api', () => ({
  DEFAULT_ASSETS: [],
  fetchAssetData: vi.fn(),
  createCryptoAssetDefinition: vi.fn(),
  createStockAssetDefinition: vi.fn(),
  detectAssetType: vi.fn(),
}));

vi.mock('@/services/marketData/binanceFuturesSocket', () => ({
  futuresSocket: {
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
    onState: vi.fn(),
  },
}));

const fetchMock = vi.mocked(fetchAssetData);

const def = { id: 'btc-usdt', symbol: 'BTCUSDT', name: 'BTC', type: 'crypto' } as unknown as AssetDefinition;
const asset = { id: 'btc-usdt', symbol: 'BTCUSDT', currentPrice: 100 } as unknown as Asset;

const bar = (time: number, close: number): CandleData => ({
  time,
  open: close,
  high: close + 1,
  low: close - 1,
  close,
  volume: 1,
});

const live = (time: number, close: number, isClosed = false): FuturesKlineUpdate => ({
  symbol: 'BTCUSDT',
  time,
  open: close,
  high: close + 1,
  low: close - 1,
  close,
  volume: 1,
  isClosed,
  receivedAt: 0,
});

type FetchResult = Awaited<ReturnType<typeof fetchAssetData>>;

const result = (candles: CandleData[]) =>
  ({ asset, candles, status: 'live', cached: false }) as unknown as FetchResult;

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const stateOf = () => useStore.getState().assetStates.get(def.id);

beforeEach(() => {
  fetchMock.mockReset();
  useStore.setState({
    timeframe: '1H',
    assetStates: new Map(),
    selectedAssetId: 'none',
    analyses: [],
    backtests: new Map(),
  });
});

describe('loadAsset request ordering', () => {
  it('ignores a late response from a previous timeframe', async () => {
    const old = deferred<FetchResult>();
    const fresh = deferred<FetchResult>();
    fetchMock.mockReturnValueOnce(old.promise).mockReturnValueOnce(fresh.promise);

    const firstLoad = useStore.getState().loadAsset(def);
    useStore.setState({ timeframe: '4H' });
    const secondLoad = useStore.getState().loadAsset(def);

    fresh.resolve(result([bar(14_400, 50)]));
    await secondLoad;
    old.resolve(result([bar(3600, 10)]));
    await firstLoad;

    expect(stateOf()?.timeframe).toBe('4H');
    expect(stateOf()?.candles.map((c) => c.time)).toEqual([14_400]);
  });

  it('applies only the newest request for the same asset and timeframe', async () => {
    const first = deferred<FetchResult>();
    const second = deferred<FetchResult>();
    fetchMock.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);

    const firstLoad = useStore.getState().loadAsset(def);
    const secondLoad = useStore.getState().loadAsset(def);

    second.resolve(result([bar(3600, 20)]));
    await secondLoad;
    first.resolve(result([bar(3600, 99)]));
    await firstLoad;

    expect(stateOf()?.candles[0].close).toBe(20);
  });

  it('does not let a stale error replace a newer successful load', async () => {
    const first = deferred<FetchResult>();
    const second = deferred<FetchResult>();
    fetchMock.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);

    const firstLoad = useStore.getState().loadAsset(def);
    const secondLoad = useStore.getState().loadAsset(def);

    second.resolve(result([bar(3600, 20)]));
    await secondLoad;
    first.reject(new Error('network down'));
    await firstLoad;

    expect(stateOf()?.status).toBe('live');
    expect(stateOf()?.candles[0].close).toBe(20);
  });
});

describe('REST and WebSocket merge', () => {
  it('keeps live bars received during the request and never moves the price backwards', async () => {
    const pending = deferred<FetchResult>();
    fetchMock.mockReturnValueOnce(pending.promise);
    const load = useStore.getState().loadAsset(def);

    useStore.getState().updateLiveCandle(def.id, live(7200, 120), '1H');
    useStore.getState().updateLiveCandle(def.id, live(3600, 5), '1H');

    pending.resolve(result([bar(0, 10), bar(3600, 11)]));
    await load;

    expect(stateOf()?.candles.map((c) => [c.time, c.close])).toEqual([
      [0, 10],
      [3600, 5],
      [7200, 120],
    ]);
    expect(stateOf()?.asset?.currentPrice).toBe(120);

    useStore.getState().updateLiveCandle(def.id, live(3600, 1), '1H');
    expect(stateOf()?.asset?.currentPrice).toBe(120);
    expect(stateOf()?.candles[2].close).toBe(120);
  });

  it('ignores WebSocket updates that belong to another timeframe', async () => {
    fetchMock.mockResolvedValueOnce(result([bar(0, 10)]));
    await useStore.getState().loadAsset(def);

    useStore.getState().updateLiveCandle(def.id, live(7200, 999), '4H');
    expect(stateOf()?.candles).toHaveLength(1);
  });
});
