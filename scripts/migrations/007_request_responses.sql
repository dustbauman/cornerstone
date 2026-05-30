-- Request board respond flow
-- Run in Supabase SQL editor before deploying respond flow code.

create extension if not exists pgcrypto;

-- ─── REQUEST RESPONSES ─────────────────────────────────────────────────────
create table if not exists request_responses (
  id              uuid primary key default gen_random_uuid(),
  request_id      uuid not null references requests(id) on delete cascade,
  responder_id    uuid not null references profiles(id) on delete cascade,
  message         text,
  status          text not null default 'sent'
                  check (status in ('sent', 'viewed', 'accepted', 'declined', 'completed')),
  responder_contact_revealed  boolean not null default false,
  requester_contact_revealed  boolean not null default false,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  unique(request_id, responder_id)
);

alter table request_responses enable row level security;

create policy "responses_responder_read" on request_responses
  for select using (auth.uid() = responder_id);

create policy "responses_requester_read" on request_responses
  for select using (
    request_id in (
      select id from requests where profile_id = auth.uid()
    )
  );

create policy "responses_verified_insert" on request_responses
  for insert with check (
    auth.uid() = responder_id
    and auth.uid() in (
      select id from profiles where verification_status = 'verified'
    )
    -- Prevent responses on filled/closed requests even under race conditions
    and request_id in (
      select id from requests where status in ('open', 'active')
    )
    -- Prevent responding to your own request
    and request_id not in (
      select id from requests where profile_id = auth.uid()
    )
  );

create policy "responses_responder_update" on request_responses
  for update using (auth.uid() = responder_id);

-- Guest/member requesters view responses via API (service role) using notify token.
-- Email-matched members use the same API path after server-side auth check.

-- ─── REQUEST COLUMNS ───────────────────────────────────────────────────────
alter table requests
  add column if not exists filled_at timestamptz;

-- Tracks when the notify token was last emailed; used to enforce a 180-day expiry.
alter table requests
  add column if not exists notify_token_sent_at timestamptz;

alter table requests
  add column if not exists requester_notify_token text unique
    default encode(gen_random_bytes(32), 'hex');

update requests
set requester_notify_token = encode(gen_random_bytes(32), 'hex')
where requester_notify_token is null;

alter table requests
  alter column requester_notify_token set not null;

-- ─── TIMESTAMP FUNCTION ────────────────────────────────────────────────────
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ─── TIMESTAMP + INDEXES ───────────────────────────────────────────────────
create trigger request_responses_updated_at
  before update on request_responses
  for each row execute function update_updated_at();

create index if not exists request_responses_request_idx on request_responses(request_id);
create index if not exists request_responses_responder_idx on request_responses(responder_id);
