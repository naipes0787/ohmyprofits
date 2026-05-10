import { useState } from 'react';
import { RotateCcw, X } from 'lucide-react';
import { useSwUpdate } from './use-sw-update';

/**
 * Bottom-pinned banner that appears when a new SW build is ready. Per §5 we
 * never auto-reload mid-edit — the user clicks the action.
 */
export function UpdateBanner() {
  const sw = useSwUpdate();
  const [dismissed, setDismissed] = useState(false);
  const [updating, setUpdating] = useState(false);

  if (sw.state !== 'available' || dismissed) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-3 bottom-18 z-50 md:bottom-6 md:left-auto md:right-6 md:max-w-sm"
    >
      <div className="bg-ink text-bg flex items-start gap-4 px-5 py-4 shadow-[0_24px_48px_-16px_rgba(0,0,0,0.55)]">
        <div className="flex-1">
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] opacity-70">
            Update ready
          </p>
          <p className="mt-1 text-sm leading-snug">
            A new version of ohMyProfits is available.
          </p>
          <button
            type="button"
            onClick={() => {
              setUpdating(true);
              void sw.update();
            }}
            disabled={updating}
            className="font-display mt-3 inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] underline-offset-[6px] hover:underline disabled:opacity-60"
          >
            <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
            {updating ? 'Reloading…' : 'Reload now'}
          </button>
        </div>

        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss update notice"
          className="-m-2 p-2 opacity-60 hover:opacity-100 transition-opacity"
        >
          <X className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
