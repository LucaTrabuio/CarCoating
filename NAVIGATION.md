# Navigation map — car-coating

> Read this first when you need to find something. The `explore` subagent
> uses this as its starting point. Update it when you add a new feature
> area or move a shared module — not for every commit.

## One-paragraph mental model

Multi-tenant storefront + admin builder for KeePer PRO SHOP coating
stores. Each store has a `slug` and lives at `/<slug>`. Public pages
under `src/app/[slug]/**`, admin under `src/app/admin/**`, APIs under
`src/app/api/**`. Auth is session-cookie based with two roles
(`super_admin` / `store_admin`); every mutating handler MUST start
with `requireAuth(...)` from `src/lib/auth.ts` and parse its body
through a Zod schema in `src/lib/validations.ts`. The page builder
(`src/app/admin/builder/`) lets admins compose pages from blocks
under `src/components/blocks/**`; user-authored HTML/CSS in
`CustomHtmlBlock` / `BannersBlock` MUST go through `sanitizeHtml` /
`sanitizeCss` from `src/lib/sanitize{,-css}.ts`.

## Feature → entry points

| Feature | Public route | Admin entry | API | Core lib |
|---|---|---|---|---|
| Storefront (per-store) | `src/app/[slug]/page.tsx` | `src/app/admin/stores/`, `src/app/admin/builder/` | `src/app/api/v3/` | `src/lib/firebase-stores.ts`, `src/lib/store-settings.ts` |
| Sub-pages (access, coatings, price, options, …) | `src/app/[slug]/{access,coatings,price,options,booking,inquiry,reviews,cases,guide,news,privacy}/` | (managed in builder) | — | (block configs in store doc) |
| Sub-store hierarchy | `src/app/[slug]/[subSlug]/` | `src/app/admin/hierarchy/` | `src/app/api/v3/` | `src/lib/firebase-stores.ts` |
| Page builder (blocks) | (rendered on storefront) | `src/app/admin/builder/` | `src/app/api/v3/` | `src/lib/block-types.ts`, `src/components/blocks/BlockRenderer.tsx` |
| Banners / promo banners | (homepage section) | `src/app/admin/banners/` | `src/app/api/admin/...` | `src/lib/banner-presets.ts`, `src/lib/banner-template.ts` |
| Reservations / booking | `src/app/[slug]/booking/` | `src/app/admin/bookings/` | `src/app/api/reservation/`, `src/app/api/slots/`, `src/app/api/cancel/` | `src/lib/reservations.ts`, `src/lib/slots.ts`, `src/lib/reservation-types.ts` |
| Inquiries (contact) | `src/app/[slug]/inquiry/` | `src/app/admin/inquiries/` | `src/app/api/inquiry/`, `src/app/api/inquiries/[token]/` | (validated via `src/lib/validations.ts`) |
| Cases (gallery) | `src/app/[slug]/cases/` | `src/app/admin/cases/` | — | `src/lib/csv-import.ts` (for bulk import) |
| Blog | `src/app/blog/` | `src/app/admin/blog/` | `src/app/api/blog/` | (Firestore direct) |
| News | `src/app/[slug]/news/` | `src/app/admin/news/` | — | (in store doc) |
| Reviews (Google Places) | (storefront section) | — | `src/app/api/reviews/` | (Places API) |
| Auth (login + session) | `src/app/login/` | — | `src/app/api/auth/session/`, `src/app/api/auth/users/` | `src/lib/auth.ts`, `src/lib/firebase-admin.ts`, `src/lib/firebase-client.ts` |
| Estimate flow | `src/app/estimate/` | — | `src/app/api/inquiry/` | (form → inquiry handler) |
| Tracking (email open / click) | — | — | `src/app/api/track/` | `src/lib/audit.ts` |
| Support tickets | — | `src/app/admin/tickets/` | `src/app/api/admin/tickets/` | `src/modules/support-tickets/` |
| Imports (CSV / ZIP) | — | `src/app/admin/imports/` | (admin endpoints) | `src/lib/csv-import.ts`, `src/lib/zip-import.ts`, `src/lib/import-backups.ts` |
| KPI dashboards | — | `src/app/admin/kpi/` | (admin endpoints) | (Firestore direct) |
| Diagnostics | — | `src/app/admin/diagnostics/` | — | — |
| Email (transactional) | — | — | (used by reservation, inquiry, cancel) | `src/lib/email.ts` (`esc`, `escMultiline` required) |
| Calendar (Google) | — | (booking flow) | `src/app/api/reservation/` | `src/lib/google-calendar.ts` |
| Page-level proxy / auth gate | — | — | (all `/admin/**`, `/api/admin/**`, `/api/v3/**`) | `src/proxy.ts` |

## Where settings live

```
Firestore
├── Stores collection                 ← per-store doc with blocks, theme, hours, etc.
├── globalDefaults doc                ← site-wide defaults shared across stores
├── inquiries / reservations / etc.   ← per-store user submissions
└── kpi / tickets                     ← admin-side ops collections
```

Per-store reads typically go through `src/lib/firebase-stores.ts` and
`src/lib/store-settings.ts`. Global defaults are split between
`src/lib/global-defaults.ts` (server) and
`src/lib/global-defaults-shared.ts` (importable from client).

## Sensitive modules (consult before changing — see CLAUDE.md §2)

- `src/lib/auth.ts` — sole auth surface (`requireAuth`, `canManageStore`)
- `src/lib/sanitize.ts` — HTML sanitizer for `CustomHtmlBlock`,
  `BannersBlock`
- `src/lib/sanitize-css.ts` — CSS sanitizer for inline styles in
  admin-authored content
- `src/lib/validations.ts` — Zod schemas for V3 store + campaign
  payloads
- `src/lib/email.ts` — `esc()` / `escMultiline()` escape helpers
- `src/lib/rate-limit.ts` — in-memory rate limiter
- `src/proxy.ts` — Next.js 16 proxy (replaces middleware); gates
  `/admin/**`, `/api/admin/**`, `/api/v3/**`
- `firestore.rules` — Firestore security rules
- `firestore.indexes.json` — composite indexes

## Common task → which files

- **Add a new mutating API endpoint** → drop a `route.ts` under
  `src/app/api/<area>/`. Start with
  `const auth = await requireAuth('super_admin'); if (auth.error) return auth.error;`
  Add a Zod schema in `src/lib/validations.ts` and parse the body
  before use. Mirror an existing handler under
  `src/app/api/admin/**` or `src/app/api/v3/**`.
- **Add a new page-builder block** → create the component under
  `src/components/blocks/`, register the type in
  `src/lib/block-types.ts`, render it in
  `src/components/blocks/BlockRenderer.tsx`. If block content is
  user-authored HTML/CSS, run it through `sanitizeHtml()` /
  `sanitizeCss()` BEFORE rendering.
- **Add a new admin page** → create under `src/app/admin/<area>/`.
  Auth is enforced by `src/proxy.ts`; you don't re-check in the page.
  Use existing admin layout / shell patterns.
- **Add a new sub-route on the storefront** → create under
  `src/app/[slug]/<route>/`. For sub-store pages, use
  `src/app/[slug]/[subSlug]/`.
- **Add an email template** → mirror an existing one. Every
  interpolation of user input MUST use `esc(value)` (single line) or
  `escMultiline(value)` (preserves newlines) from `src/lib/email.ts`.

## Where NOT to look

- `scripts/` — one-off maintenance / seed scripts; many are archived
  one-shots (`fix-*`, `update-*`, `seed-*`).
- `downloaded-case-images/` — assets only.
- `site-comparison.csv` — a doc artefact, not code.
- `test-results/` — Playwright run output, gitignored.
