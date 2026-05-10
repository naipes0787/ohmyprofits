import { Outlet } from 'react-router';
import { BrandMark } from '@shared/ui/BrandMark';

/**
 * Auth shell. Split-screen on desktop:
 *   left  → ink panel with the chevron mark and a typographic moment
 *   right → the form, centered, generous gutters
 *
 * On mobile, the form is full-bleed; the brand sits as a quiet stamp at the top.
 *
 * Per §4.1: bold editorial / contemporary craft. Generous negative space,
 * one oversized typographic moment, no timid grays-on-white.
 */
export function AuthLayout() {
  return (
    <div className="bg-bg text-ink min-h-dvh">
      <div className="md:grid md:min-h-dvh md:grid-cols-[1.05fr_1fr]">
        <BrandPanel />
        <main
          id="main"
          className="flex min-h-dvh flex-col px-6 py-10 md:min-h-0 md:px-12 md:py-16"
        >
          <div className="md:hidden">
            <a href="/" className="text-accent inline-flex items-center gap-2">
              <BrandMark className="h-5 w-5" />
              <span className="font-display text-sm uppercase tracking-[0.2em]">
                ohMyProfits
              </span>
            </a>
          </div>

          <div className="mx-auto w-full max-w-md flex-1 md:flex md:flex-col md:justify-center">
            <Outlet />
          </div>

          <footer className="text-ink-muted mt-8 text-xs">
            <p className="font-mono uppercase tracking-[0.24em]">
              © Kirken Studio · ohMyProfits
            </p>
          </footer>
        </main>
      </div>
    </div>
  );
}

function BrandPanel() {
  return (
    <aside
      aria-hidden="true"
      className="bg-ink text-bg relative hidden overflow-hidden md:flex md:flex-col md:justify-between md:p-12"
    >
      <div className="text-accent flex items-center gap-3">
        <BrandMark className="h-7 w-7" />
        <span className="font-display text-bg text-base uppercase tracking-[0.22em]">
          ohMyProfits
        </span>
      </div>

      <div className="relative">
        {/* Hero typographic moment — wraps intentionally, breaks the grid. */}
        <h1 className="text-bg leading-[0.82] font-black uppercase">
          <span className="block text-[clamp(4rem,8vw,7.5rem)]">Make</span>
          <span className="text-accent block translate-x-2 text-[clamp(4rem,8vw,7.5rem)]">
            every
          </span>
          <span className="block text-[clamp(4rem,8vw,7.5rem)]">order</span>
          <span className="block translate-x-6 text-[clamp(4rem,8vw,7.5rem)]">
            count.
          </span>
        </h1>
        <p className="text-bg/70 mt-8 max-w-md font-body text-sm leading-relaxed">
          Clients, products, orders. One PWA. Built like the small studio shipping
          its flagship product.
        </p>
      </div>

      <div className="text-bg/60 grid grid-cols-3 gap-6 font-mono text-[10px] uppercase tracking-[0.24em]">
        <div>
          <p className="text-bg/40">Built for</p>
          <p className="text-bg mt-1">Craft</p>
        </div>
        <div>
          <p className="text-bg/40">Backed by</p>
          <p className="text-bg mt-1">Postgres + RLS</p>
        </div>
        <div>
          <p className="text-bg/40">Runs on</p>
          <p className="text-bg mt-1">Edge & offline</p>
        </div>
      </div>
    </aside>
  );
}
