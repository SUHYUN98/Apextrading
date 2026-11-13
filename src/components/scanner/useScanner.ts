import { useCallback, useEffect, useRef, useState } from 'react';
import { runScan } from '@/services/scanner/runScan';
import type { ScanOutcome, ScannerSettings } from '@/types/scanner';

const AUTO_REFRESH_MS = 60_000;

export interface ScannerState {
  status: 'scanning' | 'ready' | 'error';
  outcome: ScanOutcome | null;
  error: string | null;
}

export function useScanner(settings: ScannerSettings) {
  const [state, setState] = useState<ScannerState>({ status: 'scanning', outcome: null, error: null });
  const latestRun = useRef(0);

  const scan = useCallback(async () => {
    const runId = ++latestRun.current;
    setState((prev) => ({ ...prev, status: 'scanning', error: null }));
    try {
      const outcome = await runScan(settings, Date.now());
      if (runId === latestRun.current) setState({ status: 'ready', outcome, error: null });
    } catch (err) {
      if (runId !== latestRun.current) return;
      const message = err instanceof Error ? err.message : 'Unknown error';
      setState((prev) => ({ status: 'error', outcome: prev.outcome, error: message }));
    }
  }, [settings]);

  useEffect(() => {
    void scan();
    const timer = setInterval(() => void scan(), AUTO_REFRESH_MS);
    return () => clearInterval(timer);
  }, [scan]);

  return { state, scan };
}
