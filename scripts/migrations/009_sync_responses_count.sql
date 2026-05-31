-- Keep requests.responses_count in sync with request_responses rows.

create or replace function sync_request_responses_count()
returns trigger
language plpgsql
as $$
declare
  target_id uuid;
begin
  if tg_op = 'INSERT' then
    target_id := new.request_id;
  elsif tg_op = 'DELETE' then
    target_id := old.request_id;
  else
    return coalesce(new, old);
  end if;

  update requests
  set responses_count = (
    select count(*)::int from request_responses where request_id = target_id
  )
  where id = target_id;

  if tg_op = 'INSERT' then
    return new;
  end if;
  return old;
end;
$$;

drop trigger if exists request_responses_count_sync on request_responses;

create trigger request_responses_count_sync
  after insert or delete on request_responses
  for each row
  execute function sync_request_responses_count();

update requests r
set responses_count = (
  select count(*)::int from request_responses rr where rr.request_id = r.id
);
