export type AssetType = 'stock' | 'crypto';

export type DataStatus = 'loading' | 'live' | 'cached' | 'error' | 'idle';

export type Timeframe = '5m' | '15m' | '1H' | '4H' | '1D';

export type TrendDirection = 'ascending' | 'descending' | 'horizontal';

export type ConditionOperator = '>' | '<' | '>=' | '<=' | 'crosses_above' | 'crosses_below' | 'bounces_off' | 'near';

export type IndicatorType = 'EMA' | 'RSI' | 'Volume';

export interface Asset {
  id: string;
  symbol: string;
  name: string;
  type: AssetType;
  exchange: string;
  currentPrice: number;
  dayChangePercent: number;
  marketCap: number;
  volume24h: number;
}

export interface CandleData {
  time: number; // unix timestamp in seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface SwingPoint {
  index: number;
  price: number;
  time: number;
  type: 'high' | 'low';
}

export interface Trendline {
  id: string;
  start: SwingPoint;
  end: SwingPoint;
  direction: TrendDirection;
  slope: number;
  intercept: number;
  type: 'support' | 'resistance' | 'trend';
  strength: number; // 0-100 based on touches and length
  touches: SwingPoint[];
  extendedPrice: number; // current projected price at latest candle
}

export interface SupportResistanceLevel {
  price: number;
  type: 'support' | 'resistance';
  strength: number;
  touches: number;
}

export interface ZigZagSegment {
  start: SwingPoint;
  end: SwingPoint;
}

export interface TrendlineRule {
  lookbackPeriod: number;
  sensitivity: number; // 1-10, higher = more sensitive
  minTouches: number;
  timeframe: Timeframe;
  drawExtended: boolean;
}

export interface ScreenerCondition {
  id: string;
  field: ConditionField;
  operator: ConditionOperator;
  value: number;
  label: string;
}

export type ConditionField =
  | 'price'
  | 'volume'
  | 'rsi'
  | 'ema20'
  | 'ema50'
  | 'ema200'
  | 'dayChangePercent'
  | 'nearSupport'
  | 'nearResistance'
  | 'volumeRatio';

export interface IndicatorSettings {
  ema: { enabled: boolean; periods: number[] };
  rsi: { enabled: boolean; period: number };
  volume: { enabled: boolean };
}

export interface InterpretationEntry {
  id: string;
  assetId: string;
  symbol: string;
  timestamp: number;
  title: string;
  details: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  matchedConditions: string[];
}

export interface AssetAnalysis {
  asset: Asset;
  swingPoints: SwingPoint[];
  trendlines: Trendline[];
  supportResistance: SupportResistanceLevel[];
  zigzag: ZigZagSegment[];
  ema: { period: number; values: number[] }[];
  rsi: number[];
  volumeAvg20: number;
  currentVolume: number;
  volumeRatio: number;
  matchedConditions: ScreenerCondition[];
  interpretation: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
}

export type PipelineStage = 1 | 2 | 3;

export interface BacktestResult {
  holdBars: number;
  signals: number;
  wins: number;
  returnSum: number;
  bestReturn: number;
  worstReturn: number;
  skippedConditions: string[];
}
