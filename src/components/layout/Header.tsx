import { Moon, Sun, Activity, WifiOff, Loader2, Globe } from 'lucide-react';
import { useStore, type AppView } from '@/store/useStore';
import { useI18n } from '@/i18n/useI18n';
import type { FuturesSocketStatus } from '@/services/marketData/binanceFuturesSocket';

const VIEWS: AppView[] = ['chart', 'surge', 'scanner'];

const SOCKET_BADGE: Record<Exclude<FuturesSocketStatus, 'idle'>, { label: string; text: string; dot: string }> = {
  open: { label: 'WS Live', text: 'text-bullish', dot: 'bg-bullish animate-pulse-subtle' },
  connecting: { label: 'WS Connecting', text: 'text-amber-600 dark:text-amber-400', dot: 'bg-amber-500' },
  reconnecting: { label: 'WS Reconnecting', text: 'text-amber-600 dark:text-amber-400', dot: 'bg-amber-500' },
};

export function Header() {
  const darkMode = useStore((s) => s.darkMode);
  const toggleDarkMode = useStore((s) => s.toggleDarkMode);
  const appView = useStore((s) => s.appView);
  const setAppView = useStore((s) => s.setAppView);
  const analyses = useStore((s) => s.analyses);
  const conditions = useStore((s) => s.conditions);
  const socketState = useStore((s) => s.socketState);
  const assetStates = useStore((s) => s.assetStates);
  const { t, lang, setLanguage } = useI18n();

  const matchedCount = analyses.filter((a) => a.matchedConditions.length > 0).length;
  const loadingCount = Array.from(assetStates.values()).filter((s) => s.status === 'loading').length;
  const errorCount = Array.from(assetStates.values()).filter((s) => s.status === 'error').length;

  return (
    <header className="h-12 border-b border-border-light dark:border-border-dark flex items-center justify-between px-3 sm:px-4 bg-surface-light/80 dark:bg-surface-dark/80 backdrop-blur-xl flex-shrink-0 z-10 gap-2">
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center">
          <Activity className="w-4 h-4 text-white" />
        </div>
        <h1 className="text-sm font-bold text-neutral-900 dark:text-white tracking-tight">Apex</h1>
        <span className="text-2xs text-neutral-400 ml-1 hidden sm:inline">Multi-Asset Technical Analysis</span>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <div className="flex items-center p-0.5 rounded-lg bg-subtle-light dark:bg-subtle-dark">
          {VIEWS.map((view) => {
            const active = appView === view;
            return (
              <button
                key={view}
                onClick={() => setAppView(view)}
                aria-pressed={active}
                className={`px-2.5 py-1 text-2xs font-medium rounded-md transition-all-smooth whitespace-nowrap ${
                  active
                    ? 'bg-surface-light dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-sm'
                    : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
                }`}
              >
                {t.nav[view]}
              </button>
            );
          })}
        </div>

        {/* Live data status */}
        {loadingCount > 0 ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-subtle-light dark:bg-subtle-dark">
            <Loader2 className="w-3 h-3 text-accent animate-spin" />
            <span className="text-2xs text-neutral-600 dark:text-neutral-400">Loading {loadingCount}...</span>
          </div>
        ) : errorCount > 0 ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-bearish-muted/20">
            <WifiOff className="w-3 h-3 text-bearish" />
            <span className="text-2xs text-bearish">{errorCount} error{errorCount !== 1 ? 's' : ''}</span>
          </div>
        ) : null}

        {/* WebSocket indicator */}
        {socketState.status !== 'idle' && (
          <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-lg bg-subtle-light dark:bg-subtle-dark" title="Binance Futures WebSocket">
            <span className={`w-1.5 h-1.5 rounded-full ${SOCKET_BADGE[socketState.status].dot}`} />
            <span className={`text-2xs font-medium ${SOCKET_BADGE[socketState.status].text}`}>{SOCKET_BADGE[socketState.status].label}</span>
          </div>
        )}

        {/* Match count */}
        {conditions.length > 0 && (
          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-subtle-light dark:bg-subtle-dark">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse-subtle" />
            <span className="text-2xs text-neutral-600 dark:text-neutral-400">
              <span className="font-semibold text-accent">{matchedCount}</span> match{matchedCount !== 1 ? 'es' : ''}
            </span>
          </div>
        )}

        <button
          onClick={() => setLanguage(lang === 'KR' ? 'EN' : 'KR')}
          aria-label={t.languageToggle}
          title={t.languageToggle}
          className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-2xs font-semibold hover:bg-subtle-light dark:hover:bg-subtle-dark transition-all-smooth"
        >
          <Globe className="w-3.5 h-3.5 text-neutral-400" />
          <span className={lang === 'KR' ? 'text-neutral-900 dark:text-white' : 'text-neutral-400'}>KR</span>
          <span className="text-neutral-300 dark:text-neutral-600">/</span>
          <span className={lang === 'EN' ? 'text-neutral-900 dark:text-white' : 'text-neutral-400'}>EN</span>
        </button>

        <button
          onClick={toggleDarkMode}
          className="p-2 rounded-lg hover:bg-subtle-light dark:hover:bg-subtle-dark transition-all-smooth"
        >
          {darkMode ? (
            <Sun className="w-4 h-4 text-neutral-400" />
          ) : (
            <Moon className="w-4 h-4 text-neutral-400" />
          )}
        </button>
      </div>
    </header>
  );
}
