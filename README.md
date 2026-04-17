# car-coating

Multi-tenant storefront + admin builder for KeePer PRO SHOP car-coating stores. Customers browse per-store pages (`/[slug]`), book appointments, and request estimates; super admins and store admins manage content through a drag-and-drop page builder.

## Stack

- **Next.js 16** (App Router, React 19)
- **TypeScript**
- **Tailwind CSS 4**
- **Firebase** — Auth (session cookies), Firestore (stores, reservations, inquiries, blog, KPI, tickets), Firebase Storage (image hosting), Firebase Admin SDK
- **Google APIs** — Maps (client), Places (reviews), Calendar (booking events)
- **Nodemailer + Gmail** — transactional email
- **Zod** — request validation
- **Playwright + Vitest** — tests

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in Firebase, Gmail, Maps keys
npm run dev                  # http://localhost:8080
```

Tests:

```bash
npx vitest           # unit tests
npx playwright test  # e2e
```

## Environment variables

See `.env.example` for the full list. Required groups:

- `FIREBASE_*` — Admin SDK service account
- `NEXT_PUBLIC_FIREBASE_*` — client config (includes `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` for image hosting)
- `GMAIL_USER` / `GMAIL_APP_PASSWORD` — outbound email
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` / `GOOGLE_PLACES_API_KEY`
- `NEXT_PUBLIC_SITE_URL` — canonical URL (emails, sitemap, OG)

## Architecture

- **`src/app/`** — App Router routes. Per-store pages at `/[slug]/**`. Admin dashboard at `/admin/**`. API routes at `/api/**`.
- **`src/app/api/admin/**`** — super-admin / store-admin endpoints. All gated via `requireAuth()` from `src/lib/auth.ts`.
- **`src/app/api/v3/**`** — V3 store CRUD (super-admin only for writes).
- **`src/proxy.ts`** — Next.js 16 proxy (replaces `middleware.ts`). Gates `/admin/**`, `/api/admin/**`, `/api/v3/**` by session cookie.
- **`src/lib/auth.ts`** — `verifySession`, `requireAuth(role?)`, `canManageStore`. Sole auth surface.
- **`src/lib/validations.ts`** — Zod schemas for V3 store + campaign payloads. Extend when adding new write endpoints.
- **`src/lib/sanitize.ts`** — server-side HTML/CSS sanitizer for admin-authored block content (`CustomHtmlBlock`, `BannersBlock`).
- **`src/lib/rate-limit.ts`** — in-memory rate limiter. Swap for Upstash for durable/horizontal protection.
- **`src/lib/email.ts`** — every inbound user string MUST be run through `esc()` / `escMultiline()` before interpolation.
- **`src/components/blocks/`** — rendered page-builder blocks.
- **`src/app/admin/builder/`** — drag-and-drop page editor.
- **`firestore.rules`** — Firestore security rules. Deploy via `firebase deploy --only firestore:rules`.
- **`firestore.indexes.json`** — composite indexes. Deploy via `firebase deploy --only firestore:indexes` (see Deploying below).

## Conventions

- **Auth on API routes:** `const auth = await requireAuth('super_admin'); if (auth.error) return auth.error;` at the top of any mutating handler. Never check `verifySession()` directly in new code.
- **Validation:** parse request bodies with Zod before use. Add schemas to `src/lib/validations.ts`.
- **Error responses:** log full error server-side (`console.error`) and return a generic message to the client — never leak Firebase / stack traces.
- **HTML interpolation in email:** always `esc(value)` for single-line strings, `escMultiline(value)` when preserving newlines.
- **User-authored HTML/CSS:** never render raw. Run through `sanitizeHtml()` / `sanitizeCss()`.
- **Tailwind focus styles:** use `focus-visible:ring-*` — never `focus:outline-none` without a visible replacement.

## Scripts (`scripts/`)

One-off maintenance and seed scripts. Run via:

```bash
npx tsx --env-file=.env.local scripts/<name>.ts
```

Ongoing utilities: `check-*.ts`, `test-storage.ts`, `list-all-stores.ts`, `geocode-stores.ts`. Migration scripts (fix-*, update-*, seed-*) are one-shots — archive after use.

## Deploying

- **App:** deployed to Vercel. `npm run build` runs `next build`. Functions default to Node.js runtime (Fluid Compute).
- **Firestore rules & indexes:** use Firebase CLI:
  ```bash
  firebase deploy --only firestore:rules
  firebase deploy --only firestore:indexes
  ```
- Rotate secrets via `vercel env` (production) and `.env.local` (local). Never commit `.env.local` or `firebase-service-account.json`.

## Security model

- Session cookies (`__session`, 14-day, httpOnly, secure, sameSite=lax) created via `/api/auth/session` from Firebase ID tokens.
- `super_admin`: full access. `store_admin`: only their `managed_stores`.
- Firestore rules enforce the same split; however writes to sensitive collections (inquiries, kpi) go through server routes using the Admin SDK.
- See audit history in team docs for known-risk surfaces and mitigation status.
