import { useState } from 'react';
import { List, LineChart, Activity } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { Header } from '@/components/layout/Header';
import { ScreenerSidebar } from '@/components/sidebar/ScreenerSidebar';
import { ChartCanvas } from '@/components/chart/ChartCanvas';
import { ConditionPanel } from '@/components/panel/ConditionPanel';
import { VolumeSurgeScreener } from '@/components/surge/VolumeSurgeScreener';
import { ScannerScreen } from '@/components/scanner/ScannerScreen';

type MobilePane = 'markets' | 'chart' | 'analysis';

const MOBILE_TABS: { id: MobilePane; label: string; icon: typeof List }[] = [
  { id: 'markets', label: 'Markets', icon: List },
  { id: 'chart', label: 'Chart', icon: LineChart },
  { id: 'analysis', label: 'Analysis', icon: Activity },
];

export function Workspace() {
  const selectedAssetId = useStore((s) => s.selectedAssetId);
  const analyses = useStore((s) => s.analyses);
  const assetStates = useStore((s) => s.assetStates);
  const appView = useStore((s) => s.appView);
  const [mobilePane, setMobilePane] = useState<MobilePane>('chart');

  const selectedAnalysis = analyses.find((a) => a.asset.id === selectedAssetId) || null;
  const selectedState = assetStates.get(selectedAssetId);
  const selectedDef = selectedState?.def ?? null;

  const paneVisibility = (pane: MobilePane) => (mobilePane === pane ? 'flex' : 'hidden');

  return (
    <div className="h-dvh flex flex-col bg-canvas-light dark:bg-canvas-dark overflow-hidden">
      <Header />
      {appView === 'scanner' ? (
        <ScannerScreen />
      ) : appView === 'surge' ? (
        <VolumeSurgeScreener />
      ) : (
        <>
          <div className="flex-1 flex min-h-0">
            <div className={`${paneVisibility('markets')} lg:flex min-h-0`}>
              <ScreenerSidebar />
            </div>
            <main className={`${paneVisibility('chart')} lg:flex flex-1 flex-col min-w-0 min-h-0 bg-canvas-light dark:bg-canvas-dark`}>
              <ChartCanvas analysis={selectedAnalysis} assetDef={selectedDef} />
            </main>
            <div className={`${paneVisibility('analysis')} lg:flex min-h-0`}>
              <ConditionPanel />
            </div>
          </div>
          <nav className="lg:hidden flex-shrink-0 grid grid-cols-3 border-t border-border-light dark:border-border-dark bg-surface-light/90 dark:bg-surface-dark/90 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]">
            {MOBILE_TABS.map(({ id, label, icon: Icon }) => {
              const active = mobilePane === id;
              return (
                <button
                  key={id}
                  onClick={() => setMobilePane(id)}
                  className={`flex flex-col items-center gap-0.5 py-2 text-2xs font-medium transition-all-smooth ${
                    active ? 'text-accent' : 'text-neutral-500 dark:text-neutral-400'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {label}
                </button>
              );
            })}
          </nav>
        </>
      )}
    </div>
  );
}
