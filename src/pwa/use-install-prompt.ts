import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: ReadonlyArray<string>;
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const DISMISSED_KEY = 'omp.install.dismissed.v1';
const INSTALLED_KEY = 'omp.install.installed.v1';

/**
 * Captures the browser's `beforeinstallprompt` event so the app can present
 * its own CTA at the right moment. The actual decision *when* to show the
 * prompt lives in the consumer (e.g. wait until a client exists per §5).
 */
export function useInstallPrompt() {
  const [evt, setEvt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(
    () => localStorage.getItem(INSTALLED_KEY) === '1',
  );
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(DISMISSED_KEY) === '1',
  );

  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setEvt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      localStorage.setItem(INSTALLED_KEY, '1');
      setInstalled(true);
      setEvt(null);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  async function prompt(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
    if (!evt) return 'unavailable';
    await evt.prompt();
    const result = await evt.userChoice;
    if (result.outcome === 'accepted') {
      localStorage.setItem(INSTALLED_KEY, '1');
      setInstalled(true);
    }
    setEvt(null);
    return result.outcome;
  }

  function dismiss(): void {
    localStorage.setItem(DISMISSED_KEY, '1');
    setDismissed(true);
  }

  return {
    available: !!evt && !installed && !dismissed,
    installed,
    dismissed,
    prompt,
    dismiss,
  };
}
