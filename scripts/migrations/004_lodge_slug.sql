-- Day 4: lodge slugs for community pages and member invite links
alter table lodges add column if not exists slug text unique;

update lodges
set slug = lower(
  regexp_replace(
    regexp_replace(name || '-' || number, '[^a-zA-Z0-9\s-]', '', 'g'),
    '\s+', '-', 'g'
  )
)
where slug is null;

create index if not exists lodges_slug_idx on lodges(slug);
