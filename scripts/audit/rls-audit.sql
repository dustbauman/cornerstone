-- RLS Security Audit
-- Run this in the Supabase SQL editor (it is read-only — no changes are made).
-- Goal: confirm the public anon key cannot read/write PII directly, bypassing the app.
--
-- WHY THIS MATTERS: NEXT_PUBLIC_SUPABASE_ANON_KEY ships to every browser. Anyone can
-- hit https://<project>.supabase.co/rest/v1/<table> with that key. The ONLY thing
-- stopping them from reading every member's email/name is Row Level Security. The app
-- uses the service-role key (which bypasses RLS) for its own queries, so weak RLS does
-- NOT show up as a bug in the app — only in a direct API probe.

-- 1) Which tables have RLS enabled? Anything 'false' under rls_enabled is fully open
--    to the anon key for any operation a GRANT allows.
select
  n.nspname                         as schema,
  c.relname                         as table,
  c.relrowsecurity                  as rls_enabled,
  c.relforcerowsecurity             as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where c.relkind = 'r'
  and n.nspname = 'public'
order by c.relrowsecurity asc, c.relname;

-- 2) Every policy, per table. Read the USING / WITH CHECK expressions carefully.
--    'true' (or no qual) on a SELECT policy for role anon/public = world-readable.
select
  schemaname,
  tablename,
  policyname,
  cmd                               as command,         -- SELECT / INSERT / UPDATE / DELETE / ALL
  roles,                                                -- which DB roles it applies to
  qual                              as using_expr,      -- row visibility (SELECT/UPDATE/DELETE)
  with_check                        as with_check_expr  -- write constraint (INSERT/UPDATE)
from pg_policies
where schemaname = 'public'
order by tablename, cmd;

-- 3) Tables that are RLS-enabled but have ZERO policies. With RLS on and no policy,
--    anon gets nothing (safe). Listed here only so you know access is fully closed.
select c.relname as table_with_rls_but_no_policies
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join pg_policies p on p.schemaname = n.nspname and p.tablename = c.relname
where c.relkind = 'r'
  and n.nspname = 'public'
  and c.relrowsecurity = true
  and p.policyname is null
order by c.relname;

-- 4) What is actually GRANTed to the anon / authenticated roles at the table level.
--    Even with RLS on, surprising grants are worth a look. RLS off + a grant here = open.
select
  table_name,
  grantee,
  string_agg(privilege_type, ', ' order by privilege_type) as privileges
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee in ('anon', 'authenticated')
group by table_name, grantee
order by table_name, grantee;

-- ---------------------------------------------------------------------------
-- EXPECTED RESULT for a safe setup:
--   * profiles, lodges, listings, requests, request_responses, reviews, and any
--     other table holding member data => rls_enabled = true.
--   * profiles: NO anon SELECT policy with qual 'true'. Members' emails must not be
--     readable by the anon role. (authenticated self-read is fine: auth.uid() = id.)
--   * lodges: anon SELECT should expose only public directory fields, not paid_by_email,
--     claim_code, stripe_session_id, etc. If anon can select claim_code, that is critical
--     (claim codes grant lodge admin). Consider a public view instead of a table policy.
--   * requests: 'requests_insert_anon WITH CHECK (true)' lets anyone insert rows directly
--     with the anon key, bypassing the app's guest-confirmation flow and any rate limit.
--     Consider removing anon INSERT and routing all posts through the API (service role).
--   * requests_public_read exposes posted_by_email to the world — confirm that column
--     is not selected by anon, or move public reads to a view without contact fields.
-- ---------------------------------------------------------------------------
