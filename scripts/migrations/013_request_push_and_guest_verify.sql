-- 013_request_push_and_guest_verify.sql
-- Run in Supabase SQL editor.
--
-- Soft-launch features for the request board:
--   1. Guest-request email verification (guest posts go live only after confirming).
--   2. Push-to-Pro dedupe marker (a request broadcasts to matching pros exactly once).
--   3. Per-member email opt-out for request notifications.
--
-- NOTE: This intentionally does NOT add a 'pending' value to requests.status.
-- The base `requests` table (and its status check constraint) was created outside
-- this repo, so its constraint name is unknown and altering it blind is risky.
-- Guest visibility is gated via `confirmed_at` instead.

-- 1 + 2: guest verification + push dedupe on requests
alter table requests add column if not exists confirmation_token text unique;
alter table requests add column if not exists confirmed_at timestamptz;
alter table requests add column if not exists pros_notified_at timestamptz;

-- Backfill: existing rows are already public — treat them as confirmed so they stay visible.
update requests
  set confirmed_at = coalesce(confirmed_at, created_at)
  where confirmed_at is null;

-- 3: per-member request email preference + one-click unsubscribe token
alter table profiles
  add column if not exists request_emails_enabled boolean not null default true;
alter table profiles
  add column if not exists request_emails_unsubscribe_token uuid not null default gen_random_uuid();

-- Visibility gate: a request is publicly readable when it's in a live status AND
-- either it was posted by a member (profile_id not null) or it's a guest post whose
-- email has been confirmed (confirmed_at not null). Mirrors migration 008.
drop policy if exists "requests_public_read" on requests;
create policy "requests_public_read" on requests
  for select using (
    status in ('open', 'active', 'filled')
    and (profile_id is not null or confirmed_at is not null)
  );
