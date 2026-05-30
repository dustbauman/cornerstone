-- Fee enforcement schema additions
-- Run in Supabase SQL editor before deploying fee enforcement code.

-- lodge_directory: real member counts from Grand Lodge of Florida
alter table lodge_directory
  add column if not exists member_count              int,
  add column if not exists member_count_source       text,
  add column if not exists member_count_updated_at   timestamptz;

-- lodges: invite cap tracking
alter table lodges
  add column if not exists invite_cap                int,
  add column if not exists invites_sent              int not null default 0,
  add column if not exists original_tier             text,
  add column if not exists upgraded_at               timestamptz,
  add column if not exists upgrade_stripe_session_id text;

-- Atomic invite increment — avoids race conditions on concurrent joins
create or replace function increment_invites_sent(lodge_id uuid, amount int)
returns void as $$
  update lodges
  set invites_sent = invites_sent + amount
  where id = lodge_id;
$$ language sql;

create index if not exists lodges_invite_cap_idx
  on lodges(id, invite_cap, invites_sent);
