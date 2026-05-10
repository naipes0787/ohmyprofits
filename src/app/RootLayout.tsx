import { NavLink, Outlet, useNavigate } from 'react-router';
import { LogOut } from 'lucide-react';

import { BrandMark } from '@shared/ui/BrandMark';
import { Button } from '@shared/ui/Button';
import { useAuth } from '@features/auth/use-auth';
import { OfflineIndicator } from '@pwa/OfflineIndicator';
import { UpdateBanner } from '@pwa/UpdateBanner';
import { InstallPrompt } from '@pwa/InstallPrompt';

const NAV = [
  { to: '/clients', label: 'Clients' },
  { to: '/products', label: 'Products' },
  { to: '/orders', label: 'Orders' },
] as const;

/**
 * Root shell — sidebar at md+, bottom tab bar on mobile.
 * Three primary sections only; Account lives at the bottom of the sidebar.
 */
export function RootLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const metaName: unknown = user?.user_metadata?.['display_name'];
  const displayName =
    typeof metaName === 'string' ? metaName : (user?.email ?? 'You');

  const onSignOut = async () => {
    await signOut();
    await navigate('/login', { replace: true });
  };

  return (
    <div className="bg-bg text-ink min-h-dvh">
      {/* Mobile top bar — sidebar is desktop-only, so on phones we surface the
         brand here so the app has a visible identity. */}
      <header className="border-line bg-surface/95 sticky top-0 z-30 flex items-center justify-between border-b px-4 py-3 backdrop-blur md:hidden">
        <NavLink to="/" className="inline-flex items-center gap-2">
          <BrandMark className="text-accent h-5 w-5" />
          <span className="font-display text-sm tracking-tight uppercase">
            ohMyProfits
          </span>
        </NavLink>
        <NavLink
          to="/account"
          className={({ isActive }) =>
            [
              'font-mono text-[11px] uppercase tracking-[0.2em]',
              isActive
                ? 'text-accent-text'
                : 'text-ink-muted hover:text-ink',
            ].join(' ')
          }
        >
          {displayName.split(' ')[0] ?? 'You'}
        </NavLink>
      </header>

      <div className="md:grid md:grid-cols-[240px_1fr]">
        <aside className="border-line hidden border-r md:sticky md:top-0 md:flex md:h-dvh md:flex-col md:px-6 md:py-8">
          <NavLink to="/" className="mb-12 inline-flex items-center gap-3">
            <BrandMark className="text-accent h-7 w-7" />
            <span className="font-display text-step-1 tracking-tight uppercase">
              ohMyProfits
            </span>
          </NavLink>

          <nav className="flex flex-1 flex-col gap-1" aria-label="Primary">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  [
                    'font-display text-step-2 px-2 py-2 uppercase tracking-tight transition-colors',
                    isActive ? 'text-accent' : 'text-ink-muted hover:text-ink',
                  ].join(' ')
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="border-line border-t pt-6">
            <NavLink
              to="/account"
              className={({ isActive }) =>
                [
                  'font-mono block text-[11px] uppercase tracking-[0.2em]',
                  isActive
                    ? 'text-accent-text'
                    : 'text-ink-muted hover:text-ink',
                ].join(' ')
              }
            >
              Account
            </NavLink>
            <p
              className="text-ink mt-3 truncate text-sm"
              title={user?.email ?? undefined}
            >
              {displayName}
            </p>
            <Button
              size="sm"
              variant="ghost"
              leadingIcon={<LogOut className="h-3.5 w-3.5" strokeWidth={1.5} />}
              onClick={() => void onSignOut()}
              className="mt-3 -ml-2"
            >
              Sign out
            </Button>
          </div>
        </aside>

        <main id="main" className="min-h-dvh pb-24 md:pb-0">
          <Outlet />
        </main>
      </div>

      <nav
        aria-label="Primary"
        className="border-line bg-surface/95 fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t backdrop-blur md:hidden"
      >
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              [
                'font-display flex min-h-[56px] items-center justify-center px-2 py-3 text-xs uppercase tracking-[0.18em]',
                isActive ? 'text-accent-text' : 'text-ink-muted',
              ].join(' ')
            }
          >
            {item.label}
          </NavLink>
        ))}
        <NavLink
          to="/account"
          className={({ isActive }) =>
            [
              'font-display flex min-h-[56px] items-center justify-center px-2 py-3 text-xs uppercase tracking-[0.18em]',
              isActive ? 'text-accent-text' : 'text-ink-muted',
            ].join(' ')
          }
        >
          You
        </NavLink>
      </nav>

      <OfflineIndicator />
      <UpdateBanner />
      <InstallPrompt />
    </div>
  );
}
