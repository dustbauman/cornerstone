-- 015: Lock down sensitive columns from the public client roles.
--
-- Context: RLS is enabled on all tables, but several SELECT policies are row-scoped
-- with USING(true)-style visibility (e.g. lodges where status='active', profiles
-- where verified+public). RLS filters ROWS, not COLUMNS, so the public anon key
-- (shipped in every browser) could read sensitive columns of those visible rows
-- directly via the Supabase REST API. The app itself uses the SERVICE-ROLE key,
-- which bypasses these grants, so application behavior is unaffected.
--
-- Run in the Supabase SQL editor. Idempotent.

-- 1) Remove direct anonymous INSERT into requests. All posts flow through the API
--    (service role), which enforces validation, length caps, rate limiting, and
--    guest email confirmation. The anon INSERT policy bypassed all of that.
drop policy if exists "requests_insert_anon" on requests;

-- 2) lodges — claim_code grants lodge-admin; payment fields are PII/financial.
--    These must travel only via the service-role checkout API and the claim email,
--    never to a browser. Revoke from BOTH client roles (a logged-in member must not
--    be able to read another lodge's claim_code and seize it).
revoke select (
  claim_code,
  claim_code_claimed_by,
  paid_by_email,
  stripe_session_id,
  upgrade_stripe_session_id
) on lodges from anon, authenticated;

-- paid_by_name is low-sensitivity (a name) and the authenticated dashboard reads it
-- as a display fallback, so only hide it from the fully-public anon role.
revoke select (paid_by_name) on lodges from anon;

-- 3) requests — hide requester contact + flow tokens from client roles.
--    confirmation_token confirms guest posts; requester_notify_token authorizes the
--    requester's notify link. Both must stay server-side.
revoke select (
  posted_by_email,
  confirmation_token,
  requester_notify_token
) on requests from anon, authenticated;

-- 4) profiles — block the fully-public anon role from member email and tokens.
--    (authenticated keeps email: self-read + the admin member roster rely on it.
--     See note below about further hardening that channel.)
revoke select (
  email,
  sponsor_name,
  sponsor_contact,
  referred_by,
  request_emails_unsubscribe_token
) on profiles from anon;

-- request_emails_unsubscribe_token is only ever used by the server; deny it to
-- authenticated too so one member can't read another's unsubscribe token.
revoke select (request_emails_unsubscribe_token) on profiles from authenticated;

-- ---------------------------------------------------------------------------
-- RESIDUAL (follow-up, not closed here): a logged-in *authenticated* member can
-- still SELECT email of other verified+public profiles via REST, because the
-- admin roster and self-profile reads use the browser client and need email.
-- Proper fix = move those reads to a service-role API with per-lodge authz, then
-- `revoke select (email) on profiles from authenticated`. Lower urgency: the
-- network is invite-only/vetted. Revisit post-launch.
-- ---------------------------------------------------------------------------
