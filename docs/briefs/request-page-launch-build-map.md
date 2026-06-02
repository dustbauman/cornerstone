# Request Page — Soft-Launch Build Map

**Goal:** Make `/requests` genuinely connect requesters with verified Mason professionals.
**Window:** ~48 hours to soft launch.
**Scope decision (locked):** Ship (1) **Push-to-Pro** notifications and (2) **Guest email verification**. Everything else is optional polish.

---

## Why these two

The board today is **pull-only for professionals**: a request is posted ([`POST /api/requests`](../../src/app/api/requests/route.ts)) and *no one is notified*. The only outbound email fires later, to the requester, once a pro happens to browse the board and respond ([`respond/route.ts`](../../src/app/api/requests/[requestId]/respond/route.ts)). At launch liquidity is thin, so requests will sit at "0 responses" and trip the red "no responses yet" flag — the exact first impression that kills a referral network.

- **Push-to-Pro** converts the marketplace from pull to push: when a request lands, email the matching verified members so they can respond fast.
- **Guest verification** protects that new outbound channel — without it, one junk guest post blasts every matching pro and burns the scarcest launch asset (member goodwill).

Reuse what already exists: scoring in [`lib/geo/scoring.ts`](../../src/lib/geo/scoring.ts), the Resend email system (12 templates, [`lib/email/`](../../src/lib/email/)), the verified-member roster in `profiles`, and the `requester_notify_token` pattern from migration 007/008.

---

## Feature 1 — Push-to-Pro notifications

When a request becomes live, email verified members whose trade + location match.

### 1.1 Data / matching
- Reuse `getMatchScore` / `haversineDistance` from [`scoring.ts`](../../src/lib/geo/scoring.ts). **Server-side** matching needs a small adapter — current `getMatchScore` takes a `ServiceRequest` shaped object; write `lib/db/match-pros.ts` that queries `profiles` and scores against the new request row.
- Match query (admin client): `profiles` where `verification_status = 'verified'`, has `lat`/`lng`, excludes the poster (`id != profile_id`), and `email` present.
- **Match rule (keep simple for launch):** trade match (`trade_category === request.category`) **OR** within 50 miles. Remote-eligible requests → notify trade matches nationwide.
- **Cap:** notify at most ~25 best-scoring pros per request to avoid blasting the whole base on a generic request.

### 1.2 Email template
- Add `buildNewRequestForProEmail(...)` in [`templates.ts`](../../src/lib/email/templates.ts) and `sendNewRequestToPro(...)` in [`lib/email/index.ts`](../../src/lib/email/index.ts), mirroring `buildResponseNotificationEmail` / `sendResponseNotification`.
- Content: "A new {category} request near {city, state} — {title}. Budget {budget}, timeline {timeline}. Respond →" linking to `${APP_URL}/requests/${id}` (deep-link to the card or `/requests`).
- Include an **unsubscribe / manage** line (see 1.4).

### 1.3 Trigger
- Fire **after** a request is confirmed live, not on raw insert:
  - **Member-posted** requests are live immediately → trigger at the end of `POST /api/requests`.
  - **Guest-posted** requests are live only **after email confirmation** → trigger from the confirm endpoint (Feature 2.3).
- Send in a non-blocking `try/catch` (match the existing `sendResponseNotification` pattern; never fail the request on email error).
- **Dedupe:** record that a request has been broadcast so a status change can't re-blast. Add `pros_notified_at timestamptz` to `requests` and guard on it.

### 1.4 Member notification preference (minimum viable)
- Add `request_emails_enabled boolean default true` to `profiles`, plus `request_emails_unsubscribe_token uuid default gen_random_uuid()` for non-guessable one-click unsubscribe.
- Filter the match query on `request_emails_enabled`.
- Footer link in the pro email → `GET /api/me/request-emails/unsubscribe?token=...` flips the flag (no auth needed). Dashboard toggle (`RequestEmailsToggle`) → `GET/PATCH /api/me/request-emails` for verified members.

### 1.5 Files
- New: `src/lib/db/match-pros.ts`
- Edit: `src/lib/email/templates.ts`, `src/lib/email/index.ts`
- Edit: `src/app/api/requests/route.ts` (member path trigger + dedupe guard)
- New migration: `scripts/migrations/013_request_push_and_guest_verify.sql`

---

## Feature 2 — Guest email verification

A guest request must not go live (and must not notify pros) until the email is confirmed.

### 2.1 Data
- Add to `requests`: `confirmation_token text unique`, `confirmed_at timestamptz`.
- **Decision (changed from original plan):** do **not** add a `'pending'` status value. The base `requests` table + its `status` check constraint live outside this repo (applied directly in Supabase; not in `scripts/migrations/`), so altering the constraint blind is risky two days before launch. Instead, **gate guest visibility on `confirmed_at`**: guest posts insert with `status='open'` but `confirmed_at=NULL`; they become publicly readable only once confirmed. Member posts (`profile_id` not null) are visible regardless. Implemented in [migration 013](../../scripts/migrations/013_request_push_and_guest_verify.sql) by updating the `requests_public_read` RLS policy to `status IN (...) AND (profile_id IS NOT NULL OR confirmed_at IS NOT NULL)`.
- The admin-client API GET bypasses RLS, so the same gate must be added in code (2.2).

### 2.2 Post flow change
- In [`POST /api/requests`](../../src/app/api/requests/route.ts): if no authenticated `user`, insert with `confirmed_at=NULL`, generate `confirmation_token`, and send a **confirm-your-request** email to the typed address instead of returning a live request. Member posts insert with `confirmed_at=now()`.
- New template `buildRequestConfirmEmail(...)` + `sendRequestConfirmEmail(...)` → link to `${APP_URL}/requests/confirm?token=...`.
- Add the confirmed gate to the admin-client board GET (bypasses RLS): `.or('profile_id.not.is.null,confirmed_at.not.is.null')` in [`route.ts`](../../src/app/api/requests/route.ts).

### 2.3 Confirm endpoint
- New `src/app/api/requests/confirm/route.ts` (GET or POST): look up by `confirmation_token`, set `status='open'`, `confirmed_at=now()`, clear token.
- **On confirm, fire Push-to-Pro (1.3).** This is the single place guest requests broadcast.
- New page `src/app/requests/confirm/page.tsx` for the landing UX ("Your request is live ✓").

### 2.4 UX in the post modal
- After a guest submits, the success toast/copy must say **"Check your email to confirm and publish your request"** rather than "Your request is live." Update [`handleNewRequest`](../../src/app/requests/page.tsx) and [`PostRequestModal`](../../src/components/requests/PostRequestModal.tsx) so guest vs member messaging differ.
- Members are unaffected — their requests publish immediately.

### 2.5 Files
- Edit: `src/app/api/requests/route.ts`
- New: `src/app/api/requests/confirm/route.ts`, `src/app/requests/confirm/page.tsx`
- Edit: `src/lib/email/templates.ts`, `src/lib/email/index.ts`
- Edit: `src/app/requests/page.tsx`, `src/components/requests/PostRequestModal.tsx`

---

## Migration 013 (single file)

```sql
-- requests: guest verification + push dedupe
alter table requests add column if not exists confirmation_token text unique;
alter table requests add column if not exists confirmed_at timestamptz;
alter table requests add column if not exists pros_notified_at timestamptz;
-- if status is a check constraint, add 'pending' to the allowed set

-- profiles: per-member request email preference
alter table profiles add column if not exists request_emails_enabled boolean not null default true;
```
> Confirm the `requests.status` definition (enum vs text+check) before editing it.

---

## Build order (sequence matters)

1. **Migration 013** — apply first; everything depends on the new columns.
2. **Email templates + senders** — `buildNewRequestForProEmail`, `buildRequestConfirmEmail` and their `send*` wrappers. Testable in isolation via the stub logger (no `RESEND_API_KEY` → console).
3. **`match-pros.ts`** — server-side matching + 25-cap + pref/opt-out filter.
4. **Guest verification path** — post-flow `pending`, confirm endpoint, confirm page, modal copy.
5. **Push-to-Pro triggers** — wire member path (immediate) and guest confirm path (on confirm), with `pros_notified_at` dedupe guard.
6. **Member preference toggle** — dashboard switch + unsubscribe link.

---

## Test checklist (before launch)

- [ ] Guest posts → receives confirm email, request **not** visible on board until confirmed.
- [ ] Guest confirms → request goes live **and** matching pros are emailed exactly once.
- [ ] Re-hitting confirm link does **not** re-broadcast (dedupe via `pros_notified_at`).
- [ ] Member posts → request live immediately **and** pros notified once.
- [ ] Poster never emails themselves; non-matching/out-of-area members not spammed.
- [ ] ≤25 recipients on a broadly-matching request.
- [ ] Member with `request_emails_enabled=false` receives nothing; unsubscribe link flips the flag.
- [ ] Existing responder→requester email loop still works unchanged.
- [ ] Email failures never block request creation/confirmation (try/catch).
- [ ] Stub mode (no `RESEND_API_KEY`) logs cleanly in local dev.

---

## Risks / watch-items

- **Server scoring drift:** `getMatchScore` was written for client `ServiceRequest` objects. The DB adapter must map fields correctly (esp. `lat/lng`, `lodgeId`, `category`) or matching silently misfires.
- **Geocoding for guests:** guest lat/lng comes from `geocodeCityState` ([route.ts:113](../../src/app/api/requests/route.ts)). If geocode fails, distance matching can't run — fall back to trade-only match so the request still reaches someone.
- **Volume:** the 25-cap + dedupe are the guardrails against accidentally emailing the whole base. Do not skip them.
- **Status enum:** adding `'pending'` may require a check-constraint change; verify before migrating.

---

## Explicitly out of scope for 48h

Cold-start empty-state nudges, in-app notifications, response threading/replies, a full notification-preferences page. Revisit post-launch.
