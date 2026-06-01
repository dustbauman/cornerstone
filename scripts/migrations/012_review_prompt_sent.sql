-- Track when the 14-day post-fill review reminder email was sent.
alter table requests
  add column if not exists review_prompt_sent_at timestamptz;

create index if not exists requests_review_prompt_idx
  on requests (review_prompt_at)
  where review_prompt_sent_at is null and status = 'filled';
