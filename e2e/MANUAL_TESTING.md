# Manual Testing Checklist — car-coating

This checklist covers the flows that automation can't reliably assert
(visual polish, content quality, third-party integrations behind
CAPTCHA / OAuth, real email + calendar effects, etc.).

Run alongside `npx playwright test` (which covers ~250 automated
assertions across structure, validation, auth boundaries, A11y, and
responsive layout).

## Prerequisites

| Item | Notes |
|---|---|
| Test environment | Local dev (`npm run dev` on :8080) **or** a Vercel preview deployment |
| Browsers | Chrome (latest), Safari (latest), Firefox (latest), Edge (latest), iOS Safari, Android Chrome |
| Devices | One desktop (≥1440px), one tablet (~768px), one phone (≤390px) |
| Test super_admin login | Provided out-of-band — has access to all stores |
| Test store_admin login | Tied to one store (e.g. `eniwa`) |
| Test customer email | A mailbox you can read in real time (for booking + inquiry emails) |
| Test phone | Any value — phone is not actually called |
| Google Maps | Key in `.env.local` must be valid for map render |
| Google Calendar | Test calendar ID in store settings to verify booking → calendar event |
| Test store slug | `eniwa` (single-store) and `ichihara` (multi-store sub-company) |

## How to record results

For every case below, fill in **Actual result**, mark **Pass/Fail**,
and add **Notes** with screenshots / console messages / network
recordings as needed. Use the sign-off table at the bottom.

---

## Visual & UX (storefront)

### MT-001 — Landing page first impression
- **Preconditions:** Cold cache, hard reload `Cmd+Shift+R`.
- **Steps:**
  1. Open `/` on a 1440-wide desktop.
  2. Observe hero, then scroll slowly through every section.
- **Expected:** Hero image loads sharply (no blur after 1s); fonts swap
  cleanly with no visible reflow; tier cards align in a grid with no
  ragged heights; gallery images load without obvious 404s.
- **Actual:**
- **Pass/Fail:**
- **Notes:**

### MT-002 — Storefront `/eniwa` brand consistency
- **Steps:** Visit `/eniwa`, then `/eniwa/coatings`, `/eniwa/booking`,
  `/eniwa/inquiry`, `/eniwa/cases`, `/eniwa/access`.
- **Expected:** Same logo, header, footer, color palette across every
  page. Phone number, address, hours match Firestore.
- **Actual:**
- **Pass/Fail:**
- **Notes:**

### MT-003 — Image quality and aspect ratios
- **Steps:** Inspect every image-heavy section (hero, gallery, cases,
  reviews, blog cards).
- **Expected:** No stretched / squished images; no broken-image icons;
  no LCP-blocking placeholder lingering.
- **Actual:**
- **Pass/Fail:**
- **Notes:**

### MT-004 — Mobile menu polish
- **Steps:** On a 375-wide viewport, open `/eniwa`, tap hamburger, tap
  every link, then close.
- **Expected:** Menu animates in, full list reachable without scrolling
  past nav, X button closes; selecting a link both navigates and
  closes the menu.
- **Actual:**
- **Pass/Fail:**
- **Notes:**

### MT-005 — Scroll-driven popup behavior
- **Steps:** Clear `localStorage`, scroll quiz popup into view, dismiss
  it, reload, scroll again.
- **Expected:** Popup appears once, dismissal is remembered, no popup
  spam.
- **Actual:**
- **Pass/Fail:**
- **Notes:**

---

## Booking flow (real customer path)

### MT-010 — Booking happy path with real email
- **Preconditions:** Use a real mailbox.
- **Steps:**
  1. Visit `/eniwa/booking`.
  2. Pick a green available date 2+ weeks out.
  3. Pick a time slot, click 次へ.
  4. Fill name, phone, email (yours), email confirm, vehicle, notes.
  5. Optionally pick a coating tier.
  6. Submit.
- **Expected:**
  - Confirmation page shows with reservation ID.
  - Customer email arrives within 60s — subject in Japanese, contains
    date/time/store/cancel link.
  - If staff notification configured: staff mailbox receives a
    notification email.
  - Reservation appears in `/admin/bookings` (super_admin login).
- **Actual:**
- **Pass/Fail:**
- **Notes:**

### MT-011 — Calendar-event creation (Google Calendar)
- **Preconditions:** Store has `calendarId` set in admin → bookings → settings.
- **Steps:** Complete a visit booking with auto-confirm; check the
  store's Google Calendar.
- **Expected:** A new event appears with the customer name, date/time,
  store address.
- **Actual:**
- **Pass/Fail:**
- **Notes:**

### MT-012 — Cancel-link from email
- **Steps:** From the email in MT-010, click the cancel link.
- **Expected:** Lands on a cancel page that shows the booking details;
  cancel CTA works; cancellation email arrives; reservation is marked
  cancelled in `/admin/bookings`; calendar event is removed.
- **Actual:**
- **Pass/Fail:**
- **Notes:**

### MT-013 — Sub-company multi-store booking
- **Steps:** Visit `/ichihara/booking`. Pick a child store. Complete
  a booking.
- **Expected:** Store-selector lists all sub-stores; selecting one
  scopes calendar + slots correctly; reservation persists with the
  correct child store ID.
- **Actual:**
- **Pass/Fail:**
- **Notes:**

### MT-014 — Holiday handling
- **Steps:** Navigate calendar to a Japanese national holiday.
- **Expected:** Holiday dates are visually distinguished (color or
  badge); availability matches the store's holiday rules.
- **Actual:**
- **Pass/Fail:**
- **Notes:**

---

## Inquiry flow

### MT-020 — Inquiry happy path with real email
- **Steps:** Visit `/eniwa/inquiry`, fill all fields, submit.
- **Expected:** Confirmation email arrives at customer; staff
  notification reaches configured staff inbox; entry appears in
  `/admin/inquiries`.
- **Actual:**
- **Pass/Fail:**
- **Notes:**

### MT-021 — Inquiry pre-fill via URL
- **Steps:** Visit `/eniwa/inquiry?tier=crystal&prefill=price`.
- **Expected:** Tier dropdown pre-selected; message body contains the
  pricing prompt; price information rendered before submission.
- **Actual:**
- **Pass/Fail:**
- **Notes:**

### MT-022 — Google auto-fill button (real OAuth)
- **Steps:** Click "Googleで自動入力" on the inquiry form. Approve OAuth.
- **Expected:** Name + email populate from your Google account.
- **Actual:**
- **Pass/Fail:**
- **Notes:**

---

## Admin (super_admin)

### MT-030 — Login & session
- **Steps:** Login at `/login`. Verify `/admin` loads. Log out. Visit
  `/admin/stores` again.
- **Expected:** Session cookie is set + cleared correctly; protected
  routes redirect to `/login` after logout.
- **Actual:**
- **Pass/Fail:**
- **Notes:**

### MT-031 — Page builder drag-and-drop
- **Steps:** Open `/admin/builder/eniwa`. Drag a block to a new
  position. Edit a banner. Save. Reload `/eniwa` storefront.
- **Expected:** Save persists the new order; storefront reflects the
  change after revalidation.
- **Actual:**
- **Pass/Fail:**
- **Notes:**

### MT-032 — Sanitization of CustomHtmlBlock
- **Steps:** In the builder, add a CustomHtmlBlock with
  `<script>alert(1)</script>` and an `onclick` handler. Save. Visit
  the storefront.
- **Expected:** Script does NOT execute; storefront renders escaped
  text or strips the tag silently.
- **Actual:**
- **Pass/Fail:**
- **Notes:**

### MT-033 — Banner CSS sanitization
- **Steps:** Add a banner with `style="background: url(javascript:alert(1))"`.
- **Expected:** Style stripped or neutralized; no JS execution.
- **Actual:**
- **Pass/Fail:**
- **Notes:**

### MT-034 — Store visibility toggle
- **Steps:** Hide a store in `/admin/stores`. Verify storefront `/<slug>`
  becomes unreachable; verify the store no longer appears in the
  homepage store-finder.
- **Expected:** Public list filtered server-side; direct URL returns
  404 (or notFound page).
- **Actual:**
- **Pass/Fail:**
- **Notes:**

### MT-035 — CSV import
- **Steps:** Use `/admin/imports` to upload a small CSV (cases or
  stores). Review the preview, then commit.
- **Expected:** Import runs; backup is created in
  `/admin/imports/backups`; data appears in storefront after
  revalidation.
- **Actual:**
- **Pass/Fail:**
- **Notes:**

### MT-036 — KPI dashboard
- **Steps:** Trigger a few page views on `/eniwa`, an inquiry, a
  booking. Then load `/admin/kpi?storeId=eniwa`.
- **Expected:** Counters incremented for today (page_views, inquiries,
  bookings).
- **Actual:**
- **Pass/Fail:**
- **Notes:**

### MT-037 — Tickets workflow
- **Steps:** Open `/admin/tickets`, create a ticket, comment, change
  status, archive.
- **Expected:** All transitions persist; counter on `/admin` reflects
  open count.
- **Actual:**
- **Pass/Fail:**
- **Notes:**

### MT-038 — Diagnostics panel
- **Steps:** Open `/admin/diagnostics`.
- **Expected:** Per-recipient send statuses for the daily report
  appear; 30-day history visible; failed addresses (if any) flagged.
- **Actual:**
- **Pass/Fail:**
- **Notes:**

---

## Cross-cutting

### MT-040 — Cross-browser parity (manual matrix)
- **Steps:** Repeat MT-001 + MT-010 on Safari, Firefox, Edge, iOS
  Safari, Android Chrome.
- **Expected:** No layout breaks, fonts present, video / map / calendar
  all functional.
- **Actual:**
- **Pass/Fail:**
- **Notes:**

### MT-041 — Slow-network feel
- **Steps:** DevTools → throttle to "Slow 3G". Load `/`, `/eniwa`,
  `/eniwa/coatings`.
- **Expected:** Skeletons / spinners visible during fetch; no jank;
  no CLS bigger than ~0.1.
- **Actual:**
- **Pass/Fail:**
- **Notes:**

### MT-042 — Accessibility (manual screen reader spot-check)
- **Steps:** With VoiceOver (macOS) or NVDA (Windows), step through
  `/eniwa` and `/eniwa/inquiry`.
- **Expected:** Sectional landmarks announced; form fields have
  meaningful labels; error messages are announced as alerts.
- **Actual:**
- **Pass/Fail:**
- **Notes:**

### MT-043 — Copy / wording sanity
- **Steps:** Read every visible string on the storefront and admin.
- **Expected:** No placeholder text ("lorem", "TODO", "FIXME",
  obviously truncated copy); store-specific names used consistently.
- **Actual:**
- **Pass/Fail:**
- **Notes:**

### MT-044 — Privacy / Terms
- **Steps:** Visit `/eniwa/privacy`. Read in full.
- **Expected:** Page loads, content matches what business has
  approved.
- **Actual:**
- **Pass/Fail:**
- **Notes:**

### MT-045 — Email rendering across clients
- **Steps:** Open the booking confirmation, inquiry confirmation, and
  staff notification emails in Gmail web, Apple Mail, Outlook.
- **Expected:** Layout intact, links clickable, no broken images, no
  raw `{{template}}` tokens.
- **Actual:**
- **Pass/Fail:**
- **Notes:**

### MT-046 — Sitemap / robots
- **Steps:** Open `/sitemap.xml` and `/robots.txt`.
- **Expected:** Sitemap lists all public store pages; robots.txt
  references the sitemap and doesn't disallow `/`.
- **Actual:**
- **Pass/Fail:**
- **Notes:**

### MT-047 — Estimate token flow
- **Steps:** Generate an estimate token (admin → estimate or via
  inquiry workflow). Open the resulting `/estimate/<token>` URL.
- **Expected:** Estimate renders for the recipient; expired or unknown
  tokens render a clear "not available" page (no stack trace).
- **Actual:**
- **Pass/Fail:**
- **Notes:**

---

## Items that the Playwright suite already covers automatically

You **do not** need to manually re-verify these — failures here are
flagged by the automated run:

- All store + sub-company pages return 200
- Form structure on `/eniwa/inquiry` (required attrs, field count,
  email mismatch validation)
- Booking calendar renders + can navigate months
- All admin pages redirect to `/login` for unauthed users (route
  existence)
- All admin API GETs return 401 unauthed
- Public APIs `/api/v3/stores`, `/api/v3/sub-companies`, `/api/slots`
  return 200
- Sitemap.xml and robots.txt return 200
- API request validation (400 on bad body for inquiry / reservation /
  track)
- Visibility filter strips manually-hidden stores from the public list
- Console / page errors on the 5 highest-traffic pages
- A11y spot-check (single h1, lang attr, alt on imgs, labels on
  inputs, accessible link text) on 5 pages
- Mobile / tablet / desktop layout sanity (no horizontal overflow)
- Keyboard navigation can focus the first interactive element

---

## Sign-off

| Tester Name | Date | Environment | Browser | Overall Result |
|-------------|------|-------------|---------|----------------|
|             |      |             |         | PASS / FAIL    |

**Blockers / Issues Found:**
-

**Approved for release:** YES / NO

Signature: ___________________________  Date: ____________
