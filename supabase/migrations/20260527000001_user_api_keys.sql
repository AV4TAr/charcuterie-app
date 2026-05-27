create table public.user_api_keys (
  user_id uuid primary key references auth.users(id) on delete cascade,
  encrypted_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_api_keys enable row level security;

create policy "users select own key"
  on public.user_api_keys for select
  using (auth.uid() = user_id);

create policy "users insert own key"
  on public.user_api_keys for insert
  with check (auth.uid() = user_id);

create policy "users update own key"
  on public.user_api_keys for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users delete own key"
  on public.user_api_keys for delete
  using (auth.uid() = user_id);
