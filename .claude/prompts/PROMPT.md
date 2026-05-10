# ohMyProfits — Build Prompt

You are building **ohMyProfits**, a production-grade React PWA for young entrepreneurs and small-business owners to manage **Clients**, **Products**, and **Orders**. The app must run beautifully on both mobile and web from a single codebase, work offline-capable as an installable PWA, and be secured end-to-end.

This prompt is the single source of truth. Follow it to the letter. Do not invent extra scope; do not skip the constraints. Use both skills: frontend-design and react-best-practices for every implementation you need to do.

---

## 1. Product Scope

### 1.1 Three top-level sections (and only three)

1. **Clients**
2. **Products** (with Categories as a sub-concept)
3. **Orders**

A persistent navigation surface (bottom tab bar on mobile, sidebar on desktop ≥ md breakpoint) exposes these three. A fourth surface — **Account** — holds auth, profile, sign out, and currency/locale settings, but is not a primary section.

### 1.2 Domain model (authoritative)

> Fields marked **(internal)** are persisted but never rendered to the user.

#### Client
- `id` *(internal, uuid)*
- `created_at` *(internal, timestamp)*
- `name` — **required**, visible
- `description` — optional, visible (multiline)
- `email` — optional, visible (validated)
- `address` — optional, visible (multiline)
- `phone` — optional, visible (E.164-tolerant input)

#### Category
- `id` *(internal)*
- `name` — required
- `description` — optional
- Has many `Product`

#### Product
- `id` *(internal)*
- `name` — **required**, visible
- `category_id` — **required**, visible (selector backed by Category)
- `description` — optional, visible
- `base_price` — optional, visible (decimal, currency-aware)
- `cost_price` — optional, visible (decimal; never displayed publicly outside owner views)
- `stock` — optional, visible (integer ≥ 0)

#### Order
- `id` *(internal)*
- `order_number` — auto-generated, visible, format `ORD-YYYY-NNNNNN` (year + zero-padded autoincrement, scoped per user/tenant)
- `client_id` — **required**, visible (selector backed by Client)
- `items[]` — **required**, at least 1; each item:
  - `product_id` (required)
  - `quantity` (integer ≥ 1)
  - `unit_price` — **editable**, defaults to the product's `base_price`; user can raise or lower it per line
- `status` — required; one of `Pending | Confirmed | Processing | Delivered | Cancelled`
- `payment_status` — required; one of `Pending | Paid | Partial`
  - When `Partial`, an editable `pending_amount` field becomes visible and is required
- `subtotal` — **derived**, visible; `Σ(quantity × unit_price)`
- `discount_percent` — optional, visible (0–100); when present, the displayed total = `subtotal × (1 − discount/100)`
- `currency` — required, defaults to `$` (USD); user-changeable in Account
- `order_date` — required, defaults to today, editable
- `delivery_address` — optional, visible
- `notes` — optional, visible (multiline)

**Computed totals** must be derived during render (no `useEffect` to "sync" derived state) and displayed live as the user edits prices, quantities, or the discount.

### 1.3 Empty, loading, error, and offline states

Every list/detail screen must implement all four states deliberately — no spinners-only fallback, no blank pages. Empty states must include a clear call-to-action ("Add your first client", etc.). Offline state must show cached data with a non-intrusive "Offline" indicator.

---

## 2. Technical Stack & Architecture

### 2.1 Required stack

- **React 19** with **TypeScript** (strict mode, no `any` without justification).
- **Vite** as the bundler with the `vite-plugin-pwa` (Workbox) plugin for PWA + offline caching.
- **React Router v7** for routing (data router APIs, not legacy `<Switch>`).
- **TanStack Query (React Query) v5** for all server state. No ad-hoc `useEffect`-fetch patterns.
- **React Hook Form + Zod** for every form. Zod schemas are the single validation source, shared between client and server (Edge Functions).
- **Tailwind CSS v4** with a custom design token layer (see §4). Headless primitives via **Radix UI** wrapped in custom-styled components — do **not** import a generic component library that would dilute the brand.
- **Supabase** (Postgres + Auth + Row Level Security + Storage + Edge Functions) for production.
- **Local development**: Supabase CLI running the official Supabase Docker stack (`supabase start`). Connection strings come from `.env.local` and **never** from committed files.
- **PWA**: web app manifest, maskable icons, install prompt, offline shell, background sync for queued writes.
- Package manager: **pnpm**.
- Test runner: **Vitest** + **React Testing Library** for unit/integration; **Playwright** for one critical-path E2E (auth → create client → create product → create order → mark paid).

### 2.2 Folder structure (feature-sliced, not type-sliced)

```
src/
  app/              # router, providers, root layout, error boundaries
  features/
    auth/
    clients/
    products/
    categories/
    orders/
    account/
  shared/
    ui/             # design-system primitives (Button, Field, Sheet, etc.)
    lib/            # supabase client, query client, formatters, currency
    hooks/
    schemas/        # cross-feature Zod schemas
  styles/
  pwa/              # service worker registration, manifest assets
```

Each feature owns its routes, components, hooks, queries, and Zod schemas. Cross-feature imports go through `shared/`. No barrel `index.ts` files at feature roots — import paths must be explicit (`bundle-barrel-imports`).

### 2.3 React performance rules (apply, don't recite)

The codebase must conform to the Vercel React Best Practices skill. Highest-priority rules to honor in this app:

- **Eliminate waterfalls**: parallelize independent Supabase calls with `Promise.all`; in routes that need both clients and products, fetch them in parallel via React Query's `useQueries` or route-level loaders.
- **Bundle size**: use `React.lazy` + Suspense to code-split each top-level section. Heavy charts/PDF exporters (if added) load with dynamic imports. No barrel imports from `lucide-react`, `radix-ui`, etc.
- **Re-renders**: derive `subtotal` and `total` during render — never via `useEffect` setting state. Split combined `useState` when only one slice changes per interaction. Don't define components inside components. Use functional `setState` for stable callbacks. Use `startTransition` for filter/search updates over the lists.
- **Rendering**: use ternaries, not `&&`, for conditional renders that may produce stray `0`/`""`. Use `content-visibility: auto` on long client/product/order lists.
- **Hooks discipline**: prefer derived state; only use refs for transient values (e.g., debounced search input not driving render).
- **Service worker**: never share mutable module state across requests on the server side (Edge Functions / RSC if used).

### 2.4 State boundaries

- **Server state** → React Query, keyed by `[feature, id?]` and tenant.
- **Form state** → React Hook Form, never lifted into Redux/Context.
- **Ephemeral UI state** → local `useState` / `useReducer`.
- **Global UI state** (theme, currency, sidebar collapsed) → a single Zustand store, persisted to `localStorage` with a versioned schema (`client-localstorage-schema`).
- **No Context for data**. Context is for theming and auth identity only.

---

## 3. Authentication & Security (OWASP-aligned)

### 3.1 Auth

- Supabase Auth with email/password **and** magic link. Passwords enforced ≥ 12 chars, breach-checked via Supabase's built-in HIBP integration where available.
- Email verification required before write access.
- Sessions stored in httpOnly, Secure, SameSite=Lax cookies via Supabase SSR helpers — **not** in `localStorage`.
- All routes except `/login`, `/signup`, `/verify`, `/forgot` are gated by an auth boundary that redirects to login on missing session.
- Session refresh handled by Supabase client; failed refresh → silent sign-out → redirect to login with a return-to param (validated as relative path only).

### 3.2 Authorization (multi-tenant from day one)

Every domain table (`clients`, `products`, `categories`, `orders`, `order_items`) carries a non-null `owner_id` referencing `auth.users`. **Row Level Security is enabled on every table** with policies of the shape:

```sql
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid())
```

The client never sets `owner_id` directly; it is populated by a `BEFORE INSERT` trigger from `auth.uid()`. The `order_number` sequence is per-owner and per-year — generated server-side in a Postgres function inside a transaction, never on the client (prevents collisions and tampering).

### 3.3 OWASP Top 10 coverage (concrete, not vibes)

- **A01 Broken Access Control** — RLS on every table; no service-role key on the client; Edge Functions re-verify the JWT and re-check ownership.
- **A02 Cryptographic Failures** — TLS only; no secrets in the bundle; PII (email, phone, address) never logged; `cost_price` never returned by any unauthenticated query.
- **A03 Injection** — only the Supabase JS client and parameterized RPCs; no string-built SQL; user input rendered through React (no `dangerouslySetInnerHTML`).
- **A04 Insecure Design** — Zod validates every input on both client *and* server (Edge Functions); business invariants (quantity ≥ 1, discount 0–100, partial payment ≤ total) enforced as Postgres CHECK constraints.
- **A05 Security Misconfiguration** — strict **Content-Security-Policy** (`default-src 'self'`; `connect-src 'self' https://*.supabase.co`; no `unsafe-inline`/`unsafe-eval` — use nonces if needed), `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` minimized, HSTS preload-ready.
- **A06 Vulnerable Components** — `pnpm audit` in CI; Dependabot/Renovate enabled; pinned major versions.
- **A07 Identification & Auth Failures** — rate limit login + magic-link via Supabase; lockout messaging that doesn't enumerate accounts.
- **A08 Software & Data Integrity Failures** — Subresource Integrity for any third-party script; verify Supabase project ref at build time; sign Edge Function deployments via Supabase CLI.
- **A09 Logging & Monitoring** — structured server logs in Edge Functions; client errors → Sentry (or equivalent) with PII scrubbing; never log full email/phone — only hashed user id.
- **A10 SSRF** — no user-supplied URLs are fetched server-side anywhere.

### 3.4 Other security must-haves

- CSRF: Supabase cookie auth + same-origin checks on Edge Functions; mutating Edge Functions require an `Origin` header allow-list.
- Input length caps in Zod (e.g., `name` ≤ 120, `notes` ≤ 2000) to bound storage and rendering cost.
- Currency and decimal math via a fixed-point helper (`Decimal.js` or integer-cents). **Never** add `unit_price * quantity` with floats and ship it.
- File uploads (if added later for client logos) must validate MIME via magic bytes server-side and store in a private Supabase bucket with signed URLs.

---

## 4. Visual Design — "Kirken" Direction

This app's first user is **Kirken**, a craft brewery. Their visual identity sets the house style for ohMyProfits. Study the reference images carefully and design **with intention**, not by approximation.

### 4.1 Aesthetic point-of-view

**Bold editorial / contemporary craft.** Think independent magazine meets industrial signage. Confident, slightly raw, never corporate. Generous negative space punctuated by oversized typographic moments and saturated color blocks. The interface should feel *designed*, not assembled.

This is **not** a generic SaaS dashboard. No timid grays-on-white. No rounded-everything pastel cards. No Inter, no Roboto.

### 4.2 Color system

Two coordinated palettes — light and dark — derived from Kirken's brand. Implement as CSS custom properties; Tailwind v4 reads from them.

**Light theme**
- `--bg`: `#F2EFE9` (warm off-white, the Kirken disc background)
- `--surface`: `#FFFFFF`
- `--ink`: `#0B0B0C` (near-black for type — high contrast, never pure black)
- `--ink-muted`: `#5A5A5E`
- `--accent`: `#E5601F` (Kirken orange — primary actions, brand moments)
- `--accent-2`: `#1F5FBF` (Kirken blue — secondary, info, links)
- `--positive`: `#2F7A3E` (paid, delivered)
- `--warning`: `#E0A21A` (mustard, partial payment)
- `--danger`: `#B0331C` (cancel, destructive)
- `--lavender`: `#C9B8E0` (decorative, illustrative panels only)

**Dark theme**
- `--bg`: `#0B0B0C`
- `--surface`: `#141416`
- `--ink`: `#F2EFE9`
- `--ink-muted`: `#9A9A9E`
- Accents stay saturated; raise luminance ~6% for AA contrast.

**Usage rule**: dominant neutral, single sharp accent per screen. The orange and blue are **rare and deliberate** — primary CTA, status emphasis, brand chrome. Never both screaming on the same view.

### 4.3 Typography

- **Display / headings**: a condensed, high-impact sans — **Archivo Black**, **Anton**, or **Space Mono**'s display sibling **Bagnard**. The Kirken wordmark is condensed and assertive; match that energy. Default pick: **Archivo** at extreme weights (Black 900 for h1/h2, Regular for h3).
- **Body**: a refined humanist sans — **Söhne**, **Inter Tight**, or **General Sans**. Default pick: **General Sans** (open-source, distinctive).
- **Numerics** (prices, totals, order numbers): **JetBrains Mono** or **IBM Plex Mono** with `font-feature-settings: "tnum"` so columns of money align perfectly.
- Use real type scale (1.250 minor third on mobile, 1.333 perfect fourth on desktop). Heading sizes range from 14px label up to 56px+ on hero/empty-state moments.
- Headlines may wrap intentionally and break the grid (à la the Kirken can artwork). Allow `text-wrap: balance` on h1/h2.

### 4.4 Layout & composition

- **Mobile-first** down to 360px. Single column, bottom tab bar, full-bleed cards.
- **Desktop** ≥ 1024px: 12-column grid with a fixed 240px sidebar. Use asymmetric layouts on Order detail (line items left, totals card pinned right with a slightly off-axis offset).
- Generous gutters at desktop (≥ 32px). Avoid the "everything in a card" trap — use horizontal rules, color blocks, and whitespace to separate.
- One hero typographic moment per top-level page (e.g., "CLIENTS" set huge in Archivo Black across the header, partially clipped by the content below — echoing the way "KIRKEN" sits on the cans).

### 4.5 Components — design intent

- **Buttons**: rectangular, subtle 2px corner radius (or 0 for primary), no gradients. Primary = solid orange on ink; secondary = ink outline; ghost = no border, underline on hover. Press state = slight inset shadow, no scale animation.
- **Inputs**: low-chrome — bottom border only on mobile, full bordered on desktop. Focus ring uses `--accent-2`. Error state shifts the bottom border to `--danger` and surfaces a single-line message.
- **Status pills** (order status, payment status): all-caps mono, 10px, 1px solid border in the status color, transparent fill. They look like brewery batch stamps, not Bootstrap badges.
- **Cards / list rows**: rely on type hierarchy and a thin top border, not boxy shadows. On hover (desktop), background shifts to a tinted neutral; on mobile, tap-down state inverts ink/bg briefly.
- **Empty states**: oversized condensed headline + one sentence + a single primary CTA. Optionally a single decorative chevron mark echoing the Kirken arrow glyph.
- **Modals → Sheets**: on mobile, all modals are bottom sheets with a drag handle. On desktop, side drawers from the right for create/edit; centered modal only for destructive confirmation.

### 4.6 Motion

- Use **Motion** (formerly Framer Motion) sparingly. One orchestrated entry per route (staggered reveal of header + content) at 200–280ms with `cubic-bezier(0.2, 0.8, 0.2, 1)`. Honor `prefers-reduced-motion` — replace with crossfades only.
- Hovers: 120ms color/border transitions. No scale-on-hover. No bouncy springs.
- Number changes (subtotal updating live as quantities change) animate via a brief tick using `useDeferredValue` on the displayed value.

### 4.7 Iconography & marks

- Icons: **Lucide** stroke set at 1.5px stroke. Don't bulk-import; tree-shake per icon.
- Brand glyph: render the chevron/arrow mark from the Kirken wordmark as an inline SVG component used as the favicon, PWA icon, and a quiet brand presence in the auth screens and empty states.

### 4.8 Accessibility (non-negotiable)

- WCAG 2.2 AA across both themes. Test with axe in CI.
- Min 4.5:1 contrast for body, 3:1 for large display text.
- Focus visible on every interactive element; logical tab order; skip-to-content link.
- All forms label-associated; errors announced via `aria-live="polite"`.
- 44×44px minimum tap target on mobile.
- Respect `prefers-reduced-motion` and `prefers-color-scheme`.
- Currency and dates formatted with `Intl` using the user's locale; screen-reader-friendly numeric strings on totals.

---

## 5. PWA & Offline Behavior

- App-shell strategy: pre-cache the shell, runtime-cache Supabase REST GETs with a stale-while-revalidate policy keyed on user id.
- Writes while offline are queued via Background Sync (Workbox `BackgroundSyncPlugin`) and replayed in order when online; conflicts surface a non-blocking banner.
- Install prompt deferred until the user has created at least one client (avoid the desperate first-visit prompt).
- Manifest: name `ohMyProfits`, short_name `ohMyProfits`, theme color `#0B0B0C`, background `#F2EFE9`, display `standalone`, orientation `any`, maskable icons at 192/512.
- Service worker version is tied to build hash; an update toast prompts reload — never auto-reloads mid-edit.

---

## 6. Definition of Done

A feature is done only when **all** of these are true:

- [ ] Type-checks under `tsc --noEmit` with strict on.
- [ ] Lints clean (`eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-jsx-a11y`).
- [ ] Zod schema covers every input field; same schema runs on the Edge Function.
- [ ] RLS policy exists and is tested (a second user cannot read/write the row).
- [ ] All four UI states implemented (loading, empty, error, offline).
- [ ] Mobile (360px) and desktop (≥ 1280px) both verified visually.
- [ ] Light and dark themes both verified.
- [ ] Keyboard-only walkthrough succeeds; axe reports 0 critical issues.
- [ ] No `any`, no `@ts-ignore`, no `useEffect` doing data fetching, no derived state stored in `useState`.
- [ ] Bundle impact reviewed; new heavy deps justified or dynamically imported.

---

## 7. What NOT to do

- Do **not** use a generic component kit (Material UI, Chakra, shadcn-default-look). Build the design system on Radix primitives styled to the Kirken direction.
- Do **not** put `owner_id` filters in client code as a security boundary — RLS is the boundary; client filters are convenience only.
- Do **not** store the Supabase service role key anywhere reachable by the browser bundle.
- Do **not** compute `order_number` on the client.
- Do **not** float-multiply money.
- Do **not** ship without RLS enabled on every table.
- Do **not** add features beyond this prompt without explicit approval — no analytics dashboards, no AI suggestions, no Stripe yet, no multi-currency conversion. Ship the core loop first.

---

## 8. Build order

1. Repo bootstrap: Vite + React 19 + TS strict + Tailwind v4 + Radix + Lucide + Motion. Configure path aliases. Set up Vitest, Playwright, Husky pre-commit (lint + typecheck).
2. Supabase: `supabase init`, schema migrations for all five tables + RLS policies + `order_number` Postgres function + triggers. Local Docker stack + seed script.
3. Auth shell: login, signup, magic-link, verify, forgot — wired to Supabase SSR cookies; protected route boundary.
4. Design system primitives in `shared/ui` — typography, Button, Field, Select, Sheet, Pill, EmptyState. Storybook optional but recommended.
5. Clients feature — list, create, edit, delete (soft-delete preferred), search, sort.
6. Categories + Products feature — categories CRUD inline; product list grouped by category with collapsible sections.
7. Orders feature — list, create with multi-line item editor, edit, status transitions, partial-payment editor, derived totals, `ORD-YYYY-NNNNNN` display.
8. PWA polish — manifest, icons from the chevron mark, offline shell, background-sync writes, install prompt.
9. E2E happy-path Playwright run; axe sweep; Lighthouse (target: PWA installable, Performance ≥ 90 on mobile, A11y 100).
10. Production deploy: Supabase project + hosting (Vercel/Netlify) with the CSP and security headers from §3.3 set at the edge.

---

Build this with the conviction of a small studio shipping its flagship product, not a template. Make every screen something Kirken would be proud to hand a customer.
