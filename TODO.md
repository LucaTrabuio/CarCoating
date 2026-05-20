# TODO

Open follow-ups that aren't urgent enough to block other work but
should be revisited.

## DONE 2026-05-20 — Keeper (Meets-SPI) survey API integration

Shipped. Turned out to be a **pull** model (read-scoped key), not a
push webhook. Implemented as an HMAC-SHA256 signed client +
nightly/manual sync + Firebase Storage file mirroring +
store-name auto-link + super_admin admin page. See
`src/lib/keeper-client.ts`, `src/lib/keeper-sync.ts`,
`src/app/admin/keeper-surveys/`. Credentials live in `.env.local`
(`KEEPER_API_KEY_ID` / `KEEPER_API_SECRET` / `KEEPER_API_BASE_URL`);
must be added to Vercel production env before the nightly cron
(`0 17 * * *`, 02:00 JST) can run. Open optional follow-ups:
- The SECRET was pasted into a chat transcript on 2026-05-19 —
  rotate from the Keeper console if that's outside the risk envelope.
- Store-name auto-link is best-effort exact-match-after-normalize;
  unmatched responses are flagged in the UI. If too many go
  unmatched, add a manual mapping table.

## Replace best-effort store-name matching with authoritative mapping table

When the user provides the authoritative Keeper store list (shop_194 →
car-coating store_id + area, etc.), replace / augment the
`normalizeStoreName` fuzzy match in `src/lib/keeper-sync.ts` with a
real mapping table (Keeper `store_id` like `shop_194` → car-coating
`store_id` + display area). This will eliminate false `unmatched`
entries in the `keeperSync/lastRun` summary doc and in the morning
daily-report sync section. Surface `area` in the sync summary rows and
in the admin UI at `src/app/admin/keeper-surveys/`.

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
