import { create } from 'zustand';
import type {
  Asset,
  AssetType,
  CandleData,
  ScreenerCondition,
  TrendlineRule,
  Timeframe,
  IndicatorSettings,
  InterpretationEntry,
  AssetAnalysis,
  BacktestDirection,
  BacktestResult,
  DataStatus,
} from '@/types';
import {
  DEFAULT_ASSETS,
  fetchAssetData,
  createCryptoAssetDefinition,
  createStockAssetDefinition,
  detectAssetType,
} from '@/services/api';
import type { AssetDefinition } from '@/services/api';
import { analyzeAsset } from '@/engine/screener/screener';
import { runBacktest } from '@/engine/screener/backtest';
import { normalizeBinanceSymbol } from '@/services/api/binance';
import { checkFuturesSymbol } from '@/services/marketData/binanceFuturesRest';
import { futuresSocket, type FuturesKlineUpdate, type FuturesSocketState } from '@/services/marketData/binanceFuturesSocket';
import type { Lang } from '@/i18n/types';

export type AppView = 'chart' | 'surge' | 'scanner';

interface AssetState {
  def: AssetDefinition;
  asset: Asset | null;
  candles: CandleData[];
  status: DataStatus;
  cached: boolean;
}

interface AppState {
  // Theme
  darkMode: boolean;
  toggleDarkMode: () => void;

  // Asset filter
  assetFilter: 'all' | AssetType;
  setAssetFilter: (filter: 'all' | AssetType) => void;

  // Selected asset
  selectedAssetId: string;
  selectAsset: (id: string) => void;

  // Timeframe
  timeframe: Timeframe;
  setTimeframe: (tf: Timeframe) => void;

  // Asset states
  assetStates: Map<string, AssetState>;
  assetOrder: string[];

  // Trendline rule
  trendlineRule: TrendlineRule;
  setTrendlineRule: (rule: Partial<TrendlineRule>) => void;

  // Indicator settings
  indicatorSettings: IndicatorSettings;
  setIndicatorSettings: (settings: Partial<IndicatorSettings>) => void;
  toggleIndicator: (type: 'ema' | 'rsi' | 'volume') => void;

  // Screener conditions
  conditions: ScreenerCondition[];
  addCondition: (condition: ScreenerCondition) => void;
  removeCondition: (id: string) => void;
  updateCondition: (id: string, updates: Partial<ScreenerCondition>) => void;
  clearConditions: () => void;

  // Analysis results
  analyses: AssetAnalysis[];
  recomputeAnalyses: () => void;

  // Screening pipeline
  volumeSpikeThreshold: number;
  setVolumeSpikeThreshold: (value: number) => void;
  backtests: Map<string, BacktestResult>;
  backtestDirection: BacktestDirection;
  setBacktestDirection: (direction: BacktestDirection) => void;
  pipelineUpdatedAt: number | null;

  // Top-level view
  appView: AppView;
  setAppView: (view: AppView) => void;

  // Interface language
  language: Lang;
  setLanguage: (language: Lang) => void;

  // Interpretation log
  interpretationLog: InterpretationEntry[];
  addInterpretationEntry: (entry: InterpretationEntry) => void;
  clearInterpretationLog: () => void;

  // Sidebar collapsed
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;

  // Right panel collapsed
  rightPanelCollapsed: boolean;
  toggleRightPanel: () => void;

  // Actions
  initialize: () => void;
  loadAsset: (def: AssetDefinition, options?: { keepSocket?: boolean }) => Promise<void>;
  refreshAllAssets: () => Promise<void>;
  addCustomAsset: (query: string) => Promise<string | null>;
  updateLiveCandle: (assetId: string, update: FuturesKlineUpdate) => void;

  // Live market socket
  socketState: FuturesSocketState;

  // Search
  searchQuery: string;
  setSearchQuery: (q: string) => void;

  // WebSocket setup
  setupWebSocketForAsset: (assetId: string) => void;
}

let conditionIdCounter = 0;
export function generateConditionId(): string {
  conditionIdCounter++;
  return `cond-${Date.now()}-${conditionIdCounter}`;
}

export const useStore = create<AppState>((set, get) => ({
  darkMode: true,
  toggleDarkMode: () => set((s) => ({ darkMode: !s.darkMode })),

  assetFilter: 'all',
  setAssetFilter: (filter) => set({ assetFilter: filter }),

  selectedAssetId: 'btc-usdt',
  selectAsset: (id) => {
    set({ selectedAssetId: id });
    get().setupWebSocketForAsset(id);
  },

  timeframe: '4H',
  setTimeframe: (tf) => {
    set({ timeframe: tf });
    get().refreshAllAssets();
  },

  assetStates: new Map(),
  assetOrder: DEFAULT_ASSETS.map((a) => a.id),

  trendlineRule: {
    lookbackPeriod: 14,
    sensitivity: 5,
    minTouches: 2,
    timeframe: '4H',
    drawExtended: true,
  },
  setTrendlineRule: (rule) => {
    set((s) => ({ trendlineRule: { ...s.trendlineRule, ...rule } }));
    get().recomputeAnalyses();
  },

  indicatorSettings: {
    ema: { enabled: true, periods: [20, 50, 200] },
    rsi: { enabled: false, period: 14 },
    volume: { enabled: true },
  },
  setIndicatorSettings: (settings) =>
    set((s) => ({ indicatorSettings: { ...s.indicatorSettings, ...settings } })),
  toggleIndicator: (type) =>
    set((s) => {
      const settings = { ...s.indicatorSettings };
      if (type === 'ema') settings.ema = { ...settings.ema, enabled: !settings.ema.enabled };
      if (type === 'rsi') settings.rsi = { ...settings.rsi, enabled: !settings.rsi.enabled };
      if (type === 'volume') settings.volume = { ...settings.volume, enabled: !settings.volume.enabled };
      return { indicatorSettings: settings };
    }),

  conditions: [
    {
      id: 'cond-default-1',
      field: 'volumeRatio',
      operator: '>',
      value: 1.5,
      label: 'Volume Ratio (vs 20-avg) Above 1.5x',
    },
  ],
  addCondition: (condition) => {
    set((s) => ({ conditions: [...s.conditions, condition] }));
    get().recomputeAnalyses();
  },
  removeCondition: (id) => {
    set((s) => ({ conditions: s.conditions.filter((c) => c.id !== id) }));
    get().recomputeAnalyses();
  },
  updateCondition: (id, updates) => {
    set((s) => ({
      conditions: s.conditions.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    }));
    get().recomputeAnalyses();
  },
  clearConditions: () => {
    set({ conditions: [] });
    get().recomputeAnalyses();
  },

  analyses: [],
  recomputeAnalyses: () => {
    const { assetStates, assetOrder, trendlineRule, conditions, volumeSpikeThreshold, backtestDirection } = get();
    const analyses: AssetAnalysis[] = [];
    const backtests = new Map<string, BacktestResult>();
    for (const id of assetOrder) {
      const state = assetStates.get(id);
      if (!state || !state.asset || state.candles.length === 0) continue;
      try {
        const analysis = analyzeAsset(state.asset, state.candles, trendlineRule, conditions);
        analyses.push(analysis);
        backtests.set(id, runBacktest(state.candles, conditions, volumeSpikeThreshold, backtestDirection));
      } catch {
        // skip analysis errors
      }
    }
    set({ analyses, backtests, pipelineUpdatedAt: Date.now() });
  },

  appView: 'chart',
  setAppView: (view) => set({ appView: view }),

  language: 'KR',
  setLanguage: (language) => set({ language }),

  volumeSpikeThreshold: 2,
  setVolumeSpikeThreshold: (value) => {
    set({ volumeSpikeThreshold: value });
    get().recomputeAnalyses();
  },
  backtests: new Map(),
  backtestDirection: 'long',
  setBacktestDirection: (direction) => {
    set({ backtestDirection: direction });
    get().recomputeAnalyses();
  },
  pipelineUpdatedAt: null,

  interpretationLog: [],
  addInterpretationEntry: (entry) =>
    set((s) => ({ interpretationLog: [entry, ...s.interpretationLog].slice(0, 50) })),
  clearInterpretationLog: () => set({ interpretationLog: [] }),

  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  rightPanelCollapsed: false,
  toggleRightPanel: () => set((s) => ({ rightPanelCollapsed: !s.rightPanelCollapsed })),

  socketState: { status: 'idle', lastMessageAt: null, lastCloseCode: null, lastCloseReason: null, attempts: 0 },

  searchQuery: '',
  setSearchQuery: (q) => set({ searchQuery: q }),

  initialize: () => {
    // Set all assets to loading
    const states = new Map<string, AssetState>();
    for (const def of DEFAULT_ASSETS) {
      states.set(def.id, {
        def,
        asset: null,
        candles: [],
        status: 'loading',
        cached: false,
      });
    }
    set({ assetStates: states });
    get().refreshAllAssets();
  },

  loadAsset: async (def, options) => {
    const tf = get().timeframe;

    // Set loading state
    set((s) => {
      const states = new Map(s.assetStates);
      states.set(def.id, {
        def,
        asset: states.get(def.id)?.asset ?? null,
        candles: states.get(def.id)?.candles ?? [],
        status: 'loading',
        cached: false,
      });
      return { assetStates: states };
    });

    try {
      const result = await fetchAssetData(def, tf);

      set((s) => {
        const states = new Map(s.assetStates);
        states.set(def.id, {
          def,
          asset: result.asset,
          candles: result.candles,
          status: result.status,
          cached: result.cached,
        });
        return { assetStates: states };
      });

      get().recomputeAnalyses();

      if (!options?.keepSocket && get().selectedAssetId === def.id) {
        get().setupWebSocketForAsset(def.id);
      }
    } catch {
      set((s) => {
        const states = new Map(s.assetStates);
        states.set(def.id, {
          def,
          asset: states.get(def.id)?.asset ?? null,
          candles: states.get(def.id)?.candles ?? [],
          status: 'error',
          cached: false,
        });
        return { assetStates: states };
      });
    }
  },

  refreshAllAssets: async () => {
    const { assetOrder, assetStates } = get();
    const defs = assetOrder.map((id) => assetStates.get(id)?.def).filter(Boolean) as AssetDefinition[];
    await Promise.all(defs.map((def) => get().loadAsset(def)));
  },

  addCustomAsset: async (query) => {
    const trimmed = query.trim();
    if (!trimmed) return null;

    const type = detectAssetType(trimmed);
    let def: AssetDefinition;
    if (type === 'crypto') {
      const exists = await checkFuturesSymbol(normalizeBinanceSymbol(trimmed)).catch(() => false);
      if (!exists) return null;
      def = createCryptoAssetDefinition(trimmed, 'futures');
    } else {
      def = createStockAssetDefinition(trimmed);
    }

    // Check if already exists
    if (get().assetStates.has(def.id)) {
      get().selectAsset(def.id);
      return def.id;
    }

    const previousSelection = get().selectedAssetId;
    // Add to state with loading status
    set((s) => {
      const states = new Map(s.assetStates);
      states.set(def.id, {
        def,
        asset: null,
        candles: [],
        status: 'loading',
        cached: false,
      });
      return {
        assetStates: states,
        assetOrder: [...s.assetOrder, def.id],
        selectedAssetId: def.id,
      };
    });

    await get().loadAsset(def);
    if (get().assetStates.get(def.id)?.status === 'error') {
      set((s) => {
        const states = new Map(s.assetStates);
        states.delete(def.id);
        return {
          assetStates: states,
          assetOrder: s.assetOrder.filter((id) => id !== def.id),
          selectedAssetId: previousSelection,
        };
      });
      return null;
    }
    return def.id;
  },

  updateLiveCandle: (assetId, msg) => {
    set((s) => {
      const state = s.assetStates.get(assetId);
      if (!state || state.candles.length === 0) return s;

      const states = new Map(s.assetStates);
      const candles = [...state.candles];
      const lastCandle = candles[candles.length - 1];

      if (lastCandle && lastCandle.time === msg.time) {
        // Update existing candle
        candles[candles.length - 1] = {
          time: msg.time,
          open: msg.open,
          high: msg.high,
          low: msg.low,
          close: msg.close,
          volume: msg.volume,
        };
      } else if (lastCandle && msg.time > lastCandle.time) {
        // New candle
        candles.push({
          time: msg.time,
          open: msg.open,
          high: msg.high,
          low: msg.low,
          close: msg.close,
          volume: msg.volume,
        });
        // Keep max 300 candles
        if (candles.length > 300) candles.shift();
      }

      // Update asset price
      const asset = state.asset
        ? { ...state.asset, currentPrice: msg.close }
        : null;

      states.set(assetId, {
        ...state,
        candles,
        asset,
        status: 'live',
      });

      return { assetStates: states };
    });

    get().recomputeAnalyses();
  },

  setupWebSocketForAsset: (assetId: string) => {
    const state = get().assetStates.get(assetId);
    if (!state || state.def.type !== 'crypto') {
      futuresSocket.unsubscribe();
      return;
    }

    futuresSocket.subscribe(
      state.def.symbol,
      get().timeframe,
      (update) => get().updateLiveCandle(assetId, update),
      () => {
        const def = get().assetStates.get(assetId)?.def;
        if (def) void get().loadAsset(def, { keepSocket: true });
      }
    );
  },
}));

// Export a function to initialize the store on app load
export function initializeStore() {
  const store = useStore.getState();
  if (store.assetStates.size === 0) {
    futuresSocket.onState((socketState) => useStore.setState({ socketState }));
    store.initialize();
  }
}
