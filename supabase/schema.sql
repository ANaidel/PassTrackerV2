create table if not exists public.user_app_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_app_state enable row level security;

create policy "Users can read their own app state"
on public.user_app_state
for select
using (auth.uid() = user_id);

create policy "Users can insert their own app state"
on public.user_app_state
for insert
with check (auth.uid() = user_id);

create policy "Users can update their own app state"
on public.user_app_state
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  name text,
  email text,
  category text not null default 'general',
  message text not null,
  created_at timestamptz not null default now(),
  constraint feedback_message_not_blank check (char_length(trim(message)) > 0),
  constraint feedback_category_valid check (
    category in ('general', 'bug', 'feature', 'other')
  )
);

alter table public.feedback enable row level security;

create policy "Anyone can submit feedback"
on public.feedback
for insert
with check (true);

create policy "Users can read their own feedback"
on public.feedback
for select
using (auth.uid() is not null and auth.uid() = user_id);
