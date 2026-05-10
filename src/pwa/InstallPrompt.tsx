import { Download, X } from 'lucide-react';
import { useClients } from '@features/clients/clients';
import { useInstallPrompt } from './use-install-prompt';

/**
 * Per §5: don't pop the install prompt on first visit. Only show it once the
 * user has at least one client — they've actually committed to the workspace.
 *
 * Mounted globally; renders nothing unless all conditions line up.
 */
export function InstallPrompt() {
  const { available, prompt, dismiss } = useInstallPrompt();
  const { data: clients } = useClients();

  const hasAtLeastOneClient = (clients?.length ?? 0) > 0;
  if (!available || !hasAtLeastOneClient) return null;

  return (
    <div
      role="region"
      aria-label="Install ohMyProfits"
      className="fixed inset-x-3 bottom-18 z-40 md:bottom-6 md:right-6 md:left-auto md:max-w-sm"
    >
      <div className="border-line bg-surface flex items-start gap-4 border px-5 py-4 shadow-[0_24px_48px_-16px_rgba(0,0,0,0.45)]">
        <div className="flex-1">
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-ink-muted">
            Install
          </p>
          <p className="text-ink mt-1 text-sm leading-snug">
            Add ohMyProfits to your home screen for offline use and a faster app feel.
          </p>
          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              onClick={() => void prompt()}
              className="bg-accent text-(--color-accent-ink) font-display inline-flex items-center gap-2 px-4 py-2 text-xs uppercase tracking-[0.18em]"
            >
              <Download className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
              Install
            </button>
            <button
              type="button"
              onClick={dismiss}
              className="text-ink-muted hover:text-ink font-display text-xs uppercase tracking-[0.18em] underline-offset-[6px] hover:underline"
            >
              Not now
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss install prompt"
          className="text-ink-muted hover:text-ink -m-2 p-2 transition-colors"
        >
          <X className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
