# Lighthouse procedure

Lighthouse runs are **manual** for this project — Lighthouse CI on Windows + headless Chrome is flaky and the perf number isn't worth the maintenance burden. This document is the canonical procedure for verifying §6 ("Performance ≥ 90 on mobile, A11y 100, PWA installable").

## Targets (per §6, §8)

| Category       | Target | Notes                                                |
|----------------|--------|------------------------------------------------------|
| Performance    | ≥ 90   | Mobile profile, throttled                            |
| Accessibility  | 100    | Both light and dark themes                           |
| Best Practices | ≥ 95   | Drops below if mixed content or console errors      |
| SEO            | ≥ 95   | Meta description + lang are baseline                 |
| PWA            | Pass   | Installable, valid manifest, service worker active   |

## Running

1. Build the production bundle and serve it:
   ```bash
   pnpm build
   pnpm preview --host 127.0.0.1
   ```
   Preview runs on `http://127.0.0.1:4173`.

2. Open Chrome (a fresh profile is best — extensions skew the score):
   ```bash
   chrome --user-data-dir=/tmp/lh-profile http://127.0.0.1:4173
   ```

3. Sign in with the demo user (`kirken@ohmyprofits.local` / `kirken-demo-passphrase-2026`) so the SW caches the authenticated app shell.

4. DevTools → **Lighthouse** tab → Categories: all five → Mode: **Navigation** → Device: **Mobile** → **Analyze page load**.

5. Run the audit on **`/clients`** (the default entry after login). Re-run on `/products` and `/orders`; the worst score is what counts.

## Common findings and fixes

- **"Some images do not have explicit width/height"** — emoji-style icons from `lucide-react` are SVG and don't trigger this. Hero/marketing images, if added later, must set both.
- **"Largest Contentful Paint over 2.5s"** — usually fonts. Self-hosted display + body fonts at `font-display: swap` are budgeted in `src/styles/tokens.css`. If LCP drifts, verify `<link rel="preload">` for the display font is present in `index.html`.
- **A11y dings around contrast** — recheck the active state colors in *both* themes. The `bg-accent text-(--color-accent-ink)` pattern is verified safe; pure `bg-ink/text-bg` flipped pairs can drop the contrast in dark mode and have caused regressions before.
- **PWA "Does not respond with a 200 when offline"** — the SW only caches what `globPatterns` matches. Check `dist/sw.js` lists your route HTML.

## When to re-run

- Before tagging a release.
- After adding any new dependency.
- After any change to `vite.config.ts`, `index.html`, or the runtime caching rules.
- After visual changes that move font/css/image weight.

## Saving results

Lighthouse exports JSON. Drop runs into `docs/lighthouse-history/<YYYY-MM-DD>-<route>.json` so we have a trend line. The folder is git-ignored by default; add `!docs/lighthouse-history/.gitkeep` if you want to commit them.
