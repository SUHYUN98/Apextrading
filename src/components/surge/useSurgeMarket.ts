import { useCallback, useEffect, useState } from 'react';
import { loadCryptoSurge } from '@/services/api/surgeCrypto';
import { loadStockSurge } from '@/services/api/surgeStocks';
import { SIMULATION_TICK_MS, tickSimulatedAssets } from '@/services/api/surgeSimulation';
import type { AssetClass, FeedState, SurgeAsset, SurgeTimeframe } from '@/types/surge';

const CRYPTO_POLL_MS = 12_000;
const STOCK_POLL_MS = 20_000;

type Loader = (signal: AbortSignal, previous: SurgeAsset[]) => Promise<SurgeAsset[]>;

function usePollingFeed(load: Loader, intervalMs: number): FeedState {
  const [state, setState] = useState<FeedState>({ data: [], updatedAt: null, status: 'loading' });

  useEffect(() => {
    let active = true;
    let controller = new AbortController();
    let timer: number | undefined;
    let latest: SurgeAsset[] = [];
    setState({ data: [], updatedAt: null, status: 'loading' });

    const run = async () => {
      controller = new AbortController();
      try {
        const data = await load(controller.signal, latest);
        if (!active) return;
        latest = data;
        setState({ data, updatedAt: Date.now(), status: 'live' });
      } catch {
        if (!active) return;
        setState((prev) => ({ ...prev, status: prev.data.length > 0 ? 'simulated' : 'error' }));
      }
      if (active) timer = window.setTimeout(run, intervalMs);
    };

    void run();
    return () => {
      active = false;
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [load, intervalMs]);

  useEffect(() => {
    if (state.status !== 'simulated') return;
    const id = window.setInterval(() => {
      setState((prev) => ({ ...prev, data: tickSimulatedAssets(prev.data), updatedAt: Date.now() }));
    }, SIMULATION_TICK_MS);
    return () => window.clearInterval(id);
  }, [state.status]);

  return state;
}

export function useSurgeMarket(timeframe: SurgeTimeframe): Record<AssetClass, FeedState> {
  const loadStocks = useCallback<Loader>(
    (signal, previous) => loadStockSurge(timeframe, signal, previous),
    [timeframe]
  );
  const loadCrypto = useCallback<Loader>(
    (signal, previous) => loadCryptoSurge(timeframe, signal, previous),
    [timeframe]
  );

  const stock = usePollingFeed(loadStocks, STOCK_POLL_MS);
  const crypto = usePollingFeed(loadCrypto, CRYPTO_POLL_MS);
  return { stock, crypto };
}
