export function logMarketDataError(source: string, details: Record<string, unknown>): void {
  console.error(`[market-data:${source}]`, details);
}

export function logMarketDataWarn(source: string, details: Record<string, unknown>): void {
  console.warn(`[market-data:${source}]`, details);
}
