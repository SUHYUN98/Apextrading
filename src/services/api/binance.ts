export type BinanceMarket = 'spot' | 'futures';

export const MARKET_REST: Record<BinanceMarket, string> = {
  spot: 'https://api.binance.com/api/v3',
  futures: 'https://fapi.binance.com/fapi/v1',
};

// Default crypto assets (USDT-M perpetual futures)
export const DEFAULT_CRYPTO_ASSETS = [
  { id: 'btc-usdt', symbol: 'BTCUSDT', name: 'Bitcoin', displaySymbol: 'BTC/USDT' },
  { id: 'eth-usdt', symbol: 'ETHUSDT', name: 'Ethereum', displaySymbol: 'ETH/USDT' },
  { id: 'sol-usdt', symbol: 'SOLUSDT', name: 'Solana', displaySymbol: 'SOL/USDT' },
  { id: 'xrp-usdt', symbol: 'XRPUSDT', name: 'XRP', displaySymbol: 'XRP/USDT' },
  { id: 'doge-usdt', symbol: 'DOGEUSDT', name: 'Dogecoin', displaySymbol: 'DOGE/USDT' },
];

export function normalizeBinanceSymbol(input: string): string {
  return input.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
}
