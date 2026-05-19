# TODO

Open follow-ups that aren't urgent enough to block other work but
should be revisited.

## Keeper PRO SHOP webhook integration (store data sync) — tomorrow 2026-05-20

- **Status**: API key issued 2026-05-19, stored locally in
  `.env.local` as `KEEPER_API_KEY_ID` / `KEEPER_API_SECRET`
  (gitignored). Placeholders added to `.env.example`. Key expires
  **2027-05-19**. Scopes: `surveys:read`, `files:read`.
- **Security note**: the SECRET was pasted into a Claude chat
  transcript on 2026-05-19, so it lives in Anthropic's session
  history. If that is outside the acceptable risk envelope,
  rotate the key from the Keeper console before tomorrow's
  build and update `.env.local` + Vercel env vars to match.
- **What we don't know yet (grill these before coding)**:
  1. Webhook delivery mode — is Keeper pushing to us, or are we
     polling Keeper? (Spec from Keeper docs or their integration
     team needed.)
  2. If push: what is the signature scheme? HMAC-SHA256 with the
     SECRET over the raw body, or JWT-bearer, or something else?
  3. If pull: what is the auth header format and rate-limit
     shape?
  4. Payload schema — which Firestore collections / fields get
     updated? Stores? Surveys (new collection)? Files / images?
  5. Conflict / overwrite policy — does Keeper data overwrite
     admin edits, or merge by field, or vice versa?
  6. Retry semantics on our side — does this need durable
     execution (Vercel Workflow DevKit) or is a plain Next.js
     route handler with idempotent writes enough? Likely the
     latter unless Keeper has long-running processing steps.
- **Likely shape of the work** (subject to revision after the
  grill):
  1. `/api/webhooks/keeper/route.ts` — POST receiver, signature
     verification, body parse via a new Zod schema in
     `src/lib/validations.ts`.
  2. `src/lib/keeper-sync.ts` — maps Keeper payload → Firestore
     writes. Idempotent (upsert by Keeper-side ID).
  3. `recordAlert` instrumentation on every parse / signature /
     write failure (`source: 'keeper-webhook'`).
  4. Optional admin page `/admin/keeper-sync/` showing recent
     deliveries + status (only if Keeper retry logic is opaque
     enough to need a UI; otherwise rely on the alerts dashboard
     for visibility).
  5. Playwright spec posting a signed fake payload and asserting
     the resulting Firestore state.
- **Commit plan**: ship this TODO + `.env.example` placeholder +
  the actual implementation together in one commit tomorrow —
  the TODO turns into the commit's *Why* section.

## Verify storefront お知らせ banner shows full content

- **Symptom**: after enabling `getLatestNewsTitle()` to return
  `${title} — ${content}` in `src/app/[slug]/layout.tsx`, the live
  storefront marquee was reportedly still rendering just the title
  ("お知らせ ｜ テスト") with no body text appended.
- **Suspected cause**: stale ISR cache. `src/app/[slug]/layout.tsx`
  has `export const revalidate = 60`, and the page may have been
  inspected before either the 60s window elapsed or the builder's
  save-time `/api/admin/revalidate` POST landed.
- **What to verify next time**:
  1. Edit a news item in the builder, press 保存, wait for the
     success toast (this triggers the revalidate ping).
  2. Hard-refresh the storefront (Cmd+Shift+R) — the banner should
     read `お知らせ ｜ {title} — {content}`.
  3. If it still shows only the title, view-source the page and
     confirm the rendered text. If the HTML really has no content,
     `getLatestNewsTitle` is being bypassed somewhere — re-check
     `src/app/[slug]/layout.tsx:99` and `:146` (sub-company
     branch) and grep for any other `DynamicBanner` callers.
  4. Note: legacy news items with `body` instead of `content` are
     covered by the fallback in `getLatestNewsTitle`
     (`db67190`).
