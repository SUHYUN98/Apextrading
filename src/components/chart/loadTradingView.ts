const TV_SCRIPT_URL = 'https://s3.tradingview.com/tv.js';

let scriptPromise: Promise<void> | null = null;

export function loadTradingViewScript(): Promise<void> {
  if (window.TradingView) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = TV_SCRIPT_URL;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        script.remove();
        scriptPromise = null;
        reject(new Error('Failed to load TradingView script'));
      };
      document.head.appendChild(script);
    });
  }
  return scriptPromise;
}
