-- Lodge coordinates for accurate near-me filtering on /network
alter table lodges
  add column if not exists lat double precision,
  add column if not exists lng double precision;

alter table lodge_directory
  add column if not exists lat double precision,
  add column if not exists lng double precision;

-- Backfill addresses from the official directory where lodges were linked at signup
update lodges l
set meeting_address = d.meeting_address
from lodge_directory d
where l.directory_id = d.id
  and d.meeting_address is not null
  and (l.meeting_address is null or btrim(l.meeting_address) = '');

update lodges l
set city = d.city
from lodge_directory d
where l.directory_id = d.id
  and d.city is not null
  and (l.city is null or btrim(l.city) = '');
