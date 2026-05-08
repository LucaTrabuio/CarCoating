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

**Worktree cleanup is mandatory.** As soon as the loop's changes have
been merged back into a real branch AND committed (i.e. the work is
captured outside the worktree), remove the worktree in the same turn —
do not wait for the user to ask. A `node_modules` install in the
worktree is ~4 GB; leaving stale ones behind silently fills the disk.
Use `git worktree remove .claude/worktrees/loop-<timestamp>` (add
`--force` if there are leftover untracked files that are already
captured in the merge commit). Do NOT run a destructive cleanup if
you're unsure the changes were captured — verify with `git log`
first, then remove.

A `PostToolUse` hook in `.claude/settings.json` runs
`.claude/hooks/cleanup-loop-worktrees.sh` after every `Bash` tool call.
The script no-ops unless the command was a `git commit`, then drops any
`loop-*` worktree that **(a)** carries a `.claude/.session-owner`
marker matching the current Claude Code session id AND **(b)** has a
HEAD that is now an ancestor of the current branch's HEAD — so the
disk reclaim happens automatically the moment the loop's work lands.

The session-ownership check is what makes concurrent sessions safe.
Without it, a fresh worktree's HEAD is trivially an ancestor of its
base commit, so any other session's commit on the parent repo would
mistakenly delete it. The feature-loop skill writes
`$worktree/.claude/.session-owner` containing `$CLAUDE_CODE_SESSION_ID`
when the worktree is created; the hook reads `session_id` from its
stdin payload (falling back to the env var) and only removes
worktrees whose marker matches. Worktrees without a marker (legacy
ones created before this hook learned about ownership) are left
alone — clean them up by hand once you're sure they're idle.

The hook is a safety net, not a substitute: still call
`git worktree remove` explicitly when the work is captured, because
the hook only watches `.claude/` if a settings file existed at session
start (a fresh `settings.json` won't fire in the session that creates
it).

Auto-trigger conditions are in the skill's `description` field; in
short: fires for multi-file features, non-trivial bug fixes, and
cross-file refactors. Skips for one-line edits, doc-only changes, and
questions.

### 7. Multi-agent patterns

The `feature-loop` skill is a local instantiation of an
**orchestrator-worker** (a.k.a. coordinator + specialists) pattern. The
project's CLAUDE-side coordination — main thread delegating to
`planner` / `generator` / `evaluator` / `tester` subagents under
`.claude/agents/` — uses Claude Code's local `Agent` tool, NOT
Anthropic's server-side Managed Agents Multiagent API
(`/v1/agents` with `agent_toolset_20260401` and the
`managed-agents-2026-04-01` beta header). They are different layers,
but the same three patterns apply and are the right way to think about
when (and how) to fan out:

- **Parallelization.** Independent reads / lookups / analyses with no
  ordering dependency should be sent in a single batch of `Agent` tool
  calls in one assistant turn. Examples that already fit: surveying
  several files for a bug repro, gathering "where does X live"
  answers across two unrelated subsystems (e.g. one in
  `src/app/[slug]/` and one in `src/app/admin/`), running an audit
  across separate domains. Do NOT parallelize tasks where one's output
  feeds another's input — that's sequential.
- **Specialization.** Reach for a domain-focused subagent rather than
  loading a generic one with extra context. The four feature-loop
  agents are deliberately narrow: Planner only reads, Generator only
  writes the smallest correct diff, Evaluator only checks rules,
  Tester only runs lint/build/Vitest/Playwright. Don't ask the
  Generator to also run the build — that confuses ownership and burns
  iterations. The project-aware `explore` subagent is another
  example: it starts from `NAVIGATION.md` instead of re-discovering
  the repo on every run. When a new recurring task fits a tight
  role, add a subagent under `.claude/agents/` rather than padding an
  existing one's prompt.
- **Escalation.** When a subtask exceeds a smaller model's reach,
  hand it to a more capable model rather than retrying the same
  cheaper one. In Claude Code today, that means picking a more
  capable `subagent_type` or invoking the agent with `model: "opus"`;
  in a future Managed Agents integration, that maps to having a
  Haiku-based reviewer escalate to an Opus-based investigator via
  the coordinator's roster.

Anti-patterns (skip multi-agent for these):

- One-shot edits or single-file diffs — the coordination overhead
  exceeds the work.
- Tasks that share state across steps so heavily that the agents
  spend more time syncing context than producing output. Threads
  have isolated context by design; if every step needs the previous
  step's full output, keep it on the main thread.
- Wiring a coordinator with > one level of delegation. Even
  Anthropic's Managed Agents API caps depth at 1 (the coordinator
  can only delegate to its declared roster, not to grand-child
  agents). Mirror that: don't have one local subagent spawn another.

Constraints worth remembering when scaling fan-out:

- Local `Agent` tool calls in a single assistant turn run in
  parallel; budget message-window context, since each subagent's
  output is inlined back. Prefer "report in under 200 words" prompts
  for survey-style work.
- Anthropic's Managed Agents API caps a session at 25 concurrent
  threads and a coordinator's roster at 20 unique agents (it can
  spawn multiple copies of each). If we ever build a server-side
  agentic feature into the product, those are the hard limits to
  design against.

When in doubt, fewer specialized agents beats one generalist with a
giant prompt — and a coordinator that spawns 3 narrow workers in
parallel is almost always faster, cheaper, and easier to debug than
one wide-context worker doing the same job sequentially.
