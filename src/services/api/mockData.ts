import type { Asset, CandleData, Timeframe } from '@/types';

export const MOCK_ASSETS: Asset[] = [
  {
    id: 'btc-usdt',
    symbol: 'BTC/USDT',
    name: 'Bitcoin',
    type: 'crypto',
    exchange: 'Binance',
    currentPrice: 97250,
    dayChangePercent: 2.34,
    marketCap: 1_920_000_000_000,
    volume24h: 48_500_000_000,
  },
  {
    id: 'eth-usdt',
    symbol: 'ETH/USDT',
    name: 'Ethereum',
    type: 'crypto',
    exchange: 'Binance',
    currentPrice: 3450,
    dayChangePercent: 1.87,
    marketCap: 415_000_000_000,
    volume24h: 22_300_000_000,
  },
  {
    id: 'sol-usdt',
    symbol: 'SOL/USDT',
    name: 'Solana',
    type: 'crypto',
    exchange: 'Binance',
    currentPrice: 218.5,
    dayChangePercent: -1.23,
    marketCap: 104_000_000_000,
    volume24h: 5_800_000_000,
  },
  {
    id: 'aapl',
    symbol: 'AAPL',
    name: 'Apple Inc.',
    type: 'stock',
    exchange: 'NASDAQ',
    currentPrice: 232.45,
    dayChangePercent: 0.89,
    marketCap: 3_520_000_000_000,
    volume24h: 48_000_000,
  },
  {
    id: 'tsla',
    symbol: 'TSLA',
    name: 'Tesla Inc.',
    type: 'stock',
    exchange: 'NASDAQ',
    currentPrice: 348.12,
    dayChangePercent: -2.45,
    marketCap: 1_110_000_000_000,
    volume24h: 85_000_000,
  },
  {
    id: 'nvda',
    symbol: 'NVDA',
    name: 'NVIDIA Corp.',
    type: 'stock',
    exchange: 'NASDAQ',
    currentPrice: 138.72,
    dayChangePercent: 3.56,
    marketCap: 3_410_000_000_000,
    volume24h: 320_000_000,
  },
];

const TIMEFRAME_SECONDS: Record<Timeframe, number> = {
  '5m': 300,
  '15m': 900,
  '1H': 3600,
  '4H': 14400,
  '1D': 86400,
};

function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

interface AssetProfile {
  basePrice: number;
  volatility: number;
  trendBias: number; // -1 to 1
  volumeBase: number;
  seed: number;
}

const PROFILES: Record<string, AssetProfile> = {
  'btc-usdt': { basePrice: 97250, volatility: 0.018, trendBias: 0.15, volumeBase: 48000, seed: 42 },
  'eth-usdt': { basePrice: 3450, volatility: 0.022, trendBias: 0.12, volumeBase: 22000, seed: 137 },
  'sol-usdt': { basePrice: 218.5, volatility: 0.035, trendBias: -0.08, volumeBase: 5800, seed: 256 },
  'aapl': { basePrice: 232.45, volatility: 0.012, trendBias: 0.06, volumeBase: 48, seed: 314 },
  'tsla': { basePrice: 348.12, volatility: 0.025, trendBias: -0.12, volumeBase: 85, seed: 512 },
  'nvda': { basePrice: 138.72, volatility: 0.020, trendBias: 0.18, volumeBase: 320, seed: 733 },
};

function roundPrice(price: number, basePrice: number): number {
  if (basePrice > 10000) return Math.round(price * 100) / 100;
  if (basePrice > 100) return Math.round(price * 100) / 100;
  if (basePrice > 1) return Math.round(price * 10000) / 10000;
  return Math.round(price * 1000000) / 1000000;
}

export function generateCandles(assetId: string, timeframe: Timeframe, count = 200): CandleData[] {
  const profile = PROFILES[assetId];
  if (!profile) return [];

  const interval = TIMEFRAME_SECONDS[timeframe];
  const now = Math.floor(Date.now() / 1000);
  const startTime = now - interval * count;
  const rand = seededRandom(profile.seed);
  const candles: CandleData[] = [];

  let price = profile.basePrice * (1 - profile.trendBias * 0.08);
  let trendPhase = 0;
  let trendPhaseLength = 20 + Math.floor(rand() * 30);
  let currentTrendStrength = profile.trendBias;

  for (let i = 0; i < count; i++) {
    if (i >= trendPhase + trendPhaseLength) {
      trendPhase = i;
      trendPhaseLength = 20 + Math.floor(rand() * 30);
      currentTrendStrength = (rand() - 0.5) * 0.4 + profile.trendBias;
    }

    const drift = currentTrendStrength * profile.volatility * 0.3;
    const noise = (rand() - 0.5) * 2 * profile.volatility;
    const change = drift + noise;

    const open = price;
    const close = price * (1 + change);
    const wickSize = Math.abs(noise) * price * 0.6 + price * profile.volatility * 0.3;
    const high = Math.max(open, close) + wickSize * rand() * 0.5;
    const low = Math.min(open, close) - wickSize * rand() * 0.5;

    const volumeBase = profile.volumeBase;
    const volumeNoise = 0.5 + rand() * 1.0;
    const trendVolumeBoost = Math.abs(change) > profile.volatility * 0.8 ? 1.5 + rand() : 1;
    const volume = volumeBase * volumeNoise * trendVolumeBoost;

    candles.push({
      time: startTime + i * interval,
      open: roundPrice(open, profile.basePrice),
      high: roundPrice(high, profile.basePrice),
      low: roundPrice(low, profile.basePrice),
      close: roundPrice(close, profile.basePrice),
      volume: Math.round(volume * 100) / 100,
    });

    price = close;
  }

  const lastCandle = candles[candles.length - 1];
  if (lastCandle) {
    lastCandle.close = roundPrice(profile.basePrice, profile.basePrice);
    lastCandle.high = Math.max(lastCandle.high, lastCandle.close);
  }

  return candles;
}

export function formatPrice(price: number): string {
  if (price >= 10000) return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (price >= 100) return `$${price.toFixed(2)}`;
  if (price >= 1) return `$${price.toFixed(2)}`;
  return `$${price.toFixed(4)}`;
}

export function formatVolume(vol: number): string {
  if (vol >= 1_000_000_000) return `${(vol / 1_000_000_000).toFixed(2)}B`;
  if (vol >= 1_000_000) return `${(vol / 1_000_000).toFixed(2)}M`;
  if (vol >= 1_000) return `${(vol / 1_000).toFixed(2)}K`;
  return vol.toFixed(0);
}

export function formatMarketCap(cap: number): string {
  if (cap >= 1_000_000_000_000) return `$${(cap / 1_000_000_000_000).toFixed(2)}T`;
  if (cap >= 1_000_000_000) return `$${(cap / 1_000_000_000).toFixed(2)}B`;
  if (cap >= 1_000_000) return `$${(cap / 1_000_000).toFixed(2)}M`;
  return `$${cap.toLocaleString()}`;
}
