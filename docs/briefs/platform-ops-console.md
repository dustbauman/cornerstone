# Platform Ops Console — Implementation Plan

> **Purpose:** A single in-app location for platform-level administration during Tyrian's early weeks/months — delete/hide content, match users to lodges, link lodges to the directory, and handle edge cases without jumping between Supabase, Stripe, email, and ad-hoc SQL.

---

## Current State

| Layer | What exists | Gap |
|-------|-------------|-----|
| **Lodge admin** (`/admin/*`) | Member approve/deny, co-admin roles, lodge settings, read-only listings/requests | Scoped to one lodge only |
| **Platform admin stub** | `NEXT_PUBLIC_PLATFORM_ADMIN=true` shows "Lodges needing directory review" on the lodge admin dashboard | "Mark verified" has **no API**; flag is client-side only |
| **Content moderation** | Request **withdraw** (soft delete) by owner | No takedown for listings, profiles, or reviews |
| **User–lodge matching** | Claim/join flows, `directory_id` on lodges | No way to manually assign `profiles.lodge_id` or fix stuck users |
| **Emergency tooling** | `tools/tyrian-reset-test-data.sql` | Dev-only; not production ops |

There is no `is_platform_admin` (or similar) in the schema. `createAdminClient()` already bypasses RLS for server routes — the missing piece is a **gated UI + APIs** that call it safely.

### Terminology

| Common term | In this codebase |
|-------------|------------------|
| Posts | **`requests`** (request board) |
| Users | **`auth.users` + `profiles`** |
| Listings | **`listings`** |
| Lodges | **`lodges`** (+ **`lodge_directory`** reference) |
| Admin (today) | **Lodge primary/co-admin** on `profiles`, not a global role |

---

## Recommendation

Build a **Platform Ops console at `/ops`** — separate from lodge admin at `/admin`.

- **Lodge admins** continue using `/admin` for their own lodge.
- **Platform operators** use `/ops` for cross-lodge work.

### Why in-app (not Supabase dashboard + Stripe + Resend)

- One URL, one auth gate, one mental model
- Actions can respect product rules (e.g. deactivate listing vs hard delete)
- Room for confirm dialogs, search, and audit trail
- Reuses existing Next.js + Supabase patterns

Supabase Studio remains useful for emergencies; it should not be the daily workflow.

---

## Auth

### Phase 1 — Server-side allowlist (no migration)

```bash
# .env.local / Vercel — server-only, never NEXT_PUBLIC_
PLATFORM_ADMIN_EMAILS=you@tyrian.work,partner@tyrian.work
```

Every `/ops` page and `/api/ops/*` route checks the session email against this list. Middleware redirects non-admins to 404.

Helper pattern (mirrors `requireLodgeAdmin()` in `src/lib/lodge-admin.ts`):

```ts
// src/lib/platform-admin.ts (proposed)
export async function requirePlatformAdmin() {
  // 1. Get session user
  // 2. Compare email to PLATFORM_ADMIN_EMAILS
  // 3. Return { admin, user } or { error: Response }
}
```

### Phase 2 — Database flag (optional, later)

Add `profiles.is_platform_admin boolean default false` if delegation is needed without redeploying env vars.

**Do not use** `NEXT_PUBLIC_PLATFORM_ADMIN` for real authorization — the existing flag only toggles UI and is not secure.

---

## Console Structure

```
/ops                          → Dashboard (queues + quick stats)
/ops/lodges                   → All lodges; filter pending / suspended / unlinked
/ops/lodges/[id]              → Detail: link directory, suspend, view members
/ops/users                    → Search by email / name
/ops/users/[id]               → Assign lodge, set verification, delete account
/ops/listings                 → Search; deactivate / reactivate
/ops/requests                 → Search; withdraw or hard-delete
/ops/reviews                  → Remove abusive reviews
```

### Dashboard queues (daily entry points)

1. **Lodges without `directory_id`** — manual signups needing directory link
2. **Users with no `lodge_id`** — stuck after failed join/claim
3. **Pending verifications** — optional cross-lodge aggregate view
4. **Paid unclaimed lodges** — `paid_by_email` set but `claim_code_claimed_at` is null

---

## Core Actions

| Task | Proposed API | Notes |
|------|--------------|-------|
| Match lodge ↔ directory | `PATCH /api/ops/lodges/[id]` | Set `directory_id`; optionally copy city/address from `lodge_directory` (see `src/lib/lodges/geocode-lodge.ts`) |
| Mark manual signup verified | Same endpoint | Wire up the existing "Mark verified" button stub in `src/app/admin/page.tsx` |
| Match user ↔ lodge | `PATCH /api/ops/users/[id]` | Set `profiles.lodge_id`; adjust `verification_status` |
| Hide listing | `PATCH /api/ops/listings/[id]` | Set `listings.is_active = false` (column exists, unused for takedown today) |
| Remove request | `DELETE /api/ops/requests/[id]` | Soft (`status: 'withdrawn'`) or hard delete via service role |
| Remove review | `DELETE /api/ops/reviews/[id]` | Service role; no admin path exists today (reviewers can only self-delete) |
| Delete profile / account | `DELETE /api/ops/users/[id]` | Delete `auth.users` → profiles cascade (same pattern as auth callback cleanup) |
| Suspend lodge | `PATCH /api/ops/lodges/[id]` | Set `lodges.status = 'suspended'` (schema supports it; no UI yet) |
| Fix primary admin | `PATCH /api/ops/users/[id]` | Set `is_lodge_admin` / `is_co_admin` cross-lodge override |

All mutations: **`requirePlatformAdmin()` + `createAdminClient()`** (`src/lib/supabase/admin.ts`).

---

## Code to Reuse

| Asset | Path |
|-------|------|
| Service role client | `src/lib/supabase/admin.ts` |
| Lodge admin gate pattern | `src/lib/lodge-admin.ts`, `src/hooks/useLodgeAdminGate.ts` |
| Admin UI shell | `src/components/admin/AdminDirectoryShell.tsx`, `AdminStatCard.tsx` |
| Member table rows | `src/components/admin/MemberDirectoryRow.tsx` |
| Directory search | `/api/lodge-directory/search` |
| Unverified lodges query | `src/app/admin/page.tsx` (lines ~129, ~502–526) — move to `/ops` |
| Geocode / directory backfill | `src/lib/lodges/geocode-lodge.ts` |

---

## Build Phases

### Phase 1 — Week 1 (~1–2 days focused)

- [ ] `requirePlatformAdmin()` helper
- [ ] Middleware guard for `/ops` and `/api/ops/*`
- [ ] `/ops` dashboard with two highest-friction queues:
  - Unlinked lodges (`directory_id IS NULL`, `status = 'active'`)
  - Orphan users (`lodge_id IS NULL`)
- [ ] `/ops/lodges/[id]` — link to `lodge_directory`, mark verified
- [ ] `/ops/users/[id]` — assign lodge, verify/reject, delete account

### Phase 2 — Weeks 2–4 (as incidents happen)

- [ ] Listings deactivate/reactivate
- [ ] Requests takedown (withdraw + hard delete)
- [ ] Reviews removal
- [ ] Lodge suspend/unsuspend
- [ ] Cross-lodge primary admin reassignment

### Phase 3 — Later

- [ ] `ops_audit_log` table (actor, action, entity_type, entity_id, metadata, created_at)
- [ ] `profiles.is_platform_admin` if adding operators without env changes
- [ ] Optional email notification on destructive ops actions

---

## Explicitly Out of Scope (for now)

- Retool / Forest Admin / external admin panels
- Full CMS or content editing
- Production use of `/admin/gaps` (static prototype with demo data)
- Referrals moderation (`referrals` table exists in schema but is unused in app code)
- Request abuse / flagging flow (`flag_count` documented but not wired)

---

## Interim Workaround (until `/ops` ships)

Keep a short runbook for emergencies:

| Need | Where |
|------|-------|
| Assign user to lodge | Supabase → `profiles` → set `lodge_id` |
| Link lodge to directory | Supabase → `lodges` → set `directory_id` |
| Delete rogue user | Supabase → Authentication → delete user |
| Dev/staging full reset | `tools/tyrian-reset-test-data.sql` (**not for production**) |

---

## Security Notes

- All `/ops` routes must validate platform admin on the **server** (API routes + RSC loaders), never client-only env flags.
- Prefer 404 over 403 for unauthorized access to `/ops` (don't advertise the surface).
- Destructive actions should require confirmation in UI (type entity name or email).
- Consider audit logging before granting access to anyone besides the founder.

---

## Success Criteria

After Phase 1, a platform operator can complete these without opening Supabase:

1. Link a manually signed-up lodge to its `lodge_directory` row
2. Assign a stuck user to the correct lodge and set them verified
3. Delete a spam or mistaken user account
4. See at a glance how many lodges and users need attention

After Phase 2, the same operator can hide listings, remove requests/reviews, and suspend a lodge — all from `/ops`.
