# Screenshots needed for USER_MANUAL.md / USER_MANUAL_JA.md

The two manual files reference screenshots under `docs/screenshots/`.
Capture each one below and save it at the listed path. Aim for 1440×900
or larger; PNG; trim browser chrome unless the URL bar is the point.

When you add a new screenshot, also add it to the manual prose where
appropriate (use the same filename in both `USER_MANUAL.md` and
`USER_MANUAL_JA.md` so they stay in sync).

| File | What to capture | URL / state |
|---|---|---|
| `screenshots/01-homepage.png` | Marketing landing page hero + service menu visible above the fold. | `/` on a seeded environment |
| `screenshots/02-booking-calendar.png` | Booking calendar with at least one available date highlighted, one full month visible. | `/<slug>/booking` after picking a store |
| `screenshots/03-booking-form.png` | Filled-out reservation form just before submit (use placeholder customer data, not real PII). | `/<slug>/booking` step 2 |
| `screenshots/04-builder.png` | Page builder showing the left rail of blocks and the right preview, ideally with a hero block being edited. | `/admin/builder/<storeId>` logged in as super admin |

## Optional but recommended

These are not currently linked from the manuals but would strengthen
specific sections:

| Suggested file | Section in manual | What to capture |
|---|---|---|
| `screenshots/05-admin-dashboard.png` | §4 Operator Guide (intro) | `/admin` dashboard with stat cards + quick actions visible. |
| `screenshots/06-admin-bookings.png` | §4.1 | `/admin/bookings` with a `pending` row and the confirm dialog open. |
| `screenshots/07-admin-inquiries.png` | §4.2 | `/admin/inquiries` with the reply box open on an `open` inquiry. |
| `screenshots/08-banner-maker.png` | §4.4 | `/admin/banners` showing the live-preview gallery. |
| `screenshots/09-store-settings.png` | §4.5 | `/admin/bookings/settings/store` with `calendarId` and notification emails populated. |
| `screenshots/10-users.png` | §5.1 | `/admin/users` list. |
| `screenshots/11-defaults.png` | §5.3 | `/admin/defaults` with one section expanded. |
| `screenshots/12-diagnostics.png` | §5.6 | `/admin/diagnostics` health probes. |
| `screenshots/13-confirmation-email.png` | §3.4 step 5 | A real (test inbox) `【確定】ご予約確認` email. |

## Capture tips

- Use a **seeded/staging** environment with non-PII data — never
  capture real customer names, phone numbers, or emails.
- Hide the admin user email at the top of the sidebar (or use a clearly
  fake one like `demo@example.com`).
- For Japanese-locale captures, set the browser to `ja-JP` so the
  in-app strings render as designed.
- Crop with a small (8–16 px) padding around the relevant content;
  full-bleed window screenshots tend to age fast as the chrome changes.
- Keep file sizes under ~400 KB each (compress with e.g.
  `pngquant --quality=70-90`).

## After adding screenshots

1. Drop the PNG(s) under `docs/screenshots/`.
2. Verify the manual links resolve by previewing the markdown in your
   editor or with `npm run docs:pdf`.
3. Commit with a message like
   `docs: add screenshots for §X.Y of the user manual`.
4. Delete the row from this file once done so the open list stays
   honest.
