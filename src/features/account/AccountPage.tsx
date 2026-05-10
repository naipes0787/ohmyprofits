import { useNavigate } from 'react-router';

import { PageHeader } from '@shared/ui/PageHeader';
import { Button } from '@shared/ui/Button';
import { useUiStore } from '@shared/hooks/use-ui-store';
import { useAuth } from '@features/auth/use-auth';

const THEMES = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
] as const;

export default function AccountPage() {
  const theme = useUiStore((s) => s.theme);
  const setTheme = useUiStore((s) => s.setTheme);
  const currency = useUiStore((s) => s.currency);
  const setCurrency = useUiStore((s) => s.setCurrency);
  const { user, signOut, isEmailVerified } = useAuth();
  const navigate = useNavigate();

  const onSignOut = async () => {
    await signOut();
    await navigate('/login', { replace: true });
  };

  return (
    <div className="px-6 py-10 md:px-10 md:py-14">
      <PageHeader eyebrow="Account" title="Settings" />

      <section className="mt-12 max-w-xl space-y-12">
        <fieldset className="border-line border-t pt-6">
          <legend className="text-ink-muted font-mono text-xs uppercase tracking-[0.24em]">
            Signed in as
          </legend>
          <p className="text-ink mt-3 break-all font-mono text-sm">
            {user?.email ?? '—'}
          </p>
          {!isEmailVerified ? (
            <p className="border-warning text-warning mt-4 border-l-2 px-3 py-2 font-mono text-xs uppercase tracking-[0.2em]">
              Email not verified yet — check your inbox.
            </p>
          ) : null}
          <Button
            variant="secondary"
            className="mt-6"
            onClick={() => void onSignOut()}
          >
            Sign out
          </Button>
        </fieldset>

        <fieldset className="border-line border-t pt-6">
          <legend className="text-ink-muted font-mono text-xs uppercase tracking-[0.24em]">
            Theme
          </legend>
          <div className="mt-4 flex flex-wrap gap-2">
            {THEMES.map((t) => (
              <button
                key={t.value}
                type="button"
                aria-pressed={theme === t.value}
                onClick={() => setTheme(t.value)}
                className={[
                  'font-display min-h-[44px] px-4 py-2 text-sm uppercase tracking-[0.18em] transition-colors',
                  theme === t.value
                    ? 'bg-accent text-(--color-accent-ink) border-accent border'
                    : 'border-line text-ink hover:border-ink border',
                ].join(' ')}
              >
                {t.label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="border-line border-t pt-6">
          <legend className="text-ink-muted font-mono text-xs uppercase tracking-[0.24em]">
            Currency
          </legend>
          <label className="mt-4 block">
            <span className="sr-only">ISO currency code</span>
            <input
              type="text"
              value={currency}
              maxLength={3}
              onChange={(e) => setCurrency(e.target.value.toUpperCase())}
              className="border-line bg-transparent text-ink focus:border-accent-2 w-32 border-b py-2 font-mono text-step-1 uppercase tracking-[0.16em] focus:outline-none"
              spellCheck={false}
            />
          </label>
          <p className="text-ink-muted mt-2 text-sm">
            Three-letter ISO 4217 code. Defaults to USD.
          </p>
        </fieldset>
      </section>
    </div>
  );
}
