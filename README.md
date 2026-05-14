# ohMyProfits

A production-grade React PWA for managing **Clients**, **Products**, and **Orders**. Bold editorial / contemporary craft design — not a generic SaaS dashboard.

> See [`PROMPT.md`](./PROMPT.md) for the full specification. That document is the single source of truth for scope, design intent, and security posture.

## Stack

- **React 19** + **TypeScript** strict
- **Vite 6** + **vite-plugin-pwa** (Workbox)
- **React Router v7** (data router APIs)
- **TanStack Query v5** for all server state
- **React Hook Form** + **Zod** for forms (shared client/server schemas)
- **Tailwind CSS v4** with custom design tokens
- **Radix UI** primitives wrapped in custom-styled components
- **Lucide** icons (per-icon imports only)
- **Motion** for orchestrated route entries
- **Supabase** (Postgres + Auth + RLS + Edge Functions + Storage)
- **Decimal.js** for money math — never float-multiply currency
- **pnpm** as the package manager

## Local development

**Prerequisites:** Node 20.18+, pnpm 9+, Docker Desktop running.

The Supabase CLI is a local dev dependency — no global install needed.

```bash
pnpm install
cp .env.example .env.local
```

Boot the local Postgres + Auth + Storage stack:

```bash
pnpm supabase:start
```

`supabase start` prints the local **anon key** and **service-role key**. Paste them into `.env.local`:

```
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<anon key from supabase start>
SUPABASE_SERVICE_ROLE_KEY=<service-role key from supabase start>
SUPABASE_DB_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
```

Apply migrations, then seed demo data:

```bash
pnpm supabase:reset
pnpm supabase:seed
```

Start the dev server:

```bash
pnpm dev   # http://localhost:5173
```

Demo login after seeding: `kirken@ohmyprofits.local` / `kirken-demo-passphrase-2026`

### Troubleshooting

**`supabase db reset` fails with 502** — the bundled CLI version has a known container-restart bug. Update it:

```bash
pnpm add -D supabase@latest
```

Then retry `pnpm supabase:reset`.

**`Insert failed on clients: name resolution failed`** — migrations haven't been applied yet. Run `pnpm supabase:reset` before `pnpm supabase:seed`.

**Port 5173 or 54321 already in use** — another process is holding the port. Find and stop it, or restart Docker Desktop.

## Scripts

| Script | Purpose |
| --- | --- |
| `pnpm dev` | Vite dev server on `:5173`. |
| `pnpm build` | TS project references build, then Vite production build. |
| `pnpm preview` | Serve the production build on `:4173`. |
| `pnpm typecheck` | `tsc --noEmit` across all references. |
| `pnpm lint` | ESLint with zero warnings allowed. |
| `pnpm test` | Vitest single run. |
| `pnpm test:watch` | Vitest watch mode. |
| `pnpm test:e2e` | Playwright (chromium + Pixel 7). |
| `pnpm supabase:start` | Boot the local Supabase Docker stack. |
| `pnpm supabase:reset` | Re-apply all migrations against the local stack. |
| `pnpm supabase:seed` | Reset + run the TypeScript seed. |

## Project layout

```
src/
  app/              # router, providers, root layout, error boundaries
  features/
    auth/           clients/  products/  categories/  orders/  account/
  shared/
    ui/             # design-system primitives (BrandMark, EmptyState, …)
    lib/            # supabase client, env validator, money helper, query keys
    hooks/          # use-ui-store and other shared hooks
    schemas/        # cross-feature Zod schemas
  styles/           # tokens.css + main.css (Tailwind v4 @theme)
  pwa/              # service-worker registration helpers
supabase/
  migrations/       # SQL migrations (RLS, triggers, order_number function)
  seed.ts           # local seed
tests/e2e/          # Playwright critical-path
```

## Auth

Six routes power the auth shell, all under [`src/features/auth`](src/features/auth):

| Route | Purpose |
| --- | --- |
| `/login` | Email + password sign-in. Generic error message — no account enumeration (PROMPT §3.3 A07). |
| `/signup` | Email + password + display name. Email verification required before sign-in. |
| `/magic-link` | One-time email sign-in. |
| `/forgot` → `/verify?type=recovery` → `/reset` | Password recovery flow. |
| `/verify` | Lands users from email links. Supports both PKCE (`?code=…`) and token-hash (`?token_hash=…&type=…`) flows. |

The `ProtectedRoute` boundary at [src/features/auth/ProtectedRoute.tsx](src/features/auth/ProtectedRoute.tsx) wraps everything except the six auth routes. Unauthenticated users are bounced to `/login?next=<safe-relative-path>`. The `next` param is validated as a relative path only — see [`isSafeReturnTo`](src/features/auth/return-to.ts).

### ⚠ Session storage deviation from PROMPT §3.1

PROMPT §3.1 calls for **httpOnly Secure SameSite=Lax cookies via Supabase SSR helpers**. This deployment is a static SPA on Vercel without an SSR layer — there's no server-side render path that can read/write those cookies. So sessions currently live in `localStorage` via the Supabase JS default storage.

Trade-off: localStorage is reachable from any successful XSS, but our CSP (`script-src 'self'`, no `unsafe-inline`, no `unsafe-eval`) is the primary mitigation. To close the gap fully:

1. Add a Vercel serverless API surface (`api/auth/*`) that wraps `@supabase/ssr` and sets `__Host-`-prefixed cookies.
2. Read the session from the cookie on each app boot using a thin loader.
3. Move sign-in/out/refresh through that API.

That work is tracked as a future migration; the SPA flow is functionally complete and matches every other §3.1 requirement (≥ 12-char passwords, generic auth errors, return-to validated relative-only, email verification required).

## Security baseline

Captured in [`vercel.json`](vercel.json) (CSP + HSTS + frame-ancestors none + Permissions-Policy minimized). Every Postgres table has Row Level Security enabled with `owner_id = auth.uid()` policies. The `owner_id` is set by a `BEFORE INSERT` trigger from `auth.uid()` — clients never write it. Order numbers are generated server-side per-owner per-year.

## Production deploy

See [`docs/DEPLOY.md`](docs/DEPLOY.md) for the runbook (Supabase project provisioning, Vercel env config, post-deploy verification, CSP debug, rollback). [`docs/LIGHTHOUSE.md`](docs/LIGHTHOUSE.md) covers manual Lighthouse runs against the production preview.
