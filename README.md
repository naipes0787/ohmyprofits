# ohMyProfits

A production-grade React PWA for managing **Clients**, **Products**, and **Orders**. Built with the Kirken visual direction — bold editorial / contemporary craft, not generic SaaS dashboard.

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

Prerequisites: Node 20.18+, pnpm 9+, Docker Desktop, the [Supabase CLI](https://supabase.com/docs/guides/cli).

```bash
pnpm install
cp .env.example .env.local

# Boot the local Postgres + Auth + Storage stack via the Supabase CLI.
pnpm supabase:start

# Apply migrations and seed.
pnpm supabase:reset
pnpm supabase:seed

pnpm dev
```

`supabase start` prints the local anon key + service-role key + DB URL. Paste them into `.env.local`.

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

## What is NOT yet built

This commit covers **build-order steps 1–4**: bootstrap, schema, auth shell, and the design-system primitives in [src/shared/ui/](src/shared/ui/). Steps 5–10 (Clients, Products + Categories, Orders, PWA polish, E2E + axe + Lighthouse, production deploy) land in subsequent commits. Page stubs render as designed empty states so the shell can be reviewed visually right now.
