import { Database } from 'lucide-react';
import { useStore } from '@/store/useStore';
import type { AssetDefinition } from '@/services/api';
import type { FuturesSocketStatus } from '@/services/marketData/binanceFuturesSocket';

const SOCKET_LABEL: Record<FuturesSocketStatus, { label: string; className: string }> = {
  idle: { label: '', className: '' },
  connecting: { label: 'Connecting', className: 'text-amber-600 dark:text-amber-400' },
  open: { label: 'Live', className: 'text-bullish' },
  reconnecting: { label: 'Reconnecting', className: 'text-amber-600 dark:text-amber-400' },
};

interface MarketSourceStatusProps {
  def: AssetDefinition | null;
  cached: boolean;
}

export function MarketSourceStatus({ def, cached }: MarketSourceStatusProps) {
  const socketState = useStore((s) => s.socketState);
  if (!def) return null;

  const isCrypto = def.type === 'crypto';
  const socket = SOCKET_LABEL[socketState.status];
  const lastUpdate = socketState.lastMessageAt
    ? new Date(socketState.lastMessageAt).toLocaleTimeString('en-GB')
    : null;

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-2xs text-neutral-500 dark:text-neutral-400">
      <span className="px-1.5 py-0.5 rounded bg-subtle-light dark:bg-subtle-dark font-medium">
        {isCrypto ? 'Source: Binance USDT-M Futures' : 'Source: Yahoo Finance (delayed)'}
      </span>
      {isCrypto && socket.label && <span className={`font-medium ${socket.className}`}>{socket.label}</span>}
      {isCrypto && lastUpdate && <span className="tabular-nums">Last update {lastUpdate}</span>}
      {cached && (
        <span className="flex items-center gap-0.5 text-amber-600 dark:text-amber-400">
          <Database className="w-2.5 h-2.5" />
          Cached
        </span>
      )}
    </div>
  );
}
