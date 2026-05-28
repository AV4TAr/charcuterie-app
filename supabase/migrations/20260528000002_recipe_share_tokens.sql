create table public.recipe_share_tokens (
  token       text        primary key,
  recipe_id   uuid        not null references public.recipes(id) on delete cascade,
  created_by  uuid        not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  revoked_at  timestamptz
);

create index recipe_share_tokens_recipe_id_idx on public.recipe_share_tokens(recipe_id);

alter table public.recipe_share_tokens enable row level security;

create policy "owners manage share tokens"
  on public.recipe_share_tokens for all
  using  (auth.uid() = created_by)
  with check (auth.uid() = created_by);
