import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

export function Section({
  title,
  icon: Icon,
  children,
  action,
}: {
  title: string;
  icon: LucideIcon;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="border-b border-border-light dark:border-border-dark">
      <div className="px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Icon className="w-3.5 h-3.5 text-neutral-400" />
          <h3 className="text-2xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
            {title}
          </h3>
        </div>
        {action}
      </div>
      <div className="px-4 pb-3">{children}</div>
    </div>
  );
}
