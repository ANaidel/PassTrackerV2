-- Run this in the Supabase SQL editor if user_app_state already exists
-- and you only need to add feedback support.

create table if not exists public.app_feedback (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  category text not null default 'general'
    check (category in ('general', 'bug', 'idea', 'other')),
  message text not null
    check (char_length(trim(message)) >= 3 and char_length(message) <= 4000),
  email text,
  user_id uuid references auth.users (id) on delete set null,
  page text,
  user_agent text
);

alter table public.app_feedback enable row level security;

drop policy if exists "Anyone can submit app feedback" on public.app_feedback;
create policy "Anyone can submit app feedback"
on public.app_feedback
for insert
to anon, authenticated
with check (
  char_length(trim(message)) >= 3
  and char_length(message) <= 4000
);
