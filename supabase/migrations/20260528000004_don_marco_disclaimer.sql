alter table public.profiles
  add column if not exists don_marco_accepted_at timestamptz;
