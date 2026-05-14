# Production deploy runbook

Single source of truth for shipping ohMyProfits to production. Pairs with
`vercel.json` (security headers / CSP) and `.github/workflows/ci.yml` (gates).

## Prereqs (one-time)

1. **Supabase project** at supabase.com. Note the project ref (e.g. `abcdwxyz`)
   and the project URL (`https://abcdwxyz.supabase.co`).
2. **Vercel project** linked to the GitHub repo.
3. The local stack is already wired and works (`pnpm supabase:start`,
   `pnpm dev`).

## 1 — Provision the Supabase project

```bash
# From a clean checkout, link the local CLI to the remote project.
supabase link --project-ref <YOUR_REF>

# Push migrations.
supabase db push
```

After `db push`:

- Verify in the Supabase dashboard → **Database → Policies** that every domain
  table (`clients`, `categories`, `products`, `orders`, `order_items`,
  `order_number_counters`) has `RLS enabled` AND `Force RLS`.
- Verify **Database → Functions** lists `set_owner_id`, `set_updated_at`,
  `next_order_number`, `orders_assign_number`, plus the `*_check_*` guards.
- Confirm **Auth → URL Configuration**:
  - Site URL: `https://<your-domain>`
  - Redirect URLs: include `https://<your-domain>/verify`,
    `https://<your-domain>/reset`
- Confirm **Auth → Providers → Email**:
  - "Confirm email" enabled
  - Minimum password length ≥ 12 (matches `signupSchema`)

## 2 — Configure Vercel

Set these as **Production** + **Preview** environment variables:

| Var | Value |
| --- | --- |
| `VITE_SUPABASE_URL` | `https://<YOUR_REF>.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | The anon key from Supabase → Project Settings → API |
| `VITE_SUPABASE_PROJECT_REF` | `<YOUR_REF>` |
| `VITE_APP_ENV` | `production` |

**Never** set `SUPABASE_SERVICE_ROLE_KEY` in Vercel — the SPA bundle has no
need for it and shipping it would void the entire RLS model.

The `env()` validator in [`src/shared/lib/env.ts`](../src/shared/lib/env.ts)
fails the build if `VITE_SUPABASE_PROJECT_REF` doesn't match the URL host —
you'll see the error in the Vercel build log immediately rather than at
runtime.

## 3 — First deploy

Push to `main`. Vercel runs:

```
pnpm install --frozen-lockfile
pnpm build
```

`pnpm build` runs `tsc -b && vite build`, which is gated by typecheck. The
output goes to `dist/`, which Vercel serves with the `vercel.json`
`rewrites` (SPA fallback) and `headers` (CSP + HSTS + Permissions-Policy).

## 4 — Smoke test the production deploy

After Vercel reports the deploy live:

1. Hit `https://<your-domain>/login`. The page should load with a strict CSP
   — **no console errors, no `unsafe-inline` violations, no font CORS
   warnings**. If you see any, see the CSP debug section below.
2. Sign up with a fresh email. Confirm via the email link.
3. Walk the critical path: create a client → create a category + product →
   create an order → mark it Paid. Each step should round-trip without errors.
4. Open DevTools → **Application → Manifest**: scope, start_url, theme color,
   icons (regular + maskable) all present and resolvable.
5. Open DevTools → **Application → Service Workers**: the SW is `activated`
   with a `Workbox-*` source. Reloading the page hits the SW (visible in
   the **Network** tab as "ServiceWorker").
6. Run Lighthouse per [`LIGHTHOUSE.md`](LIGHTHOUSE.md). Hit the §6 targets.

## 5 — Verify security posture

```bash
# CSP and HSTS should match vercel.json.
curl -sI https://<your-domain>/ | grep -E 'content-security|strict-transport|x-frame|referrer-policy|permissions-policy'

# RLS smoke check (without auth → 401).
curl -i "https://<YOUR_REF>.supabase.co/rest/v1/clients?select=*" -H "apikey: $ANON"
# Expect: 401 with no rows.

# RLS smoke check (anon role auth → empty array, not someone else's rows).
# Replace $ANON with your anon key.
curl -i "https://<YOUR_REF>.supabase.co/rest/v1/clients?select=*" \
  -H "apikey: $ANON" \
  -H "Authorization: Bearer $ANON"
# Expect: 200 with `[]` (anon has no policies).
```

## 6 — Ongoing: subsequent deploys

Push to `main`. CI runs typecheck → lint → unit tests → build → audit → E2E.
Any red gate blocks the deploy. The E2E job spins up a local Supabase stack
inside the runner and exercises chromium + mobile.

## CSP debug

If a feature breaks behind the CSP in `vercel.json`:

- **Inline styles from a library**: lots of CSS-in-JS libs inject runtime
  `<style>`. We accept that with `style-src 'self' 'unsafe-inline'` already.
- **Inline event handlers**: never. React doesn't emit any.
- **eval / new Function**: blocked. If you see this, a dependency is doing
  something it shouldn't — file an issue and pin the dep before adopting.
- **Fonts**: we self-host (no Google Fonts). If you ever add a CDN font,
  add the host to `font-src` in `vercel.json` and add `preconnect` in
  `index.html`.
- **Sentry / analytics**: when added, extend `connect-src` and
  `script-src` with the specific origins. Don't reach for wildcards.

## Known deviations from PROMPT

### Session storage (PROMPT §3.1)

PROMPT calls for httpOnly Secure SameSite=Lax cookies via Supabase SSR. The
current deployment is a static SPA on Vercel without an SSR layer, so
sessions live in `localStorage`. The CSP (`script-src 'self'` with no
`unsafe-inline`/`unsafe-eval`) is the primary mitigation — XSS is the only
realistic theft vector and we've removed the standard footguns.

To migrate fully:

1. Add a Vercel serverless API surface (`api/auth/*`) wrapping `@supabase/ssr`
   that sets `__Host-`-prefixed cookies.
2. Read the session from the cookie on each app boot via a route loader.
3. Move sign-in/out/refresh through that API.

Tracked as a follow-up; the SPA flow is functionally complete and hits every
other §3.1 requirement (≥ 12-char passwords, generic auth errors,
return-to validated relative-only, email verification required).

## Rollback

Vercel keeps every deployment. To roll back:

1. Vercel dashboard → Deployments → pick the last good build → **Promote to
   Production**.
2. If the bad deploy ran a Supabase migration that needs reverting, write a
   compensating migration **forward** — never edit history. `supabase db
   diff` against a known-good branch is the starting point.
