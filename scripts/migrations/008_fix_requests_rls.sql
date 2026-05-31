-- Fix anon SELECT on requests failing with "permission denied for table users".
-- Cause: requests_own_write used FOR ALL, so SELECT evaluated auth.users subquery for every row.
-- Run in Supabase SQL editor.

DROP POLICY IF EXISTS "requests_own_write" ON requests;

DROP POLICY IF EXISTS "requests_public_read" ON requests;
CREATE POLICY "requests_public_read" ON requests
  FOR SELECT USING (status IN ('open', 'active', 'filled'));

DROP POLICY IF EXISTS "requests_insert_anon" ON requests;
CREATE POLICY "requests_insert_anon" ON requests
  FOR INSERT WITH CHECK (true);

CREATE POLICY "requests_own_update" ON requests
  FOR UPDATE USING (
    auth.uid() = profile_id
    OR posted_by_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

CREATE POLICY "requests_own_delete" ON requests
  FOR DELETE USING (
    auth.uid() = profile_id
    OR posted_by_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );
