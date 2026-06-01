-- Member reviews for business listings
-- Run in Supabase SQL editor before deploying review features.

-- ─── REVIEWS ───────────────────────────────────────────────────────────────
create table if not exists reviews (
  id              uuid primary key default gen_random_uuid(),
  listing_id      uuid not null references listings(id) on delete cascade,
  reviewer_id     uuid not null references profiles(id) on delete cascade,
  rating          int not null check (rating between 1 and 5),
  body            text,
  request_id      uuid references requests(id) on delete set null,
  created_at      timestamptz not null default now(),
  unique (listing_id, reviewer_id)
);

create index if not exists reviews_listing_idx on reviews(listing_id);
create index if not exists reviews_reviewer_idx on reviews(reviewer_id);

alter table reviews enable row level security;

drop policy if exists "reviews_public_read" on reviews;
create policy "reviews_public_read" on reviews
  for select using (true);

drop policy if exists "reviews_verified_insert" on reviews;
create policy "reviews_verified_insert" on reviews
  for insert with check (
    auth.uid() = reviewer_id
    and auth.uid() in (
      select id from profiles where verification_status = 'verified'
    )
    and listing_id not in (
      select id from listings where profile_id = auth.uid()
    )
  );

drop policy if exists "reviews_own_update" on reviews;
create policy "reviews_own_update" on reviews
  for update using (auth.uid() = reviewer_id);

drop policy if exists "reviews_own_delete" on reviews;
create policy "reviews_own_delete" on reviews
  for delete using (auth.uid() = reviewer_id);

-- ─── LISTING AGGREGATES ────────────────────────────────────────────────────
alter table listings
  add column if not exists member_rating float;

alter table listings
  add column if not exists member_review_count int not null default 0;

-- ─── REQUEST REVIEW PROMPT ─────────────────────────────────────────────────
alter table requests
  add column if not exists review_prompt_at timestamptz;

-- ─── SYNC MEMBER RATING ON LISTINGS ────────────────────────────────────────
create or replace function sync_listing_member_rating()
returns trigger language plpgsql as $$
declare
  lid uuid;
  avg_rating float;
  review_count int;
begin
  lid := coalesce(new.listing_id, old.listing_id);

  select coalesce(avg(rating)::float, 0), count(*)::int
  into avg_rating, review_count
  from reviews
  where listing_id = lid;

  update listings
  set
    member_rating = case when review_count > 0 then round(avg_rating::numeric, 1)::float else null end,
    member_review_count = review_count
  where id = lid;

  return coalesce(new, old);
end;
$$;

drop trigger if exists reviews_sync_listing_stats on reviews;
create trigger reviews_sync_listing_stats
  after insert or update or delete on reviews
  for each row execute function sync_listing_member_rating();

-- Backfill aggregates for any existing rows
update listings l
set
  member_rating = sub.avg_rating,
  member_review_count = sub.cnt
from (
  select
    listing_id,
    round(avg(rating)::numeric, 1)::float as avg_rating,
    count(*)::int as cnt
  from reviews
  group by listing_id
) sub
where l.id = sub.listing_id;
