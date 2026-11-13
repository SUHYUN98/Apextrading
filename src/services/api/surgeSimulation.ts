import type { SurgeAsset } from '@/types/surge';

export const SIMULATION_TICK_MS = 2_500;

const MAX_RVOL = 30;
const MIN_RVOL = 0.2;
const MIN_TRADING_VALUE = 0.1;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

// Random-walk step around the last live values; `random` returns a value in [0, 1)
export function tickSimulatedAssets(assets: SurgeAsset[], random: () => number = Math.random): SurgeAsset[] {
  return assets.map((asset) => {
    const priceMove = (random() - 0.5) * 0.006;
    const tradingMove = 1 + (random() - 0.5) * 0.08;
    const rvolMove = 1 + (random() - 0.5) * 0.12;
    const tradingValue = Math.max(MIN_TRADING_VALUE, asset.tradingValue * tradingMove);

    return {
      ...asset,
      price: asset.price * (1 + priceMove),
      changePct: asset.changePct + priceMove * 100,
      tradingValue,
      tradingValueLocal: asset.tradingValueLocal * (tradingValue / asset.tradingValue),
      rvol: clamp(asset.rvol * rvolMove, MIN_RVOL, MAX_RVOL),
      volumeChangePct: asset.volumeChangePct + (random() - 0.5) * 6,
    };
  });
}
