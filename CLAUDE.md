@AGENTS.md
@NAVIGATION.md

# car-coating — Claude Code project rules

Multi-tenant storefront + admin builder for KeePer PRO SHOP car-coating
stores. See `README.md` for the full architecture / stack overview and
`AGENTS.md` for the imported workflow rules.

## Commands

```bash
npm run dev            # Next.js dev server on http://localhost:8080
npm run build          # Production build (next build)
npm run start          # Serve production build
npm run lint           # ESLint
npx vitest run         # Unit tests (src/__tests__/**/*.test.ts)
npx playwright test    # E2E tests (tests/**/*.spec.ts)
```

There are no `test:*` shortcut scripts in `package.json` — invoke
`vitest` and `playwright` directly via `npx`.

## Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 16, App Router, React 19, TypeScript |
| Styling | Tailwind CSS 4 |
| Database | Firestore (NoSQL) via Firebase Admin SDK |
| Auth | Firebase Auth + session cookies (`__session`, 14-day) |
| Storage | Firebase Cloud Storage |
| Email | Nodemailer → Gmail SMTP |
| External APIs | Google Maps (client), Places (reviews), Calendar (booking) |
| Validation | Zod |
| Tests | Vitest (unit) + Playwright (e2e) |
| Deployment | Vercel (Fluid Compute, Node.js runtime) |

## Key directories

```
src/
  app/
    [slug]/             # Per-store public pages
    admin/              # Super-admin + store-admin dashboard
      builder/          # Drag-and-drop page editor
    api/
      admin/            # Super-admin / store-admin endpoints
      v3/               # V3 store CRUD
    blog/, estimate/, login/, page.tsx
  components/
    blocks/             # Page-builder blocks rendered on storefront
    admin/              # Admin UI
  lib/                  # Auth, sanitize, validations, firestore helpers
  modules/              # Domain modules
  proxy.ts              # Next.js 16 proxy (replaces middleware.ts)
  __tests__/            # Vitest unit tests
tests/                  # Playwright e2e specs
scripts/                # One-off maintenance / seed scripts
firestore.rules         # Firestore security rules
firestore.indexes.json  # Composite indexes
playwright.config.ts    # E2E config (testDir: ./tests, baseURL :8081)
vitest.config.ts        # Unit config (include: src/__tests__/**)
```

## Architecture notes

- **Auth surface is `src/lib/auth.ts` only.** Use
  `requireAuth(role?)` / `canManageStore(...)` at the top of any
  mutating handler. Never read session cookies or call
  `verifySession()` directly in new code.
- **Validation goes in `src/lib/validations.ts`.** Parse request bodies
  with Zod before use; extend the file when adding new write
  endpoints.
- **HTML / CSS authored by admins** (CustomHtmlBlock, BannersBlock)
  must be run through `sanitizeHtml()` / `sanitizeCss()` from
  `src/lib/sanitize.ts` and `src/lib/sanitize-css.ts`. Never render
  raw user-authored markup.
- **Email templates** must escape every interpolated user string —
  `esc()` for single-line, `escMultiline()` for multi-line — from
  `src/lib/email.ts`.
- **Rate limiting** is in-memory (`src/lib/rate-limit.ts`); not durable
  across instances. Don't rely on it for security-critical limits.
- **Routes:** public per-store pages live under `src/app/[slug]/`,
  admin under `src/app/admin/`, APIs under `src/app/api/`. The
  `src/proxy.ts` proxy gates `/admin/**`, `/api/admin/**`, and
  `/api/v3/**` by session cookie.
- **Error responses:** log full error server-side (`console.error`)
  and return a generic message to the client — never leak Firebase
  / stack traces.

## Environment variables

See `.env.example` for the canonical list. Required groups:

- `FIREBASE_*` — Admin SDK service account
- `NEXT_PUBLIC_FIREBASE_*` — client config
- `GMAIL_USER` / `GMAIL_APP_PASSWORD` — outbound email
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, `GOOGLE_PLACES_API_KEY`
- `NEXT_PUBLIC_SITE_URL` — canonical URL (used in emails, sitemap, OG)

Production secrets rotate via `vercel env`; local secrets via
`.env.local` (never committed).

---

## Engineering rules (apply to every change)

These rules apply to every change in this repo. The `feature-loop` skill
in `.claude/skills/feature-loop/` enforces them via a four-agent
feedback loop; even when working outside the loop, follow them.

### 1. No hardcoding (pragmatic)

Business and configuration values must come from configuration, not
literals in code:

- API keys, credentials, canonical URLs → env vars (`process.env.*`,
  `NEXT_PUBLIC_SITE_URL`)
- Per-store data → Firestore via `src/lib/firebase-stores.ts` and
  `src/lib/store-settings.ts`
- Global defaults → `src/lib/global-defaults.ts` /
  `global-defaults-shared.ts`
- Feature flags / role-gated behaviour → `src/lib/auth.ts` role checks
- Domain constants (Japan holidays, MIME types, etc.) → already
  centralised in `src/lib/{jp-holidays,mime,constants}.ts` — use them
- UI copy, labels, and layout strings are fine to inline
- Test fixtures inside test files are fine

If you need a new config value, add it to the appropriate module
(global defaults, store settings, env var) — do not sneak it in as a
literal in the consuming component.

### 2. No unauthorized architectural changes

Stay within the existing architecture. The following require an
explicit OK from the user **before** you make them:

- New top-level directory under `src/`
- New external dependency (`package.json` change beyond a version bump)
- Rewrite of sensitive modules:
  - `src/lib/auth.ts` (sole auth surface)
  - `src/lib/sanitize.ts` / `src/lib/sanitize-css.ts` (XSS / CSS-injection
    defence)
  - `src/lib/validations.ts` (Zod schemas)
  - `src/lib/email.ts` (escape helpers)
  - `src/lib/rate-limit.ts`
  - `src/proxy.ts` (route-level auth gate)
  - `firestore.rules` / `firestore.indexes.json`
- New auth strategy, session model, or role
- New deploy target / runtime
- Replacing an existing pattern with a different one (swapping Zod for
  another validator, replacing Nodemailer, etc.)

Stay-within examples (no consultation needed): adding a new block
component under `src/components/blocks/`, adding a new admin API
route that follows the existing `requireAuth` + Zod-parse handler
shape, adding a Firestore field with a backwards-compatible default,
adding a new V3 schema in `validations.ts`.

### 3. Testing — Playwright + Vitest

Every non-trivial change must be verified by all four of:

1. `npm run lint` — no new errors
2. `npm run build` — production build green (also acts as typecheck)
3. `npx vitest run` — unit tests green
4. `npx playwright test` — e2e green

If a change touches user-visible behaviour, add or update a Playwright
spec under `tests/` that asserts the new behaviour. Existing specs to
mirror as patterns: `tests/landing-page.spec.ts`,
`tests/store-pages.spec.ts`, `tests/inquiry-form.spec.ts`.

If a change touches pure logic (validators, formatters, sanitizers,
helpers), add or update a Vitest test under `src/__tests__/` instead
of (or in addition to) the e2e spec.

Pure internal refactors are exempt from #4 only when no existing spec
covers the touched code path — and in that case, say so explicitly
when reporting the change.

### 4. Security guardrails (specific to this repo)

These are not optional even for "small" changes:

- Every new mutating API handler MUST start with
  `const auth = await requireAuth('super_admin' | 'store_admin'); if (auth.error) return auth.error;`
  (or `requireAuth()` for any-authed endpoints).
- Every new request body MUST be parsed with a Zod schema from
  `src/lib/validations.ts` before use.
- Any user-authored HTML/CSS MUST go through `sanitizeHtml()` /
  `sanitizeCss()` before rendering.
- Any user string interpolated into an email body MUST be escaped via
  `esc()` / `escMultiline()`.
- Error responses returned to clients MUST NOT include raw Firebase
  errors, stack traces, or internal IDs.

### 5. "Done" definition

A task is done only when ALL of the following are true:

- [ ] `npm run lint` clean
- [ ] `npm run build` green
- [ ] `npx vitest run` green
- [ ] `npx playwright test` green
- [ ] No new hardcoded business / config values
- [ ] No unauthorized architectural changes
- [ ] No new top-level directories
- [ ] All security guardrails (§4) satisfied for any new handler /
      template / sanitizer surface
- [ ] Diff scope matches the task — no drive-by refactors
- [ ] Commit message follows the global format (subject + why +
      bulleted changes; no `Co-Authored-By` trailer)

### 6. The feature-loop skill

Non-trivial implementation work is run through a four-agent feedback
loop defined in `.claude/skills/feature-loop/`:

```
Planner ──► Generator ──► Evaluator/Fixer ──► Tester ──► done
   ▲                                                       │
   └──────────────── failure / kick-back ──────────────────┘
```

| Agent | Role | Writes? |
|---|---|---|
| `planner` | File-level plan, names rules at risk, calls out architectural and security questions | no |
| `generator` | Implements the plan with the smallest correct diff | yes |
| `evaluator` | Reviews diff against rules above; applies small fixes or kicks back | yes |
| `tester` | Runs lint + build + vitest + playwright, reports failures | no |

The loop runs in a git worktree under `.claude/worktrees/loop-<timestamp>/`
so a broken iteration never dirties the working tree. The loop stops
when **Tester is green AND Evaluator has no blocking findings**, or it
escalates to the user when **the same root-cause failure repeats 3
times** or **8 total iterations** elapse — whichever comes first.

Auto-trigger conditions are in the skill's `description` field; in
short: fires for multi-file features, non-trivial bug fixes, and
cross-file refactors. Skips for one-line edits, doc-only changes, and
questions.
