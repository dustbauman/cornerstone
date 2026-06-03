-- 016: Fix the respond flow + actually lock down sensitive columns.
-- Run in the Supabase SQL editor. Idempotent.
--
-- Supersedes the broken parts of 008 (auth.users dependency) and 015 (column
-- REVOKEs that were no-ops). Background for each section is inline below.

-- ---------------------------------------------------------------------------
-- 1) Respond flow 500 — remove the auth.users dependency from requests policies.
--
-- Responding inserts a request_responses row (as the `authenticated` role). The
-- sync trigger (009) then UPDATEs requests.responses_count, which evaluates the
-- requests UPDATE policy. That policy (from 008) runs
--   posted_by_email = (SELECT email FROM auth.users WHERE id = auth.uid())
-- but `authenticated` has no SELECT on auth.users -> "permission denied for table
-- users" (42501), aborting the whole insert -> 500. Same breaks mark-filled.
--
-- Fix: read the email from the JWT claim instead of querying auth.users. No table
-- access, same authorization result.
-- ---------------------------------------------------------------------------
drop policy if exists "requests_own_update" on requests;
create policy "requests_own_update" on requests
  for update using (
    auth.uid() = profile_id
    or posted_by_email = (auth.jwt() ->> 'email')
  );

drop policy if exists "requests_own_delete" on requests;
create policy "requests_own_delete" on requests
  for delete using (
    auth.uid() = profile_id
    or posted_by_email = (auth.jwt() ->> 'email')
  );

-- ---------------------------------------------------------------------------
-- 2) Missing column from 007 — the respond route writes notify_token_sent_at on
--    the post-insert update; without it the update fails (PGRST204) and
--    responses_count / status never advance.
-- ---------------------------------------------------------------------------
alter table requests add column if not exists notify_token_sent_at timestamptz;

-- ---------------------------------------------------------------------------
-- 3) Real column lockdown. 015 used `revoke select (col) ... ` while a TABLE-level
--    SELECT grant still existed. In Postgres a table-level grant lets a role read
--    EVERY column regardless of column-level revokes, so 015 changed nothing.
--
--    Correct approach: drop the table-level SELECT, then grant SELECT on only the
--    non-sensitive columns. New columns are hidden by default (must be granted) —
--    the app itself reads via the service-role key, which bypasses all of this.
-- ---------------------------------------------------------------------------

-- profiles --------------------------------------------------------------------
-- Hidden from anon: email, sponsor_name, sponsor_contact, referred_by, unsub token
-- Hidden from authenticated: request_emails_unsubscribe_token only (email kept for
--   self-read + admin roster; see 015 residual note).
revoke select on profiles from anon;
grant select (
  id, full_name, lodge_id, trade_category, occupation, city, state, lat, lng,
  verification_status, is_lodge_admin, is_co_admin, visibility, referral_code,
  created_at, updated_at, request_emails_enabled
) on profiles to anon;

revoke select on profiles from authenticated;
grant select (
  id, full_name, email, lodge_id, trade_category, occupation, city, state, lat, lng,
  sponsor_name, sponsor_contact, verification_status, is_lodge_admin, is_co_admin,
  visibility, referral_code, referred_by, created_at, updated_at, request_emails_enabled
) on profiles to authenticated;

-- lodges ----------------------------------------------------------------------
-- Hidden from both: claim_code, claim_code_claimed_by, paid_by_email,
--   stripe_session_id, upgrade_stripe_session_id. Hidden from anon also: paid_by_name.
revoke select on lodges from anon;
grant select (
  id, name, number, state, city, status, tier, paid_at, meeting_address, website,
  welcome_message, created_at, directory_id, claim_code_expires_at, claim_code_claimed_at,
  reminder_7_sent_at, reminder_25_sent_at, slug, meeting_schedule, invite_cap,
  invites_sent, original_tier, upgraded_at, lat, lng
) on lodges to anon;

revoke select on lodges from authenticated;
grant select (
  id, name, number, state, city, status, tier, paid_at, meeting_address, website,
  welcome_message, created_at, directory_id, claim_code_expires_at, claim_code_claimed_at,
  reminder_7_sent_at, reminder_25_sent_at, paid_by_name, slug, meeting_schedule,
  invite_cap, invites_sent, original_tier, upgraded_at, lat, lng
) on lodges to authenticated;

-- requests --------------------------------------------------------------------
-- Hidden from both: posted_by_email, confirmation_token, requester_notify_token.
revoke select on requests from anon, authenticated;
grant select (
  id, posted_by_name, profile_id, lodge_id, lodge_display, category, title, details,
  city, state, lat, lng, budget, timeline, status, remote_eligible, is_verified_member,
  responses_count, flag_count, expires_at, filled_at, created_at, review_prompt_at,
  review_prompt_sent_at, confirmed_at, pros_notified_at, notify_token_sent_at
) on requests to anon, authenticated;
