-- Lodge meeting schedule for admin settings and public lodge page
alter table lodges add column if not exists meeting_schedule text;
