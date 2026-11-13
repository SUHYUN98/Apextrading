const BASELINE_CANDLES = 20;

export interface VolumeStats {
  rvol: number;
  volumeChangePct: number;
}

// volumes are ordered oldest to newest; the last entry is the current candle
export function computeVolumeStats(volumes: number[]): VolumeStats | null {
  if (volumes.length < 2) return null;
  const current = volumes[volumes.length - 1];
  const previous = volumes[volumes.length - 2];
  const baseline = volumes.slice(Math.max(0, volumes.length - 1 - BASELINE_CANDLES), volumes.length - 1);
  const average = baseline.reduce((sum, value) => sum + value, 0) / baseline.length;
  return {
    rvol: average > 0 ? current / average : 0,
    volumeChangePct: previous > 0 ? ((current - previous) / previous) * 100 : 0,
  };
}

// Sums bar volumes into fixed-width time buckets, e.g. hourly bars into 4h bars
export function bucketVolumes(timesMs: number[], volumes: number[], bucketMs: number): number[] {
  const buckets = new Map<number, number>();
  timesMs.forEach((time, index) => {
    const key = Math.floor(time / bucketMs) * bucketMs;
    buckets.set(key, (buckets.get(key) ?? 0) + volumes[index]);
  });
  return [...buckets.entries()].sort((a, b) => a[0] - b[0]).map(([, volume]) => volume);
}
