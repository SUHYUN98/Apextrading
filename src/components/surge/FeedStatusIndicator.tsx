import { useI18n } from '@/i18n/useI18n';
import type { FeedStatus } from '@/types/surge';

interface FeedStatusIndicatorProps {
  status: FeedStatus;
  updatedAt: number | null;
}

export function FeedStatusIndicator({ status, updatedAt }: FeedStatusIndicatorProps) {
  const { t } = useI18n();
  const copy = t.surge.status;

  if (status === 'live' && updatedAt) {
    return (
      <div className="flex items-center gap-2 text-xs font-medium text-emerald-300">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
        </span>
        <span className="tabular-nums">{copy.live}</span>
      </div>
    );
  }

  if (status === 'simulated') {
    return (
      <div className="flex items-center gap-2 text-xs font-medium text-amber-300">
        <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-amber-400" />
        <span>{copy.simulated}</span>
      </div>
    );
  }

  const tone = status === 'error' ? 'text-red-300' : 'text-neutral-400';
  const message = status === 'error' ? copy.error : copy.loading;
  return (
    <div className={`flex items-center gap-2 text-xs ${tone}`}>
      <span className="inline-flex h-2 w-2 rounded-full bg-current" />
      <span>{message}</span>
    </div>
  );
}
