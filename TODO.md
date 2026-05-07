# TODO

Open follow-ups that aren't urgent enough to block other work but
should be revisited.

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
