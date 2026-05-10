import { CloudOff } from 'lucide-react';
import { useOnline } from './use-online';

/**
 * Small pill that shows when the browser is offline. Per §1.3 the offline
 * state must show cached data with a non-intrusive indicator — this is it.
 *
 * Renders nothing while online, so it's safe to mount globally.
 */
export function OfflineIndicator() {
  const online = useOnline();
  if (online) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed left-3 top-3 z-40 md:left-6 md:top-6"
    >
      <span className="border-warning text-warning bg-bg/90 inline-flex items-center gap-2 border px-3 py-1.5 backdrop-blur">
        <CloudOff className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
        <span className="font-mono text-[10px] uppercase tracking-[0.24em]">
          Offline · Showing cached data
        </span>
      </span>
    </div>
  );
}
