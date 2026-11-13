import { useEffect, useId, useRef, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { loadTradingViewScript } from './loadTradingView';

interface TradingViewChartProps {
  symbol: string;
  interval: string;
  theme: 'light' | 'dark';
  studies: string[];
}

export function TradingViewChart({ symbol, interval, theme, studies }: TradingViewChartProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const reactId = useId();
  const [loadFailed, setLoadFailed] = useState(false);
  const studiesKey = studies.join(',');

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let cancelled = false;
    let widget: TradingViewWidgetInstance | null = null;
    const target = document.createElement('div');
    target.id = `tv-${reactId.replace(/:/g, '')}`;
    target.style.width = '100%';
    target.style.height = '100%';
    host.appendChild(target);
    setLoadFailed(false);

    const isDark = theme === 'dark';
    const background = isDark ? '#0A0A0A' : '#FBFBFD';

    loadTradingViewScript()
      .then(() => {
        if (cancelled || !window.TradingView) return;
        widget = new window.TradingView.widget({
          container_id: target.id,
          autosize: true,
          symbol,
          interval,
          timezone: 'Etc/UTC',
          theme,
          style: '1',
          locale: 'en',
          toolbar_bg: background,
          enable_publishing: false,
          allow_symbol_change: false,
          hide_side_toolbar: false,
          hide_top_toolbar: false,
          withdateranges: true,
          details: false,
          hotlist: false,
          calendar: false,
          show_popup_button: false,
          studies: studiesKey ? studiesKey.split(',') : [],
          backgroundColor: background,
          gridColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
          support_host: 'https://www.tradingview.com',
        });
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true);
      });

    return () => {
      cancelled = true;
      try {
        widget?.remove();
      } catch {
        // Widget may already be detached
      }
      target.remove();
    };
  }, [symbol, interval, theme, studiesKey, reactId]);

  return (
    <div className="relative flex-1 min-h-0 bg-canvas-light dark:bg-canvas-dark">
      <div ref={hostRef} className="absolute inset-0" />
      {loadFailed && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
          <AlertCircle className="w-6 h-6 text-bearish" />
          <p className="text-sm text-neutral-500 dark:text-neutral-400">The chart could not be loaded. Check your connection and try again.</p>
        </div>
      )}
    </div>
  );
}
